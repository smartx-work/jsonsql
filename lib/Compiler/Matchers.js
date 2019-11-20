
const logger = require('./logger')
const matchers = {}
let PID = 0
class Matcher {
    constructor () {
        this.PID = PID++
        const originScan = this.scan
        this.scan = (parentRuntime) => {
            logger.scaning(parentRuntime, this)
            originScan.call(this, parentRuntime)
        }
        logger.matcherCreated(this)
    }

    suffixNum (m, n) { // 匹配次数
        // ? = {0,1}
        // * = {0,Infinity}
        // + = {1,Infinity}
        // {m,n} = {m,n}
        this.m = m
        this.n = n
    }

    // 执行扫描操作
    scan () {
        throw Error(`Matcher.scan must be override by ${this.constructor.name}.scan`)
    }

    match () {
        throw Error(`Matcher.match must be override by ${this.constructor.name}.match`)
    }

    matchSuccess () {
        throw Error(`Matcher.matchSuccess must be override by ${this.constructor.name}.matchSuccess`)
    }

    matchFailure () {
        throw Error(`Matcher.matchFailure must be override by ${this.constructor.name}.matchFailure`)
    }
}
Matcher.prototype.m = Matcher.prototype.n = 1
Matcher.prototype.stop = false // 是否阻止进入下一个分支的扫描
class RootMatcher extends Matcher {
    constructor (resolve, reject) {
        super()
        this.resolve = resolve
        this.reject = reject
    }

    matchFailure (childRuntime, error) {
        this.reject(childRuntime, error)
    }

    matchSuccess (childRuntime) {
        this.resolve(childRuntime)
    }
}

class HookMatcher extends Matcher {
    constructor (id, { before, done, document, source }) {
        super()
        this._id = id
        this._hooks = { before, done, document }
        this._source = source
        this._child = this._parseSource(id, source)

        matchers[id] = this
    }

    scan (parentRuntime) {
        this._child.scan(parentRuntime.createChild(this))
    }

    matchSuccess (childRuntime) {
        const thisRuntime = childRuntime.parent
        thisRuntime.appendChild(childRuntime)
        thisRuntime.matchs++

        if (thisRuntime.matchs < this.n) {
            // 继续下一个分量的扫描
            this._child.scan(thisRuntime)
        } else {
            // 完成扫描
            thisRuntime.resolve()
        }
    }

    matchFailure (childRuntime, error) {
        const thisRuntime = childRuntime.parent
        if (thisRuntime.matchs < this.m) {
            // 当前必选项匹配不足，则匹配失败
            thisRuntime.reject(error)
        } else {
            thisRuntime.resolve()
        }
    }

    _parseSource (id, source) {
        let curMatcher
        if (typeof source === 'function') {
            curMatcher = new GroupMatcher(id)
            curMatcher.putChild(new RuleMatcher(id, source))
            curMatcher.putEnd()
            return curMatcher
        }

        const groupStack = []
        const groupParserRegExp = RegExp([
            /'((?:[^']|\\\\|\\')+)'/, // 匹配字符串
            /<(\w+|.)>/, // 匹配link
            /(\()/, /(\))/, // 匹配分组
            /([?*+]|\{\d+\}|\{\d+,(?:\d+)?\}|\{,\d+\})/, // "?", "*", "+", "{n}", "{m,}", "{m,n}", "{,n}"
            /(&)/, // "&" 失败则阻止进入或分支，直接reject
            /(\|)/, // "|"
        ].map(item => item.source).join('|'), 'g')
        const groupStackTop = () => groupStack[groupStack.length - 1].matcher
        const groupParser = (
            all,
            matchString,
            matchLinkName,
            matchGroupOpen, matchGroupClose,
            matchSuffixNum,
            matchStop,
            matchOr,
            index
        ) => {
            switch (false) {
                case !matchString: {
                    curMatcher = groupStackTop()
                    const newMatcher = new StringMatcher(matchString)
                    curMatcher.putChild(newMatcher)
                    curMatcher = newMatcher
                    break
                }
                case !matchLinkName: {
                    curMatcher = groupStackTop()
                    const newMatcher = new LinkMatcher(matchLinkName)
                    curMatcher.putChild(newMatcher)
                    curMatcher = newMatcher
                    break
                }
                case !matchGroupOpen: {
                    curMatcher = groupStackTop()
                    const newMatcher = new GroupMatcher()
                    curMatcher.putChild(newMatcher)
                    curMatcher = newMatcher
                    groupStack.push({ matcher: curMatcher, index })
                    break
                }
                case !matchGroupClose: {
                    const groupStackPop = groupStack.pop()
                    curMatcher = groupStackPop.matcher
                    curMatcher.putEnd(source.slice(groupStackPop.index, index + 1))
                    break
                }
                case !matchSuffixNum: {
                    switch (matchSuffixNum) {
                        case '?': {
                            curMatcher.suffixNum(0, 1)
                            break
                        }
                        case '*': {
                            curMatcher.suffixNum(0, Infinity)
                            break
                        }
                        case '+': {
                            curMatcher.suffixNum(1, Infinity)
                            break
                        }
                        default: {
                            matchSuffixNum = matchSuffixNum.slice(1, -1).split(',')
                            if (matchSuffixNum.length === 1) {
                                curMatcher.suffixNum(+matchSuffixNum[0], +matchSuffixNum[0])
                            } else {
                                curMatcher.suffixNum(+matchSuffixNum[0] || 0, +matchSuffixNum[1] || Infinity)
                            }
                        }
                    }
                    break
                }
                case !matchStop: {
                    curMatcher.stop = true
                    break
                }
                case !matchOr: {
                    curMatcher = groupStackTop()
                    curMatcher.putOr()
                    break
                }
            }
        }

