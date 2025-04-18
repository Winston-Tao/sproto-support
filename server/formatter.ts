// ──────────── formatter.ts ───────────────────────────────────────────────────────
import { parse, Node, FieldNode } from './parse';

const IND = (n = 1) => '    '.repeat(n);          // 4 空格 × n

/** 对齐字段列表（两级缩进） */
function fmtFields(fields: FieldNode[]): string {
    const maxName = Math.max(...fields.map(f => f.name.length));
    const maxTag = Math.max(...fields.map(f => String(f.tag).length));
    return fields.map(f => {
        const typeStr = f.isArray ? `*${f.valueType}` : f.valueType;
        return `${IND(2)}${f.name.padEnd(maxName)} ${String(f.tag).padEnd(maxTag)} : ${typeStr}`;
    }).join('\n');
}

export function formatDoc(src: string): string {
    // 1️⃣ 保存前后缀 return [[ / ]]
    const headMatch = src.match(/^\s*return\s*\[\[/);
    const tailMatch = src.match(/\]\]\s*$/);
    const head = headMatch ? headMatch[0] + '\n\n' : '';
    const tail = tailMatch ? '\n\n]]' : '';

    // 2️⃣ 去掉前后缀后解析
    const core = src.replace(/^\s*return\s*\[\[/, '').replace(/\]\]\s*$/, '');
    const { ast } = parse(core);

    // 3️⃣ 重新排版
    const out: string[] = [];

    for (const n of ast) {
        if (n.kind === 'type') {
            out.push(`.${n.name} {`);
            if (n.children?.length) out.push(fmtFields(n.children as FieldNode[]));
            out.push('}\n');
        }

        if (n.kind === 'rpc') {
            out.push(`${n.name} ${n.tag} {`);
            for (const sess of n.children ?? []) {
                out.push(`${IND()}${sess.name} {`);
                if (sess.children?.length) out.push(fmtFields(sess.children as FieldNode[]));
                out.push(`${IND()}}\n`);
            }
            out.push('}\n');
        }
    }

    // 4️⃣ 还原前后缀并返回
    return head + out.join('\n') + tail;
}
