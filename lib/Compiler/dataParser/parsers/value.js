const parserContext = require('../context')

const parsers = [
    stepNumParser,
    thisFieldParser,
    randomValueParser,
    mockValueParser,
]

Object.assign(parserContext, {
    $mock: {
        stepNum (num, step) {
            return num + step
        },
        randomValue (values) {
            return values[Math.floor(Math.random() * values.length)]
        },
    },
})

module.exports = function valueParser (code) {
    for (let i = 0, lg = parsers.length; i < lg; i++) {
        const result = parsers[i](code)

        // 返回对象，则进行转化操作
        if (typeof result === 'object') {
            const { newCode, isBreak } = result
            if (newCode !== undefined) {
                code = newCode
            }
            if (isBreak) {
                break
            }
        }
    }

    return code
}


function stepNumParser (code) {
    const matches = code.match(/(\d+)(\+\+)/)
    if (!matches) {
        return
    }
    const [ , num, type ] = matches
    return { newCode: `$mock.stepNum(${num}, ${type === '++' ? 1 : -1})`, isBreak: true }
}

function thisFieldParser (code) {
    // 跳过所有的字符串内容
    const newCode = code.replace(/(?:'(?:[^']|\\\\|\\')')|(?:"(?:[^"]|\\\\|\\")")|(?:`(?:[^`]|\\\\|\\`)`)|(@)/g, (all, thisSymbol) => {
        if (thisSymbol) {
            return 'this.'
        }
        return all
    })
    if (code === newCode) {
        return
    }
    return { newCode }
}

function randomValueParser (code) {
    const matches = code.match(/(.+)?\?\?/)
    if (!matches) {
        return
    }
    const [ , expression ] = matches
    return { newCode: `$mock.randomValue(${expression})`, isBreak: true }
}

function mockValueParser (code) {
    // const matches = code.match(/^#\w+[.\w]+/)
}