        if (typeof source === 'string') {
            curMatcher = new GroupMatcher()
            groupStack.push({ matcher: curMatcher })
            source.replace(/\/\/\/|\/\*[\w\W]*\*\//g, '').replace(groupParserRegExp, groupParser)
            curMatcher = groupStack.pop().matcher
            curMatcher.putEnd(source)
            return curMatcher
        }

        throw Error(`Compiler.option.mathcers.${this.key}.source must be a function or string`)
    }
}

class GroupMatcher extends Matcher {
    constructor (source) {
        super()
        this._source = source
        this._tempOr = null
        this._tempAnd = null
        this._orFirstChild = null
    }

    // 插入子级
    putChild (matcher) {
        const { _tempOr, _tempAnd } = this
        if (_tempOr) { // 已经存在or节点
            // 继续添加and节点
            if (_tempAnd) {
                _tempAnd.nextSibling = matcher
                matcher.previousSibling = _tempAnd
                this._tempAnd = matcher
            } else {
                this._tempOr = _tempOr.nextSibling = {
                    andFirstChild: this._tempAnd = matcher,
                }
            }
        } else {
            this._orFirstChild = this._tempOr = {
                andFirstChild: this._tempAnd = matcher,
            }
        }
        matcher.parentNode = this
        this._tempAnd.groupParent = this._tempOr // 子级链回父级分组or，回溯的使用使用
    }

    // 插入新的or分支
    putOr () {
        this._tempAnd = null
    }

    // 完成节点创建
    putEnd (source) {
        this._source = source
        delete this._tempOr
        delete this._tempAnd
    }


    scan (parentRuntime) {
        const orChild = this._orFirstChild
        const andChild = orChild.andFirstChild
        andChild.scan(parentRuntime.createChild(this, { orChild, andChild, tempChilds: [] }))
    }

    matchSuccess (childRuntime) {
        // (A{3} B{1,2} | A{2} B{2})
        // 子项扫描成功，则判断是否是最后项，是则进行下一个分量扫描，否则继续下一个子项扫描

        const thisRuntime = childRuntime.parent
        let { andChild } = thisRuntime

        if (thisRuntime.tempLastChild) {
            thisRuntime.tempLastChild.nextSibling = childRuntime
            childRuntime.previousSibling = thisRuntime.tempLastChild
            thisRuntime.tempLastChild = childRuntime
        } else {
            thisRuntime.tempLastChild = thisRuntime.tempFirstChild = childRuntime
        }

        // 存在下一个子项
        if (andChild.nextSibling) {
            andChild = thisRuntime.andChild = andChild.nextSibling
            andChild.scan(thisRuntime)
        } else {
            thisRuntime.tempChilds.push({ firstChild: thisRuntime.tempFirstChild, lastChild: thisRuntime.tempLastChild })
            thisRuntime.tempFirstChild = thisRuntime.tempLastChild = null
            thisRuntime.matchs++
            if (thisRuntime.matchs < this.n) {
                // 继续下一个分量的扫描
                thisRuntime.orChild = this._orFirstChild
                thisRuntime.andChild = thisRuntime.orChild.andFirstChild
                thisRuntime.andChild.scan(thisRuntime)
            } else {
                // 已经完成了所有的扫描
                this._resolve(thisRuntime)
            }
        }
    }

