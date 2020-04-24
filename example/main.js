
import jsonsql from '../src/index'
import exampleJsonsqlCode from './exampleJsonsqlCode'
import jsBeautify from 'js-beautify'

console.time('compile')
const interpreter = jsonsql.compile(exampleJsonsqlCode.large)
console.timeEnd('compile')
if (typeof document !== 'undefined' && interpreter.code) {
    document.body.innerHTML = `<textarea style="width:100%; height:1000px" autocomplete="off">${jsBeautify.js(interpreter.code)}</textarea>`
}

interpreter.execute({
    $param: {
        page: 1,
        pageSize: 10,
    },
}).then(res => {
    console.info((res))
}).catch(err => {
    console.info(err)
})
