
const logger = require('./logger')

let PID = 0
class Runtime {
    constructor (parent, matcher, extral) {
        this.PID = PID++
        this.parent = parent
        this.matcher = matcher
        this.matchs = 0 // 成功匹配次数

        if (parent) {
            this.sr = parent.sr
        }

        if (extral) {
            Object.assign(this, extral)
        }

        logger.runtimeCreated(this)
    }

    createChild (matcher, extral) {
        return new Runtime(this, matcher, extral)
    }

    appendChild (childRuntime) {
        if (this.lastChild) {
            this.lastChild.nextSibling = childRuntime
            childRuntime.previousSibling = this.lastChild
            this.lastChild = childRuntime
        } else {
            this.firstChild = this.lastChild = childRuntime
        }
    }

    // 匹配器完成扫描
    resolve (bIndex, eIndex) {
        if (eIndex != null) {
            this.bIndex = bIndex
            this.eIndex = eIndex
        } else if (this.firstChild) {
            this.bIndex = this.firstChild.bIndex
            this.eIndex = this.lastChild.eIndex
        } else {
            // 0次匹配的节点
            this.bIndex = this.sr.chIndex
            this.eIndex = this.sr.chIndex
        }
        logger.resolve(this)

        // 触发父级子项扫描成功
        this.parent.matcher.matchSuccess(this)
    }

    reject (error) {
        if (error.stack) {
            error.stack.push(this)
        } else {
            error.message = '匹配错误'
            error.text = this.sr.text(error.bIndex)
            error.stack = [ this ]
        }
        logger.reject(this, error)

        if (error.someMatched && this.matcher.stop) {
            error.stop = true
        }

        this.parent.matcher.matchFailure(this, error)
    }
}

Runtime.prototype.resolve = killRecursion(Runtime.prototype.resolve)
Runtime.prototype.reject = killRecursion(Runtime.prototype.reject)

module.exports = Runtime

function killRecursion (recursion) {
    let scanIsRun = false
    let contextArgs
    let contextThat
    return function () {
        contextArgs = arguments
        contextThat = this
        if (!scanIsRun) {
            // console.info('startScan')
            scanIsRun = true
            while (contextArgs) {
                const args = contextArgs
                contextArgs = null
                recursion.apply(contextThat, args)
            }
            scanIsRun = false
        }
    }
}
