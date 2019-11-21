
const vm = require('vm')
const beautifyJs = require('js-beautify').js
const parserContext = require('./dataParser/context')
module.exports = {
    use,
}

// 返回执行器
function use (code, option) {
    let script = null

    return async function (customContext) {
        const dataExports = {}
        const runtime = {}
        const systemContext = {
            async $export (key, getter) {
                dataExports[key] = await (systemContext.$field(key, getter)).value(runtime)
            },
            $field (key, getter) {
                const fieldNode = new FieldNode(getter, runtime, key)
                runtime.curNode.appendChild(fieldNode)
                return fieldNode
            },
            $map (getter) {
                runtime.curNode.appendChild(new MapNode(getter, runtime))
            },
            $list (arr, getter) {
                runtime.curNode.appendChild(new ListNode(getter, runtime, arr))
            },
            $sql (sql, getter, isArray) {
                runtime.curNode.appendChild(new SqlNode(getter, runtime, sql, isArray))
            },
            $block (getter) {
                runtime.curNode.appendChild(new BlockNode(getter, runtime))
            },
            $value (getter) {
                runtime.curNode.appendChild(new ValueNode(getter, runtime))
            },
            async value () {
                return runtime.curNode.value(runtime)
            },
        }

        runtime.curNode = new MapNode(() => { }, runtime)

        script = script || (() => {
            const scriptCode = beautifyJs(`
                async function main(){
                    ${code}
                }
                let promise = main() 

                typeof $success === 'function' && (promise = promise.then($success))
                typeof $failure === 'function' && (promise = promise.catch($failure))
                typeof $finally === 'function' && (promise = promise.finally($finally))
            `)
            try {
                return new vm.Script(scriptCode, { timeout: 1000 * 6 })
            } catch (err) {
                const errLine = err.stack.match(/:(\d+)/)[1]
                const errMessage = err.message
                const errCodes = scriptCode.split(/\n/)
                const error = {
                    line: errLine,
                    message: errMessage,
                    codes: errCodes,
                    lineCode: scriptCode.split(/\n/)[errLine - 1],
                }

                return new vm.Script(`
                    async function main(){
                        await $export('$error', function(){
                            $value(function(){
                                return ${JSON.stringify(error)}
                            })
                        })
                    }
                    let promise = main()
                    typeof $success === 'function' && (promise = promise.then($success))
                `)
            }
        })()

        return new Promise((resolve, reject) => {
            script.runInNewContext(Object.assign({ }, customContext, parserContext, systemContext, {
                $success () {
                    resolve(dataExports)
                },
                $failure (err) {
                    dataExports.$error = err
                    resolve(dataExports)
                },
            }))
        })
    }
}


let pid = 1
class Node {
    constructor (getter, runtime) {
        this.PID = pid++
        this.parentNode = runtime.curNode
        this.Context = function () {}
        this.context = this.Context.prototype = this.parentNode ? new this.parentNode.Context() : {} // 从上一级环境中继承上下文变量
        this.getter = getter
    }

    // 在获取值的时候，通过调用getter生成子节点结构
    getterProxy (runtime) {
        runtime.curNode = this
        runtime.curNode.getter.call(this.context, runtime)
        runtime.curNode = this.parentNode
    }

    appendChild (childNode) {
        this.childNode = childNode
    }
}

class MapNode extends Node {
    constructor () {
        super(...arguments)
        this.fields = {}
    }

    appendChild (childNode) {
        // 后续的同名字段会覆盖前面的字段
        if (this.fields[childNode.key]) {
            delete this.fields[childNode.key]
        }
        this.fields[childNode.key] = childNode
    }

    async value (runtime) {
        this.getterProxy(runtime)
        const value = {}
        for (const key in this.fields) {
            runtime.curNode = this
            value[key] = this.context[key] = await this.fields[key].value(runtime)
            runtime.curNode = this.parentNode
        }
        return value
    }
}

class FieldNode extends Node {
    constructor (getter, runtime, key) {
        super(getter, runtime)
        this.key = key
    }

    async value (runtime) {
        this.getterProxy(runtime)
        if (this.childNode) {
            return this.childNode.value(runtime)
        }
    }
}

class ValueNode extends Node {
    value (runtime) {
        const value = this.getter.call(this.context, runtime)
        return value === undefined ? null : value
    }
}

class ListNode extends Node {
    constructor (getter, runtime, arr) {
        super(getter, runtime)
        this.arr = arr
        this.context.$total = 0
    }

    async value (runtime) {
        this.getterProxy(runtime)
        runtime.curNode = this
        const value = []
        const childNode = this.childNode
        if (!childNode) {
            return value
        }

        if (Array.isArray(this.arr)) {
            // 数据库模式
            const rs = this.arr
            for (let i = 0; i < rs.length; i++) {
                this.context.$index = i
                this.context.$total++
                Object.assign(this.context, rs[i])
                value.push(await this.childNode.value(runtime))
            }
        } else {
            // 常规mock模式
            for (let i = 0; i < this.arr; i++) {
                this.context.$index = i
                this.context.$total++
                value.push(await this.childNode.value(runtime))
            }
        }
        runtime.curNode = this.parentNode
        return value
    }
}

class BlockNode extends Node {
    async value (runtime) {
        runtime.curNode = this
        const value = await this.getter.call(this.context)
        runtime.curNode = this.parentNode
        return value
    }
}

class SqlNode extends Node {
    constructor (getter, runtime, sql, isArray = false) {
        super(getter, runtime)
        this.sql = sql
        this.isArray = isArray
    }

    async value (runtime) {
        runtime.curNode = this
        const rs = []// await $mysql(this.sql)
        if (this.isArray) {
            this.context.$rs = rs
        } else {
            Object.assign(this.context, rs[0])
        }

        await this.getter.call(this.context)
        const value = await this.childNode.value(runtime)
        runtime.curNode = this.parentNode
        return value
    }
}
