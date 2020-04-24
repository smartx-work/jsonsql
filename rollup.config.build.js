import resolve from '@rollup/plugin-node-resolve'
import cjs from '@rollup/plugin-commonjs'
import buble from '@rollup/plugin-buble'
import json from '@rollup/plugin-json'
import { terser } from 'rollup-plugin-terser'
import node from 'rollup-plugin-node-builtins'
import nodeGlobals from 'rollup-plugin-node-globals'

export default {
    input: './src/index.js', // 入口文件
    output: [
        {
            file: 'dist/index.cjs.js',
            format: 'cjs',
            sourcemap: true,
        },
        {
            file: 'dist/index.esm.js',
            format: 'es',
            sourcemap: true,
        },
        /* {
            file: 'dist/index.umd.js',
            format: 'umd',
            name: 'mylib',
            sourcemap: true,
            globals: {
                '@smartx/mock-value': 'mockValue',
                vm: 'vm',
            },
        }, */
    ],
    plugins: [
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
        terser(),
    ],
    external: [ 'vm', '@smartx/mock-value' ],
}
