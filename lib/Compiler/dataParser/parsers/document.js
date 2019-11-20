const parserRegexp = [
    /^\/\/\/\s+/, // beginToken
    /(?:([-+?!])\s+)?/, // matchFlag
    /((\[)[\w,\s]+\]|[\w,]+)\s+/, // matchTypes, isMulti
    /(.+)/, // matchDescription
].map(item => item.source).join('')
const shortTypes = { n: 'null', s: 'string', l: 'long', f: 'float', b: 'boolean', a: 'array', m: 'map' }

module.exports = function documentParser (document) {
    let flag // 文档操作类型：{'+':'新增的', '-':'删除的', '?':'存在疑问的', '!':'建议修改的'}
    let types // 字段数据类型
    let description // 字段描述

    document.replace(parserRegexp, (all, matchFlag, matchTypes, isMulti, matchDescription) => {
        flag = matchFlag
        types = (isMulti ? matchTypes.slice(1, -1) : matchTypes).split(/,\s*/).map(el => shortTypes[el] || el)
        description = matchDescription.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    })

    return types ? [ '["', types.join('", "'), '"], "', description, '", "', flag, '"' ].join('') : null
}
