"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const parse_1 = require("./parse");
const formatter_1 = require("./formatter");
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
// 关键：TextDocuments<TextDocument>
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
const cache = new Map();
function getParse(doc) {
    const c = cache.get(doc.uri);
    if (c && c.version === doc.version)
        return c.res;
    const res = (0, parse_1.parse)(doc.getText());
    cache.set(doc.uri, { res, version: doc.version });
    return res;
}
// -------------- 初始化 -------------------
connection.onInitialize(() => {
    return {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
            // 下面三项务必顶格写在 capabilities 里
            documentFormattingProvider: true,
            definitionProvider: true,
            hoverProvider: true
        }
    };
});
// -------------- 诊断 ---------------------
documents.onDidChangeContent(({ document }) => {
    const { errors } = getParse(document);
    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics: errors.map(e => ({
            range: {
                start: document.positionAt(e.range[0]),
                end: document.positionAt(e.range[1]),
            },
            severity: node_1.DiagnosticSeverity.Error,
            message: e.message,
        })),
    });
});
// -------------- 跳转到定义 -----------------
connection.onDefinition((params) => {
    const doc = documents.get(params.textDocument.uri);
    const off = doc.offsetAt(params.position);
    const { ast, symbols } = getParse(doc);
    const id = findIdentifier(ast, off);
    if (id) {
        const def = symbols.get(id.name);
        if (def) {
            return toLoc(doc, def.range);
        }
    }
    // ⇣⇣⇣ ① 如果前面没找到节点，再做词法级回退 ⇣⇣⇣
    const word = getWordAt(doc.getText(), off);
    if (word && symbols.has(word)) {
        const def = symbols.get(word);
        return toLoc(doc, def.range);
    }
    return null;
});
// ---------- 工具函数（保持 findIdentifier 不变）----------
function toLoc(doc, r) {
    return node_1.Location.create(doc.uri, {
        start: doc.positionAt(r[0]),
        end: doc.positionAt(r[1]),
    });
}
/** 提取光标处连续的 [A‑Za‑z0‑9_.] 单词 */
function getWordAt(text, pos) {
    const re = /[\w.]/;
    let s = pos, e = pos;
    while (s > 0 && re.test(text[s - 1]))
        --s;
    while (e < text.length && re.test(text[e]))
        ++e;
    return s === e ? null : text.slice(s, e);
}
// -------------- 悬停 ----------------------
connection.onHover((params) => {
    const doc = documents.get(params.textDocument.uri);
    const off = doc.offsetAt(params.position);
    const { ast } = getParse(doc);
    const n = findIdentifier(ast, off);
    return n ? { contents: `\`${n.name}\`` } : null;
});
// -------------- 格式化 --------------------
connection.onDocumentFormatting(({ textDocument }) => {
    const doc = documents.get(textDocument.uri);
    const newText = (0, formatter_1.formatDoc)(doc.getText());
    return [{
            range: {
                start: { line: 0, character: 0 },
                end: { line: doc.lineCount, character: 0 }
            },
            newText,
        }];
});
function findIdentifier(nodes, off) {
    for (const n of nodes) {
        if (n.range[0] <= off && off <= n.range[1]) {
            // ① 允许跳转的节点：type 与 rpc
            if (n.kind === 'type' || n.kind === 'rpc') {
                return n;
            }
            // ② 其他节点（session / field）→ 深入子节点继续找
            if (n.children) {
                const hit = findIdentifier(n.children, off);
                if (hit)
                    return hit;
            }
        }
    }
    return undefined;
}
documents.listen(connection);
connection.listen();
//# sourceMappingURL=index.js.map