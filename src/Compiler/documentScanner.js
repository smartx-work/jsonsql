const parserRegexp = RegExp([
    /^\/\/\/\s+/, // beginToken
    /(?:([-+?!])\s+)?/, // matchFlag
    /((\[?)[\w,\s]+\]?|[\w,]+)\s+/, // matchTypes, isMulti
    /(.+)/, // matchDescription
].map(item => item.source).join(''))
const shortTypes = { n: 'null', s: 'string', l: 'long', f: 'float', b: 'boolean', a: 'array', m: 'map' }

export default function documentScanner (treeNode) {
    let cacheDocs = null

    return function () {
        if (cacheDocs) {
            return cacheDocs
        }

        const docs = []
        let curNode
        const list = [ { node: treeNode, docs: docs } ]
        while ((curNode = list.shift())) {
            const { node, docs } = curNode
            let docItem
            if (node.fieldKey) {
                docs.push(docItem = { key: node.fieldKey, ...documentParser(node.document) })
            }

            if (node.fields) {
                list.push(...node.fields.map(item => ({ node: item, docs })))
            } else if (node.childNode) {
                list.push({ node: node.childNode, docs: docItem.children = [] })
            }
        }

        return (cacheDocs = docs)
    }
}

function documentParser (document) {
    if (!document) {
        return null
    }

    let flag // 文档操作类型：{'+':'新增的', '-':'删除的', '?':'存在疑问的', '!':'建议修改的'}
    let types // 字段数据类型
    let description// 字段描述
    document.replace(parserRegexp, (all, matchFlag = null, matchTypes, isMulti, matchDescription) => {
        flag = matchFlag
        types = (isMulti ? matchTypes.slice(1, -1) : matchTypes).split(/,\s*/).map(el => shortTypes[el] || el)
        description = matchDescription.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    })

    return { flag, types, description }
}