    matchFailure (childRuntime, error) {
        const thisRuntime = childRuntime.parent

        // 子项匹配失败

        // 部分匹配成功了，用于判断是否停止扫描
        const someMatched = thisRuntime.tempFirstChild && thisRuntime.tempFirstChild.bIndex < thisRuntime.tempLastChild.eIndex

        // 回退当前扫描结果
        if (thisRuntime.tempFirstChild) {
            thisRuntime.sr.moveTo(thisRuntime.tempFirstChild.bIndex)
            thisRuntime.tempFirstChild = thisRuntime.tempLastChild = null
        }


        if (thisRuntime.orChild.nextSibling && !error.stop) {
            // 假如新的错误扫描的更远，则更新错误
            thisRuntime.error = thisRuntime.error && thisRuntime.error.bIndex >= error.bIndex ? thisRuntime.error : error

            thisRuntime.orChild = thisRuntime.orChild.nextSibling
            thisRuntime.andChild = thisRuntime.orChild.andFirstChild
            thisRuntime.andChild.scan(thisRuntime)
        } else {
            // 必选项分量不足，则此次匹配失败
            // 假如可选集已经存在部分匹配，并且不允许回退，则会触发reject
            if (thisRuntime.matchs < this.m || (someMatched && error.stop)) {
                thisRuntime.error = thisRuntime.error && thisRuntime.error.bIndex >= error.bIndex ? thisRuntime.error : error
                thisRuntime.error.someMatched = someMatched
                thisRuntime.reject(thisRuntime.error)
            } else {
                this._resolve(thisRuntime)
            }
        }
    }

    _resolve (thisRuntime) {
        let nowLastChild
        for (let i = 0; i < thisRuntime.tempChilds.length; i++) {
            const { firstChild, lastChild } = thisRuntime.tempChilds[i]
            if (nowLastChild) {
                nowLastChild.nextSibling = firstChild
                nowLastChild = thisRuntime.lastChild = lastChild
            } else {
                thisRuntime.firstChild = firstChild
                nowLastChild = thisRuntime.lastChild = lastChild
            }
        }
        delete thisRuntime.tempChilds
        delete thisRuntime.tempFirstChild
        delete thisRuntime.tempLastChild
        delete thisRuntime.error
        thisRuntime.resolve()
    }
}

class LinkMatcher extends Matcher {
    constructor (id) {
        super()
        this._id = id
    }

    scan (parentRuntime) {
        matchers[this._id].scan(parentRuntime.createChild(this))
    }

    matchSuccess (childRuntime) {
        const thisRuntime = childRuntime.parent

        thisRuntime.appendChild(childRuntime)
        thisRuntime.matchs++

        if (thisRuntime.matchs < this.n) {
            // 继续下一个分量的扫描
            matchers[this._id].scan(thisRuntime)
        } else {
            // 完成扫描
            thisRuntime.resolve()
        }
    }

    matchFailure (childRuntime, error) {
        const thisRuntime = childRuntime.parent

        if (thisRuntime.matchs < this.m || (error.someMatched && this.stop)) {
            // 当前必选项匹配不足，则匹配失败
            thisRuntime.reject(error)
        } else {
            thisRuntime.resolve()
        }
    }
}

class RuleMatcher extends Matcher {
    constructor (id, match) {
        super()
        this._id = id
        this._match = match
        matchers[id] = this
    }

    scan (parentRuntime) {
        const { sr } = parentRuntime
        const bIndex = sr.chIndex
        const thisRuntime = parentRuntime.createChild(this)
        sr.createRecord()
        if (this._match(sr)) {
            sr.removeRecord()
            thisRuntime.resolve(bIndex, sr.chIndex)
        } else {
            sr.rollback()
            thisRuntime.reject({ bIndex })
        }
    }
}
class StringMatcher extends Matcher {
    constructor (source) {
        super()
        this._source = source
    }

    scan (parentRuntime) {
        const { sr } = parentRuntime
        const thisRuntime = parentRuntime.createChild(this)
        const bIndex = sr.chIndex
        let matchedEndIndex // 发生错误的下标
        const { m, n } = this

        let isSuccess = true

        // 必选集
        sr.createRecord()
        for (let i = 0; i < m; i++) {
            if (!this._match(sr)) {
                isSuccess = false
                sr.rollback()
                break
            } else {
                matchedEndIndex = sr.chIndex
            }
        }

        if (isSuccess) {
            sr.removeRecord()
            // 可选集
            for (let i = m; i < n; i++) {
                sr.createRecord()
                if (!this._match(sr)) {
                    sr.rollback()
                    break
                } else {
                    sr.removeRecord()
                }
            }
            thisRuntime.resolve(bIndex, sr.chIndex)
        } else {
            thisRuntime.reject({ bIndex, matchedEndIndex, someMatched: matchedEndIndex > bIndex })
        }
    }

    _match (sr) {
        const source = this._source
        for (let i = 0, lg = source.length; i < lg; i++) {
            if (sr.read() !== source[i]) {
                return false
            }
        }
        return true
    }
}

module.exports = {
    RootMatcher, RuleMatcher, HookMatcher,
}
