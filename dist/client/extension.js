"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const path = require("path");
const node_1 = require("vscode-languageclient/node");
let client;
function activate(ctx) {
    const serverModule = ctx.asAbsolutePath(path.join('dist', 'server', 'index.js'));
    const serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: {
            module: serverModule, transport: node_1.TransportKind.ipc,
            options: { execArgv: ['--nolazy', '--inspect=6009'] }
        }
    };
    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'sproto' }],
    };
    client = new node_1.LanguageClient('sprotoLS', 'Sproto Language Server', serverOptions, clientOptions);
    client.start();
}
function deactivate() {
    return client === null || client === void 0 ? void 0 : client.stop();
}
//# sourceMappingURL=extension.js.map