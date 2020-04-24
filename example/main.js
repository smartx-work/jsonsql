
import jsonsql from '../src/index'


docs(`
@data /// + string,null aaaaa
@name /// - string,null bbbbb
@aaa{
    @b1 /// [jjjjk, null]   lklk jkjk
    @b2 /// jkj jkjkhj
    @b3[ /// null b3
        @d1
        @d2
        @d3
        @asasa[
            @a  /// xx xx
            @b  /// yy yy
            @v  /// zz zz
        ]
    ]
}
`)


function docs (code) {
    const itp = jsonsql.compile(code)
    console.info(itp.document())
}
