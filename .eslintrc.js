module.exports = {
    extends: [
        '@smartx/eslint-config-tentative',
    ],
    parser: "babel-eslint",
    parserOptions: { 
        ecmaVersion: 7
    },
    globals: {
        
    },
    rules: {
        'no-return-assign': 'off', // 允许return中使用赋值操作
        'no-sequences': 'off', // Array.reduce中使用逗号运算符
        'no-console': [ 'error', { allow: [ 'warn', 'error' ] } ],
    },
}
