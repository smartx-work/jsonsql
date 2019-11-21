const normal = `
@data{
    @name 'x0' /// string 名称
    @age 16 /// number 年龄
    @goodsList(66)[
        @title '商品666' /// string 商品名称
        @price '12.12' /// string 商品价格
    ]
}
`

const WRAPPER = `
@aaaaaaaaaa{
    @bbbbbbb(100)[
        @aaaaaaaaaa 1111111111++
        @bbbbbbbbbb 2222222222
        @cccccccccc 3333333333
        @dddddddddd 4444444444
        @eeeeeeeeee 5555555555 + 6666666666
    ]
    ######PLACEHOLDER######
}
`

// 巨型数据生成
let large = WRAPPER
const count = 100
for (let i = 0; i < count; i++) {
    large = large.replace('######PLACEHOLDER######', WRAPPER)
}
large = large.replace('######PLACEHOLDER######', '')


const mock = `
@json{
    @success true /// string 是否成功
    @list(10)[
        @id 100++
        @ks(10)[
            @num 100++
        ]
    ]
}
`
const easy = `
@json{
    @datas(12)[
        @id 100++
        @name #cName
        @email #email
    ] 
}
`

module.exports = {
    normal,
    large,
    mock,
    easy,
}
