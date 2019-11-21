const jsonsql = require('../../lib/index')
const beautifyJs = require('js-beautify').js

const exampleCode = require('./exampleCode')

console.time('compile')
const interpreter = jsonsql.compile(exampleCode.easy)
console.timeEnd('compile')


if (typeof document !== 'undefined' && interpreter.code) {
    document.body.innerHTML = `<textarea style="width:100%; height:1000px" autocomplete="off">${beautifyJs(interpreter.code)}</textarea>`
}


interpreter.execute({
    $param: {
        page: 1,
        pageSize: 10,
    },
}).then(res => {
    console.info(res)
}).catch(err => {
    console.info(err)
})
