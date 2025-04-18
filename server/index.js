"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_1 = require("vscode-languageserver/node");
var vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
var parse_1 = require("./parse");
var formatter_1 = require("./formatter");
var conn = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
var docs = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
var cache = new Map();
function get(doc) {
    var c = cache.get(doc.uri);
    if (c && c.version === doc.version)
        return c.ast;
    var ast = (0, parse_1.parse)(doc.getText());
    cache.set(doc.uri, { ast: ast, version: doc.version });
    return ast;
}
conn.onInitialize(function () { return ({
    capabilities: {
        textDocumentSync: node_1.TextDocumentSyncKind.Incremental,
        definitionProvider: true,
        hoverProvider: true,
        documentFormattingProvider: true
    }
}); });
docs.onDidChangeContent(function (_a) {
    var document = _a.document;
    var res = get(document);
    conn.sendDiagnostics({
        uri: document.uri,
        diagnostics: res.errors.map(function (e) { return ({
            range: {
                start: document.positionAt(e.range[0]),
                end: document.positionAt(e.range[1])
            },
            severity: node_1.DiagnosticSeverity.Error,
            message: e.message
        }); })
    });
});
conn.onDefinition(function (params) {
    var doc = docs.get(params.textDocument.uri);
    var posOffset = doc.offsetAt(params.position);
    var _a = get(doc), ast = _a.ast, symbols = _a.symbols;
    var idNode = findIdentifier(ast, posOffset);
    if (!idNode)
        return null;
    var def = symbols.get(idNode.name);
    if (!def)
        return null;
    return node_1.Location.create(doc.uri, { start: doc.positionAt(def.range[0]), end: doc.positionAt(def.range[1]) });
});
conn.onHover(function (params) {
    var doc = docs.get(params.textDocument.uri);
    var posOffset = doc.offsetAt(params.position);
    var ast = get(doc).ast;
    var node = findIdentifier(ast, posOffset);
    if (!node)
        return null;
    return { contents: "`".concat(node.name, "`") };
});
conn.onDocumentFormatting(function (_a) {
    var textDocument = _a.textDocument;
    var doc = docs.get(textDocument.uri);
    var formatted = (0, formatter_1.formatDoc)(doc.getText());
    return [{
            range: {
                start: { line: 0, character: 0 },
                end: { line: doc.lineCount, character: 0 }
            },
            newText: formatted
        }];
});
function findIdentifier(nodes, offset) {
    for (var _i = 0, nodes_1 = nodes; _i < nodes_1.length; _i++) {
        var n = nodes_1[_i];
        if (n.range[0] <= offset && offset <= n.range[1]) {
            if (n.kind === 'identifier' || n.kind === 'type' || n.kind === 'rpc')
                return n;
            if (n.children) {
                var r = findIdentifier(n.children, offset);
                if (r)
                    return r;
            }
        }
    }
}
docs.listen(conn);
conn.listen();
