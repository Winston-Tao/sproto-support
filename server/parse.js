"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
function parse(text) {
    var lines = text.split(/\r?\n/);
    var symbols = new Map();
    var errors = [];
    var ast = [];
    var offset = 0;
    var typeRe = /^\s*\.(\w[\w\d_.]*)\s*\{$/;
    var rpcRe = /^\s*(\w[\w\d_]*)\s+(\d+)\s*\{$/;
    var fieldRe = /^\s*(\w[\w\d_]*)\s+(\d+)\s*:\s*(\*?)(\w[\w\d_.]*)/;
    var stack = [];
    lines.forEach(function (line, i) {
        var start = offset;
        var end = offset + line.length;
        offset += line.length + 1;
        if (typeRe.test(line)) {
            var _a = line.match(typeRe), name_1 = _a[1];
            var n = { kind: 'type', name: name_1, range: [start, end], children: [] };
            symbols.set(name_1, n);
            push(n);
            return;
        }
        if (rpcRe.test(line)) {
            var _b = line.match(rpcRe), name_2 = _b[1], tag = _b[2];
            var n = { kind: 'rpc', name: name_2, tag: +tag, range: [start, end], children: [] };
            symbols.set(name_2, n);
            push(n);
            return;
        }
        if (fieldRe.test(line)) {
            var _c = line.match(fieldRe), fname = _c[1], tag = _c[2], ftype = _c[4];
            var cur = stack.at(-1);
            if (!cur) {
                addErr('字段必须放在结构体或 RPC 内');
                return;
            }
            var n = { kind: 'field', name: fname, tag: +tag, range: [start, end] };
            cur.children.push(n);
            return;
        }
        if (/\}/.test(line)) {
            stack.pop();
            return;
        }
    });
    return { ast: ast, symbols: symbols, errors: errors };
    function push(n) { var _a, _b; ((_b = (_a = stack.at(-1)) === null || _a === void 0 ? void 0 : _a.children) !== null && _b !== void 0 ? _b : ast).push(n); stack.push(n); }
    function addErr(msg) { errors.push({ message: msg, range: [1, 1] }); }
}
;
