"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
var path = require("path");
var node_1 = require("vscode-languageclient/node");
var client;
function activate(ctx) {
    var serverModule = ctx.asAbsolutePath(path.join('dist', 'server', 'index.js'));
    var serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: {
            module: serverModule, transport: node_1.TransportKind.ipc,
            options: { execArgv: ['--nolazy', '--inspect=6009'] }
        }
    };
    var clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'sproto' }],
    };
    client = new node_1.LanguageClient('sprotoLS', 'Sproto Language Server', serverOptions, clientOptions);
    client.start();
}
function deactivate() { return client === null || client === void 0 ? void 0 : client.stop(); }
