
let indentSize = 0
const matcherCreated = true
const runtimeCreated = true
const scaning = true
const resolve = true
const reject = true

const indentSpace = '  '
const indent = (changeSize) => {
    if (changeSize === -1) {
        return Array(Math.max(0, indentSize--)).join(indentSpace)
    } else if (changeSize === 1) {
        return Array(++indentSize).join(indentSpace)
    } else {
        return Array(indentSize).join(indentSpace)
    }
}
const matcherIdentfier = (matcher) => `${matcher.PID}.${matcher.constructor.name}`
const matcherInfo = (matcher) => {
    // LinkMatcher
    if (matcher._id) {
        return ` "${matcher._id}" `
    }

    // StringMatcher
    if (matcher._source) {
        return ` "${matcher._source}" `
    }
    return ''
}
const chNow = (sr) => {
    const index = sr.chIndex
    const chNow = sr.chAlls[index]
    return `【${index}: ${chNow === sr.EOL ? '\\n' : chNow}】`
}
const matchedString = (runtime) => `【${runtime.sr.text(runtime.bIndex, runtime.eIndex)}】`

module.exports = {
    matcherCreated (matcher) {
        if (matcherCreated) {
            console.warn(`${indent(0)}${matcherIdentfier(matcher)}  created`, [ matcher ])
        }
    },
    runtimeCreated (thisRuntime) {
        if (runtimeCreated) {
            console.warn(`${indent(0)}${matcherIdentfier(thisRuntime.matcher)}.Runtime created`, [ thisRuntime ])
        }
    },
    scaning ({ sr }, matcher) {
        if (scaning) {
            console.warn(`${indent(1)}${matcherIdentfier(matcher)}${matcherInfo(matcher)} scaning ${chNow(sr)}`, [ matcher ])
        }
    },
    resolve (thisRuntime) {
        if (resolve) {
            const { matcher } = thisRuntime
            console.warn(`${indent(-1)}${matcherIdentfier(matcher)}${matcherInfo(matcher)} resolve ${matchedString(thisRuntime)}`, [ matcher ])
        }
    },
    reject (thisRuntime, error) {
        if (reject) {
            const { sr, matcher } = thisRuntime
            console.error(`${indent(-1)}${matcherIdentfier(matcher)}${matcherInfo(matcher)} reject ${chNow(sr)}`, [ matcher, error ])
        }
    },
}
