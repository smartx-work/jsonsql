import resolve from '@rollup/plugin-node-resolve'
import cjs from '@rollup/plugin-commonjs'
import buble from '@rollup/plugin-buble'
import json from '@rollup/plugin-json'
// import { terser } from 'rollup-plugin-terser'
import serve from 'rollup-plugin-serve'
import node from 'rollup-plugin-node-builtins'
import nodeGlobals from 'rollup-plugin-node-globals'


const plugins = [
    cjs(),
    resolve({
        // 将自定义选项传递给解析插件
        customResolveOptions: {
            moduleDirectory: 'node_modules',
        },
    }),
    json(),
    buble({
        objectAssign: 'Object.assign',
        transforms: { asyncAwait: false },
    }),
    node(),
    nodeGlobals(),
    // terser(),
    serve({ // 使用开发服务插件
        port: 3001,
        // 设置 exmaple的访问目录和dist的访问目录
        contentBase: [ './example', './temp' ],
    }),
]

export default [
    {
        input: './example/main.js',
        output: {
            file: './temp/main.bundle.js',
            format: 'iife',
            name: 'nodeLibDev',
            sourcemap: true,
        },
        plugins,
    },
    {
        input: './example/playground.js',
        output: {
            file: './temp/playground.bundle.js',
            format: 'iife',
            name: 'playground',
            sourcemap: true,
        },
        plugins,
    },

]
