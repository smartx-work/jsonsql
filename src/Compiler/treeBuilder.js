

import {
    ObjectFieldNode,
    MapNode,
    ListNode,
    ValueNode,
    JsNode,
} from './treeNodes'

export default function treeBuilder () {
    return new Builder(...arguments)
}


class Builder {
    constructor () {
        new MapNode(this)
    }

    objectFieldCreate () {
        new ObjectFieldNode(this)
    }

    objectFieldSetKey (text) {
        this.curNode.fieldKey = text
    }

    objectFieldSetValueExpression (text) {
        this.curNode.fieldValueExpression = text
    }

    dbSetSqlConditionExpression (text) {
        this.curNode.sqlConditionExpression = text
    }

    dbSetFieldKey (text) {
        this.curNode.dbFieldKey = text
    }

    dbSetTableName (text) {
        this.curNode.tableName = text
    }

    dbSetFieldsDefineExpression (text) {
        if (text) {
            this.curNode.dbFieldsDefineExpression = text
        }
    }

    mapCreate () {
        new MapNode(this)
    }

    listCreate () {
        new ListNode(this)
    }

    listSetLength (text) {
        this.curNode.listLength = Number(text) || 0
    }

    valueCreate () {
        new ValueNode(this)
    }

    valueSetBlockExpression (text) {
        this.curNode.blockExpressions = this.curNode.blockExpressions || []
        this.curNode.blockExpressions.push(text)
    }

    valueSetReturnExpression (text) {
        this.curNode.returnExpression = text
    }

    jsCreate () {
        new JsNode(this)
    }

    jsSetCodeExpression (text) {
        this.curNode.codeExpression = text
    }

    documentCreate (text) {
        this.curNode.document = text
    }

    childComplete () {
        const { curNode } = this
        const { parentNode } = curNode

        if (parentNode.fields) {
            parentNode.fields.push(curNode)
        } else {
            parentNode.childNode = curNode
        }

        this.curNode = parentNode
    }

    getValue () {
        return this.rootNode
    }
}
