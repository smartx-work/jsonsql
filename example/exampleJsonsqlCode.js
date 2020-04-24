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
    @bbbbbbb(1000)[
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
const count = 90
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

let xxx = [1,2]


@json{
    @name2 #name
    @datas(2)[
        @id 10000++
        @name @name2
        @email #email
        @cardno #cardno
        @time #datetime
        @imgsrc #img('100x100')
    ] 
    @page $param.page
    @pageSize $param.pageSize + 1
}
`

export default {
    normal,
    large,
    mock,
    easy,
}
