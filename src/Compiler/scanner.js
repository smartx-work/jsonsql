import Runtime from './Runtime'
import { RootMatcher } from './Matchers'
import treeBuilder from './treeBuilder'

export default scanner

function scanner (code) {
    const [ BOF, EOF, EOL ] = [ {}, {}, '\n' ]
    const [ chAlls, chMaps ] = [ [], [] ]

    // 初始化代码数据
    init()

    const recordStack = []
    const runtimes = []
    const sr = {
        EOF,
        EOL,
        chAlls,
        chIndex: 0,
        chNow: BOF,
        notEOF: () => sr.chIndex < chAlls.length,
        use (matcher) {
            matcher.scan(new Runtime(null, new RootMatcher((thisRuntime) => {
                runtimes.push(thisRuntime)
            }, (thisRuntime, error) => {
                const codeInfo = info(error.bIndex)
                // eslint-disable-next-line no-throw-literal
                throw {
                    message: '编译错误',
                    line: codeInfo.line,
                    column: codeInfo.column,
                    text: chAlls.slice(...codeInfo.range).join(''),
                    codes: chAlls.join('').split(/\n/),
                }
            }), { sr }))
        },
        read: () => {
            if (sr.chIndex === chAlls.length) { // 处于文件结尾
                throw Error('ch已经到达结尾')
            }
            return sr.chNow = chAlls[sr.chIndex++]
        },
        back: () => sr.chNow = chAlls[--sr.chIndex],
        moveTo: (chIndex) => sr.chNow = chAlls[sr.chIndex = chIndex],
        createRecord: () => recordStack.push(sr.chIndex),
        removeRecord: () => recordStack.pop(),
        lastRecord: () => recordStack[recordStack.length - 1],
        rollback: () => sr.moveTo(recordStack.pop()),
        text: (bIndex, eIndex = bIndex + 100) => chAlls.slice(bIndex, Math.min(chAlls.length, eIndex)).join('').replace(/\n/g, '\\n'),
        tree () {
            const tb = treeBuilder()
            const walkRuntimes = (runtime) => {
                if (!runtime) {
                    return
                }

                let text
                const matcher = runtime.matcher
                const hooks = matcher._hooks

                if (hooks) {
                    text = chAlls.slice(runtime.bIndex, runtime.eIndex).join('')
                    hooks.before && hooks.before(tb, text)
                }

                if (runtime.firstChild) {
                    walkRuntimes(runtime.firstChild)
                }

                if (hooks) {
                    hooks.document && hooks.document(tb, info(runtime.bIndex).document)
                    hooks.done && hooks.done(tb, text)
                }

                if (runtime.nextSibling) {
                    walkRuntimes(runtime.nextSibling)
                }
            }

            runtimes.forEach(walkRuntimes)

            return tb.getValue()
        },
    }

    return sr

    function init () {
        let lineNum = -1 // 原始行标，因为要对空行进行过滤
        code.split(/\r\n?|\r?\n/).forEach(line => {
            line = line.trim()
            lineNum++

            if (!line) {
                return
            }

            let document
            line = line.replace(/\/\/(\/)? .+/, (matched, isDocument) => {
                if (isDocument) {
                    document = matched
                }
                return ''
            }).trim()

            if (!line) {
                return
            }

            const bIndex = chAlls.length
            chAlls.push(...line.split(''), '\n')
            const eIndex = chAlls.length
            chMaps.push([ lineNum, bIndex, eIndex, document ])
        })
    }

    function info (index) {
        const map = chMaps
        const mapLength = map.length - 1

        let bSection = 0
        let eSection = mapLength
        let nSection = bSection
        let i = 1000 // 越界中断标识
        while (i--) {
            // nSection = Math.ceil((bSection + eSection) / 2)

            const item = map[nSection] // 二分法取值
            const bIndex = item[1]
            const eIndex = item[2]

            // console.info({ nSection, index, bIndex, eIndex })

            if (index >= bIndex && index < eIndex) {
                return {
                    range: item.slice(1, 3),
                    line: item[0], // 行
                    column: index - bIndex + 1, // 列
                    document: item[3], // 文档
                }
            } else if (index < bIndex) { // 向前搜
                eSection = nSection
                nSection = Math.floor((eSection + bSection) / 2) // 把当前值作为结束区间
            } else { // 向后搜
                bSection = nSection
                nSection = Math.ceil((eSection + bSection) / 2) // 把当前值作为开始区间
            }
        }
    }
}
