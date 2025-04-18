"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDoc = formatDoc;
// ──────────── formatter.ts ───────────────────────────────────────────────────────
const parse_1 = require("./parse");
const IND = (n = 1) => '    '.repeat(n); // 4 空格 × n
/** 对齐字段列表（两级缩进） */
function fmtFields(fields) {
    const maxName = Math.max(...fields.map(f => f.name.length));
    const maxTag = Math.max(...fields.map(f => String(f.tag).length));
    return fields.map(f => {
        const typeStr = f.isArray ? `*${f.valueType}` : f.valueType;
        return `${IND(2)}${f.name.padEnd(maxName)} ${String(f.tag).padEnd(maxTag)} : ${typeStr}`;
    }).join('\n');
}
function formatDoc(src) {
    var _a, _b, _c;
    // 1️⃣ 保存前后缀 return [[ / ]]
    const headMatch = src.match(/^\s*return\s*\[\[/);
    const tailMatch = src.match(/\]\]\s*$/);
    const head = headMatch ? headMatch[0] + '\n\n' : '';
    const tail = tailMatch ? '\n\n]]' : '';
    // 2️⃣ 去掉前后缀后解析
    const core = src.replace(/^\s*return\s*\[\[/, '').replace(/\]\]\s*$/, '');
    const { ast } = (0, parse_1.parse)(core);
    // 3️⃣ 重新排版
    const out = [];
    for (const n of ast) {
        if (n.kind === 'type') {
            out.push(`.${n.name} {`);
            if ((_a = n.children) === null || _a === void 0 ? void 0 : _a.length)
                out.push(fmtFields(n.children));
            out.push('}\n');
        }
        if (n.kind === 'rpc') {
            out.push(`${n.name} ${n.tag} {`);
            for (const sess of (_b = n.children) !== null && _b !== void 0 ? _b : []) {
                out.push(`${IND()}${sess.name} {`);
                if ((_c = sess.children) === null || _c === void 0 ? void 0 : _c.length)
                    out.push(fmtFields(sess.children));
                out.push(`${IND()}}\n`);
            }
            out.push('}\n');
        }
    }
    // 4️⃣ 还原前后缀并返回
    return head + out.join('\n') + tail;
}
//# sourceMappingURL=formatter.js.map