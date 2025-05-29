// ──────────── parse.ts ───────────────────────────────────────────
export interface Node {
    kind: 'type' | 'rpc' | 'session' | 'field'
    name: string
    tag?: number                 // field tag / rpc id
    range: [number, number]
    children?: Node[]
}

/** 字段节点额外信息 */
export interface FieldNode extends Node {
    kind: 'field'
    valueType: string            // integer / SceneInfo / ...
    isArray: boolean             // 是否带 * 号
    /** map 主键，如 (id) */
    key?: string
    /** integer(2) 里的 (2) */
    decimal?: string
    /** 行尾 # 注释文本（不含 #） */
    comment?: string
}

export interface ParseResult {
    ast: Node[]
    symbols: Map<string, Node>
    errors: { message: string; range: [number, number] }[]
}

const reType = /^\s*\.(\w[\w\d_.]*)\s*\{$/
const reRpc = /^\s*(\w[\w\d_]*)\s+(\d+)\s*\{$/
const reSess = /^\s*(request|response)\s*(\{)?/          // “request {” / “response {”

//           ┌──5──┐ ┌───6───┐      ┌─────7 (comment)────┐
const reField = /^\s*(\w[\w\d_]*)\s+(\d+)\s*:\s*(\*?)(\w[\w\d_.]*)(?:\s*\(\s*([^\)]*)\s*\))?(?:\s*#\s*(.*))?/



export function parse(text: string): ParseResult {
    const ast: Node[] = []
    const symbols = new Map<string, Node>()
    const errors: ParseResult['errors'] = []
    const rpcIdMap = new Map<number, Node>()         // 检测 RPC 号重复
    const stack: Node[] = []

    let offset = 0
    text.split(/\r?\n/).forEach(line => {
        const start = offset
        const end = offset + line.length
        const nlLen = text[end] === '\r' && text[end + 1] === '\n' ? 2 : 1
        offset = end + nlLen

        // ---- .Type ----------------------------------------------------------
        const mType = line.match(reType)
        if (mType) {
            const [, name] = mType
            const n: Node = { kind: 'type', name, range: [start, end], children: [] }
            symbols.set(name, n)
            push(n)
            return
        }

        // ---- RPC ------------------------------------------------------------
        const mRpc = line.match(reRpc)
        if (mRpc) {
            const [, name, idStr] = mRpc
            const id = +idStr
            const n: Node = { kind: 'rpc', name, tag: id, range: [start, end], children: [] }
            if (rpcIdMap.has(id))
                errors.push({ message: `协议号 ${id} 与 ${rpcIdMap.get(id)!.name} 重复`, range: [start, end] })
            else
                rpcIdMap.set(id, n)
            symbols.set(name, n)
            push(n)
            return
        }

        // ---- request / response --------------------------------------------
        const mSess = line.match(reSess)
        if (mSess) {
            const [, which, brace] = mSess
            if (brace === '{') { // 内联
                const n: Node = { kind: 'session', name: which, range: [start, end], children: [] }
                push(n)
            } else {             // 简写
                (stack.at(-1)?.children ?? ast).push({
                    kind: 'session',
                    name: which,
                    range: [start, end],
                    children: [],
                })
            }
            return
        }

        // ---- 字段 -----------------------------------------------------------
        const mField = line.match(reField)
        if (mField) {
            const [, fname, tagStr, star, vtype, extra, cmt] = mField
            const cur = stack.at(-1)
            if (!cur) {
                errors.push({ message: '字段必须放在结构体 / request / response 内', range: [start, end] })
                return
            }
            const field: FieldNode = {
                kind: 'field',
                name: fname,
                tag: +tagStr,
                valueType: vtype,
                isArray: star === '*',
                range: [start, end],
            }
            if (extra !== undefined) {
                if (vtype === 'integer') field.decimal = extra
                else field.key = extra  // map 主键
            }
            field.comment = cmt?.trim()
            cur.children!.push(field)
            return
        }

        // ---- 右括号收栈 ------------------------------------------------------
        if (/\}/.test(line)) stack.pop()
    })

    return { ast, symbols, errors }

    function push(n: Node) {
        (stack.at(-1)?.children ?? ast).push(n)
        stack.push(n)
    }
}
