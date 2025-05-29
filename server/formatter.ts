// ───────── formatter.ts ───────────────────────────────────────────
import { parse, FieldNode, Node as AstNode } from './parse'

// 4 空格缩进
const IND = (n = 1) => '    '.repeat(n)

// ───────── 字段格式化 ───────────────────────────────────────────────
function fmtFields(fields: FieldNode[], baseIndent = 2): string {
    if (fields.length === 0) return ''

    const maxName = Math.max(...fields.map(f => f.name.length))
    const maxTag = Math.max(...fields.map(f => String(f.tag).length))

    return fields.map(f => {
        const typeStr = f.isArray ? `*${f.valueType}` : f.valueType
        let extra = ''
        if (f.key) extra = `(${f.key})`
        if (f.decimal) extra = `(${f.decimal})`
        return `${IND(baseIndent)}${f.name.padEnd(maxName)} ${String(f.tag).padEnd(maxTag)} : ${typeStr}${extra}`
    }).join('\n')
}

// ───────── 递归打印 .Type ──────────────────────────────────────────
function emitType(n: AstNode, indent: number, out: string[]) {
    if (n.kind !== 'type') return
    out.push(`${IND(indent)}.${n.name} {`)
    const fields = (n.children ?? []).filter((c): c is FieldNode => c.kind === 'field')
    if (fields.length) out.push(fmtFields(fields, indent + 1))
    for (const sub of n.children ?? []) {
        if (sub.kind === 'type') emitType(sub, indent + 1, out)
    }
    out.push(`${IND(indent)}}\n`)
}

// ───────── 主入口 ─────────────────────────────────────────────────
export function formatDoc(src: string): string {
    // 1️⃣ 保留 return [[ / ]]
    const headMatch = src.match(/^\s*return\s*\[\[/)
    const tailMatch = src.match(/\]\]\s*$/)
    const head = headMatch ? headMatch[0] + '\n\n' : ''
    const tail = tailMatch ? '\n\n]]' : ''

    // 2️⃣ 去掉前后缀解析
    const core = src.replace(/^\s*return\s*\[\[/, '').replace(/\]\]\s*$/, '')
    const { ast } = parse(core)

    // 3️⃣ 重新排版
    const out: string[] = []

    for (const node of ast) {
        if (node.kind === 'type') {
            emitType(node, 0, out)
        }

        if (node.kind === 'rpc') {
            out.push(`${node.name} ${node.tag} {`)
            for (const sess of node.children ?? []) {
                out.push(`${IND()}${sess.name} {`)

                const fields = (sess.children ?? []).filter(
                    (c): c is FieldNode => c.kind === 'field'
                )
                if (fields.length) out.push(fmtFields(fields, 2))

                for (const sub of sess.children ?? []) {
                    if (sub.kind === 'type') emitType(sub, 2, out)
                }
                out.push(`${IND()}}\n`)
            }
            out.push('}\n')
        }
    }

    // 4️⃣ 还原前后缀
    return head + out.join('\n') + tail
}
