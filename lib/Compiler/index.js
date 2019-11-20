
const { RuleMatcher, HookMatcher } = require('./Matchers')
const scanner = require('./scanner')
const interpreter = require('./interpreter')

class Compiler {
    constructor ({ matchers }) {
        this._matchers = {}
        this._initSystemMatchers()
        this._initCustomMatchers(matchers)
    }

    compile (code, id = 'main') {
        const sr = scanner(code)
        const mainMatcher = this._matchers[id]
        try {
            while (sr.notEOF()) {
                sr.use(mainMatcher)
            }

            const tree = sr.tree()
            const code = tree.code()
            const execute = interpreter.use(code)

            return { tree, code, execute }
        } catch (error) {
            return {
                error,
                execute () {
                    return new Promise((resolve) => {
                        resolve({
                            $error: error,
                        })
                    })
                },
            }
        }
    }

    _initSystemMatchers () {
        const matchers = this._matchers
        ;[
            [ 'w', sr => /\w/.test(sr.read()) ],
            [ 'W', sr => /\W/.test(sr.read()) ],
            [ 'd', sr => /\d/.test(sr.read()) ],
            [ 'D', sr => /\D/.test(sr.read()) ],
            [ 's', sr => /\s/.test(sr.read()) ],
            [ 'S', sr => /\S/.test(sr.read()) ],
            [ 'eol', sr => sr.read() === sr.EOL ],
            [ '.', sr => sr.read() !== sr.EOL ],
        ].forEach(([ id, pattern ]) => {
            matchers[id] = new RuleMatcher(id, pattern)
        })
    }

    _initCustomMatchers (matcherOptions) {
        const matchers = this._matchers
        for (const id in matcherOptions) {
            matchers[id] = new HookMatcher(id, matcherOptions[id], this)
        }
    }
}

module.exports = Compiler
