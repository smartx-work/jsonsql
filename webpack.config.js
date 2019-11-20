const path = require('path')

module.exports = {
    entry: './develop/src/index.js',
    output: {
        path: path.resolve(__dirname, 'develop/dist'),
        filename: 'index.js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules|develop\/dist)/, // 排除掉node_module目录
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [ '@babel/preset-env' ], // 转码规则
                        plugins: [
                            [ '@babel/plugin-proposal-class-properties', { loose: true } ],
                            [ '@babel/plugin-transform-runtime', {
                                // absoluteRuntime: false,
                                // corejs: false,
                                // helpers: true,
                                // regenerator: true,
                                useESModules: false,
                            } ],
                        ],
                        sourceType: 'unambiguous',
                    },
                },
            },
        ],
    },
}
