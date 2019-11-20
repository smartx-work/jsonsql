
const documentParser = require('./dataParser/parsers/document')
const valueParser = require('./dataParser/parsers/value')

class Node {
    constructor (runtime) {
        this.runtime = runtime
        this.parentNode = runtime.curNode

        if (!runtime.rootNode) {
            runtime.rootNode = this
        }

        runtime.curNode = this
    }

    document () {
        return ''
    }

    code () {
        throw Error('Node.code must be override')
    }
}

class FieldsNode extends Node {
    constructor () {
        super(...arguments)
        this.fields = []
    }

    fieldsCode () {
        return this.fields.map(item => item.code()).join('\n')
    }

    fieldsDocument () {
        return this.fields.map(item => item.document()).join('\n')
    }

    getKeysCode () {
        const keys = []
        this.fields.forEach(item => {
            if (!item.fieldValueExpression && !item.childNode) {
                if (item.dbFieldKey) {
                    keys.push(`${item.dbFieldKey} AS ${item.fieldKey}`)
                } else {
                    keys.push(item.fieldKey)
                }
            }
        })

        if (this.dbFieldsDefineExpression) {
            keys.push(this.dbFieldsDefineExpression)
        }

        return keys.join(', ')
    }
}

class ObjectFieldNode extends Node {
    code () {
        const key = this.fieldKeyCode()
        let getterBody
        if (this.isDbQuery()) {
            const childNode = this.childNode
            const isArray = childNode.constructor === ListNode
            const keys = childNode.getKeysCode() || 'count(*) AS total'
            const tableName = this.dbTableName || this.fieldKey
            const sqlArgument = this.conditionCode()
            const nextGetterBody = childNode.code()
            getterBody = `$sql("SELECT ${keys} FROM ${tableName} ${sqlArgument}", function(){
                ${nextGetterBody}
            }, ${isArray});`
        } else {
            if (this.fieldValueExpression) {
                getterBody = `$value(function(){
                    return ${valueParser(this.fieldValueExpression)}
                });`
            } else if (this.childNode) {
                getterBody = this.childNode.code()
            } else {
                getterBody = `$value(function(){
                    return this.${key}
                });`
            }
        }
        const mtdName = this.parentNode === this.runtime.rootNode ? 'await $export' : '$field'
        return `${mtdName}("${key}", function(){
            ${getterBody}
        });`
    }

    fieldKeyCode () { // 键名格式化
        return this.fieldKey.replace(/[^.]+\./, '')
    }

    isDbQuery () { // 是否是数据库查询字段
        return !!this.sqlConditionExpression
    }

    conditionCode () {
        const condition = this.sqlConditionExpression
        if (condition === 'null') {
            return ''
        }
        return `${
            condition
                .replace(/("(?:[^"]|\\")*")|('(?:[^']|\\')*')|(\|\|)|(&&)|(\\)/g, function (source, dQuote, sQuote, or, and, esChar) {
                    if (dQuote || sQuote || esChar) {
                        return source.replace(/("|'|\\)/g, '\\$1')
                    }
                    if (or) {
                        return ' OR '
                    }
                    if (and) {
                        return ' AND '
                    }
                })
                .replace(/\{(#|\$)([\w.]+)\}/g, function (source, prefix, word) {
                    if (prefix === '#') {
                        return `"+ ${word} +"`
                    } else if (prefix === '$') {
                        return `"+ this.${word} +"`
                    }
                })}`
    }

    document () {
        const key = this.fieldKeyCode()
        const document = this.document ? `$document(${documentParser(this.document)});` : '$document(null);'
        const childNode = this.childNode
        let childGetter = ''
        if (childNode && (childNode.constructor === ListNode || childNode.constructor === MapNode)) {
            childGetter = childNode.document()
        }
        return `$field("${key}", function(){
            ${document}
            ${childGetter}
        });`
    }
}

class ListNode extends FieldsNode {
    code () {
        const { parentNode } = this

        if (parentNode.isDbQuery()) {
            return `$list(this.$rs, function(){
                $map(function(){
                    ${this.fieldsCode()}
                })
            });`
        }

        const getterBody = this.childNode ? this.childNode.code() : `$map(function(){
            ${this.fieldsCode()}
        });`

        return `$list(${parentNode.listLength || 0}, function(){
            ${getterBody}
        });`
    }

    document () {
        const getterBody = this.childNode ? this.childNode.document() : `$map(function(){
           ${this.fieldsDocument()}
        });`
        return `$list(function(){
            ${getterBody}
        });`
    }
}

class MapNode extends FieldsNode {
    code () {
        if (this.parentNode) {
            return `$map(function(){
                ${this.fieldsCode()}
            });`
        }
        return this.fieldsCode()
    }

    document () {
        if (this.parentNode) {
            return `$map(function(){
                ${this.fieldsDocument()}
            });`
        }
    }
}

class ValueNode extends FieldsNode {
    code () {
        return `$value(function(){ // xxx
            ${this.blockExpressions ? this.blockExpressions.join('') : ''}
            return ${valueParser(this.returnExpression)}
        });`
    }
}

class JsNode extends Node {
    code () {
        return this.codeExpression
    }
}

module.exports = {
    ObjectFieldNode,
    MapNode,
    ListNode,
    ValueNode,
    JsNode,
}
