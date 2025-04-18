"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDoc = formatDoc;
var parse_1 = require("./parse");
function formatDoc(text) {
    var ast = (0, parse_1.parse)(text).ast;
    var lines = [];
    ast.forEach(function (node) {
        var _a, _b;
        if (node.kind === 'type') {
            lines.push(".".concat(node.name, " {"));
            (_a = node.children) === null || _a === void 0 ? void 0 : _a.forEach(function (f) {
                lines.push("    ".concat(f.name.padEnd(16), " ").concat(String(f.tag).padEnd(4), " : ").concat(' '.repeat(1), "integer"));
            });
            lines.push('}\n');
        }
        else if (node.kind === 'rpc') {
            lines.push("".concat(node.name, " ").concat(node.tag, " {"));
            (_b = node.children) === null || _b === void 0 ? void 0 : _b.forEach(function (c) { return lines.push('    ' + sourceOf(c)); });
            lines.push('}\n');
        }
    });
    return lines.join('\n');
}
function sourceOf(n) { return '...'; } // 省略
