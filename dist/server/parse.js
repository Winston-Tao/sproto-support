"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
const reType = /^\s*\.(\w[\w\d_.]*)\s*\{$/;
const reRpc = /^\s*(\w[\w\d_]*)\s+(\d+)\s*\{$/;
const reSess = /^\s*(request|response)\s*(\{)?/; // “request {” / “response {”
//           ┌──5──┐ ┌───6───┐      ┌─────7 (comment)────┐
const reField = /^\s*(\w[\w\d_]*)\s+(\d+)\s*:\s*(\*?)(\w[\w\d_.]*)(?:\s*\(\s*([^\)]*)\s*\))?(?:\s*#\s*(.*))?/;
function parse(text) {
    const ast = [];
    const symbols = new Map();
    const errors = [];
    const rpcIdMap = new Map(); // 检测 RPC 号重复
    const stack = [];
    let offset = 0;
    text.split(/\r?\n/).forEach(line => {
        var _a, _b;
        const start = offset;
        const end = offset + line.length;
        const nlLen = text[end] === '\r' && text[end + 1] === '\n' ? 2 : 1;
        offset = end + nlLen;
        // ---- .Type ----------------------------------------------------------
        const mType = line.match(reType);
        if (mType) {
            const [, name] = mType;
            const n = { kind: 'type', name, range: [start, end], children: [] };
            symbols.set(name, n);
            push(n);
            return;
        }
        // ---- RPC ------------------------------------------------------------
        const mRpc = line.match(reRpc);
        if (mRpc) {
            const [, name, idStr] = mRpc;
            const id = +idStr;
            const n = { kind: 'rpc', name, tag: id, range: [start, end], children: [] };
            if (rpcIdMap.has(id))
                errors.push({ message: `协议号 ${id} 与 ${rpcIdMap.get(id).name} 重复`, range: [start, end] });
            else
                rpcIdMap.set(id, n);
            symbols.set(name, n);
            push(n);
            return;
        }
        // ---- request / response --------------------------------------------
        const mSess = line.match(reSess);
        if (mSess) {
            const [, which, brace] = mSess;
            if (brace === '{') { // 内联
                const n = { kind: 'session', name: which, range: [start, end], children: [] };
                push(n);
            }
            else { // 简写
                ((_b = (_a = stack.at(-1)) === null || _a === void 0 ? void 0 : _a.children) !== null && _b !== void 0 ? _b : ast).push({
                    kind: 'session',
                    name: which,
                    range: [start, end],
                    children: [],
                });
            }
            return;
        }
        // ---- 字段 -----------------------------------------------------------
        const mField = line.match(reField);
        if (mField) {
            const [, fname, tagStr, star, vtype, extra, cmt] = mField;
            const cur = stack.at(-1);
            if (!cur) {
                errors.push({ message: '字段必须放在结构体 / request / response 内', range: [start, end] });
                return;
            }
            const field = {
                kind: 'field',
                name: fname,
                tag: +tagStr,
                valueType: vtype,
                isArray: star === '*',
                range: [start, end],
            };
            if (extra !== undefined) {
                if (vtype === 'integer')
                    field.decimal = extra;
                else
                    field.key = extra; // map 主键
            }
            field.comment = cmt === null || cmt === void 0 ? void 0 : cmt.trim();
            cur.children.push(field);
            return;
        }
        // ---- 右括号收栈 ------------------------------------------------------
        if (/\}/.test(line))
            stack.pop();
    });
    return { ast, symbols, errors };
    function push(n) {
        var _a, _b;
        ((_b = (_a = stack.at(-1)) === null || _a === void 0 ? void 0 : _a.children) !== null && _b !== void 0 ? _b : ast).push(n);
        stack.push(n);
    }
}
//# sourceMappingURL=parse.js.map