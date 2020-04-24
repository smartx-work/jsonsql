import Compiler from './Compiler'

const compiler = new Compiler({
    matchers: {
        main: {
            source: ' <objectField>& | <js> ',
        },

        objectField: {
            source: `
                '@' <objectFieldKey> 
                (
                    ( '#' <dbFieldKey> )? <eol> |
                    ( <s>+ <objectFiledValueExpression> <eol> )& |
                    ( '(' <s>* ')' )? <block>& |
                    ( '(' <listLength> ')' <list>& ) |
                    ( '#' <dbTableName> )? '(' <dbSqlConditionExpression> ')' <block>
                )
            `,
            before: tb => tb.objectFieldCreate(),
            done: tb => tb.childComplete(),
            document: (tb, text) => tb.documentCreate(text),
        },
        objectFieldKey: {
            source: ' <w>+ ',
            done: (tb, text) => tb.objectFieldSetKey(text),
        },
        objectFiledValueExpression: {
            source (sr) {
                let hasMatched = false
                while (true) {
                    if (sr.read() === sr.EOL) {
                        sr.back()
                        break
                    }
                    hasMatched = true
                }
                return hasMatched
            },
            done: (tb, text) => tb.objectFieldSetValueExpression(text),
        },

        block: {
            source: '<map>& | <list>& | <value>&',
        },
        map: {
            source: ` 
                '{' <eol> <dbFieldsDefineExpression>? <objectField>*& '}' <eol> 
            `,
            before: tb => tb.mapCreate(),
            done: tb => tb.childComplete(),
            exclusive: true,
        },
        list: {
            source: `
                '[' <eol> <dbFieldsDefineExpression>? <objectField>*& ']' <eol>
            `,
            before: (tb) => tb.listCreate(),
            done: tb => tb.childComplete(),
            exclusive: true,
        },
        listLength: {
            source: ' <d>+ ',
            done: (tb, text) => tb.listSetLength(text),
        },

        value: {
            source: `
                '(:' <eol> <dbFieldsDefineExpression>? <valueBlockExpression>* <valueReturnExpression> ':)' <eol> 
            `,
            before: tb => tb.valueCreate(),
            done: tb => tb.childComplete(),
            exclusive: true,
        },
        valueBlockExpression: {
            source: function (sr) {
                const text = []
                while (true) {
                    const cr = sr.read()
                    if (cr === sr.EOL) {
                        break
                    }
                    text.push(cr)
                }
                const line = text.join('')
                if (/^@|^:\)$/.test(line)) {
                    return false
                }
                return true
            },
            done: (tb, text) => tb.valueSetBlockExpression(text),
        },
        valueReturnExpression: {
            source (sr) {
                if (sr.read() !== '@' || sr.read() !== ' ') {
                    return false
                }
                while (true) {
                    if (sr.read() === sr.EOL) {
                        break
                    }
                }
                return true
            },
            done: (tb, text) => tb.valueSetReturnExpression(text.slice(2, -1)),
        },

        js: {
            source: ' <.>+ <eol> ',
            before: tb => tb.jsCreate(),
            done: (tb, text) => {
                tb.jsSetCodeExpression(text.slice(0, -1))
                tb.childComplete()
            },
        },

        dbFieldKey: {
            source: `
                <w> (<w> | '.')*
            `,
            done: (tb, text) => tb.dbSetFieldKey(text),
        },
        dbTableName: {
            source: ' <w>+ ',
            done: (tb, text) => tb.dbSetTableName(text),
        },
        dbSqlConditionExpression: {
            source (sr) {
                let hasMatched = false
                let isEscape = false // 是否遇到转义反斜杠
                let bkLength = 0 // 括号开启的次数

                while (sr.notEOF()) {
                    const cr = sr.read()
                    if (isEscape) {
                        isEscape = false
                    } else if (cr === '\\') {
                        isEscape = true
                    } else if (cr === '(') {
                        bkLength++
                    } else if (cr === ')') {
                        if (bkLength > 0) {
                            bkLength--
                        } else { // 结束
                            sr.back()
                            break
                        }
                    }
                    hasMatched = true // 任意长度，表示成功
                }

                return hasMatched
            },
            done: (tb, text) => tb.dbSetSqlConditionExpression(text),
        },
        dbFieldsDefineExpression: {
            source (sr) {
                if (sr.read() !== '#') {
                    return false
                }

                const text = []
                while (sr.notEOF()) {
                    const cr = sr.read()
                    if (cr === sr.EOL) {
                        break
                    }
                    text.push(cr)
                }
                return /^\(.+?\)$/.test(text.join(''))
            },
            done: (tb, text) => tb.dbSetFieldsDefineExpression(text.slice(2, -2)),
        },
    },
})

export default {
    compile: code => compiler.compile(code),
}
