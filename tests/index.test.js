const ijest = require('ijest')
const http = require('http')

ijest({
    before (context) {
        context.server = http.createServer(function (req, res) {

        }).listen(4444)
    },
    after (context) {
        context.server.close()
    },
    context: {
        num: 6,
        obj: {},
    },
    tests: {
        example: require('./children/example'),
    },
})
