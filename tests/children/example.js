module.exports = function (context, { tests, test, assert }) {
    tests('测试例子分组', () => {
        test('测试例子单元测试', () => {
            assert.isNumber(context.num)
        })
    })
}
