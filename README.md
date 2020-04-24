# jsonsql

高效，简洁的json数据生成引擎。

### 引擎的优点 

+ 语法简洁，使用原始json结构，简化json的引号，逗号
+ 支持批量生成数据，使用`(n)[ 数据  ]`指令批量生成n条数据
+ 支持动态运算，值可以是js表达式
+ 支持mock运算，值的表达式中可以使用mock指令生成数据
+ 支持动态引用，值的表达式可以引用上级字段的值
+ 支持读取外部变量，允许读取环境中的js变量（使得mock接口可以根据请求参数返回不同的数据）
+ 支持嵌入执行原生js代码
+ 支持导出字段文档描述

### 安装使用
```
yarn add @smartx/jsonsql
```
```js
import jsonsql from ' @smartx/jsonsql'

const code = ` // jsonsql代码
@data{
    @name '张三',
    @age $param.age
}
`

const interpreter = jsonsql.compile(code) // 编译代码生成解释器
const runContext = {$param:{age:3}} // 设定运行上下文，传递数据到内部使用
const result = interpreter.execute(runContext) // 执行返回promise

result.then(data => {
    console.info(data) // {data:{name:'张三',age:3}}
})

```


### 简单示例

#### 示例代码
```
@data{
    @name '张三'
    @age 18
    @books(2)[
        @name '书名'+ 1++
        @price #decimal
    ]
}
```

#### 返回数据

```json
{
    "data":{
        "name": "张三",
        "age": 18,
        "books": [
            {
                "name": "书名1",
                "price": "1.87",
            },
            {
                "name": "书名2",
                "price": "1.87",
            }
        ]
    }
}
```

### 语法结构

#### 定义字段

+ 空值返回字段
    ```
    @key /// => {"key":null}
    ```
+ js表达式返回字段
    ```
    @key Math.max(1, 6) /// => {"key":6}
    ```
+ mock指令返回字段，mock指令详见：@smartx/mock-value
    ```
    @key #name // => {"key":"李虎"} 返回随机姓名
    ```
+ 动态引用其他字段，同名字段覆盖上级字段
    ```
    @data1{
        @id 1
        @data2{
            @id 2
            @key1 @id   // => key1 2 ;;;引用的是data1.data2.id
            @key2 @data1.id  // => key2 = 1 ;;;引用data1.id 
        }
    }
    ```
> 定义字段使用`@字段名 字段值`，`字段值`可以是表达式，可以读取外部环境

> mock指令可以使用`#指令`，`#指令(参数)`或者`$mock.指令(参数)`

> 动态引用变量使用`@变量`来应用，假如引用的变量是一个对象，则会形成循环引用，需要注意，引用对象的子字段使用`@变量.变量`，支持多级，同名字段下面的覆盖上面的值

#### 批量生成数据

```
@data(3)[
    @id 1++
    @names(10)[
        @name #name
    ]
]

// => {
    data: [
        {
            id:1,
            names: [
                {name:'张三'},
                {name:'李四'},
                {name:'王五'},
                ... // 剩余7条数据
            ]
        },
        ... // 剩余2条数据
    ]
}
```

> 使用`@key(n)[ @key1  @key2 ... ]`批量生成`n`条数据，相对于map格式，仅仅是添加`(n)`以及`{ }`变成`[ ]`





#### 读取外部变量

```
// 接口请求url：apiUrl?id=123&name=张三

const {id, name} = $query // 读取请求的参数

@data{
    @id id
    @name name
}
// => {"data":{ "id":123,"name":"张三" }} 
```

 > 引擎支持读取内部变量和外部传入的变量

#### 嵌入原生js

```
@data{
    @name1 getName()
    @name2 getName(true)
}

const num = false

if(num){
    @data{
        @num 777
    }
}

@data2{
    @value(: // 嵌套运算块，以@标识符返回值，赋值给当前字段
        const arr = []
        for(let i = 0;i < 10; i++){
            arr.push('数据'+i)
        }
        @ arr
    :)
}

function getName(type){
    return type ? '具名':'匿名'
}
```

> 引擎支持嵌套js运算，支持调用环境中的函数，也支持内部直接嵌套运算块


#### 定义文档

```
@data{  /// + object 返回的数据
    @code /// enmu  返回的状态码{0:'正确', 1:'登录异常', 2:'参数错误'}
    @list(8)[
        @name /// string 名称
        @age  /// integer,null 年龄
    ]
}
```

> 定义字段文档使用`@key`末尾跟随`/// [updateType] <dataType> <description>`

+ updateType为字段根新类型，可选配置项，取值{+:'新增的',-:'删除的','?':'存在疑问的'}
+ dataType为字段可取的数据类型，string,number,boolean等，多种类型用逗号隔开，可选添加`null`即可
+ description为字段的描述