// ──────────── parse.ts ───────────────────────────────────────────────────────────
export interface Node {
    kind: 'type' | 'rpc' | 'session' | 'field';
    name: string;
    tag?: number;                           // field tag 或 rpc id
    range: [number, number];
    children?: Node[];
}

/** 字段节点额外信息 */
export interface FieldNode extends Node {
    kind: 'field';
    valueType: string;                     // integer / SceneInfo / ...
    isArray: boolean;                      // 是否带 * 号
}

export interface ParseResult {
    ast: Node[];
    symbols: Map<string, Node>;            // 类型 / RPC 名 → 定义
    errors: { message: string; range: [number, number] }[];
}

const reType = /^\s*\.(\w[\w\d_.]*)\s*\{$/;
const reRpc = /^\s*(\w[\w\d_]*)\s+(\d+)\s*\{$/;
const reSess = /^\s*(request|response)\s*(\{)?/;          // “request {” / “response {”
const reField = /^\s*(\w[\w\d_]*)\s+(\d+)\s*:\s*(\*?)(\w[\w\d_.]*)/;

export function parse(text: string): ParseResult {
    const ast: Node[] = [];
    const symbols = new Map<string, Node>();
    const errors: ParseResult['errors'] = [];
    const rpcIdMap = new Map<number, Node>();                // 检测 RPC 号重复
    const stack: Node[] = [];

    let offset = 0;
    text.split(/\r?\n/).forEach(line => {
        const start = offset;
        const end = offset + line.length;
        const newlineLen =
            text[end] === '\r' && text[end + 1] === '\n' ? 2 : 1;
        offset = end + newlineLen;

        // ---- .Type ---------------------------------------------------------------
        const mType = line.match(reType);
        if (mType) {
            const [, name] = mType;
            const n: Node = { kind: 'type', name, range: [start, end], children: [] };
            symbols.set(name, n);
            push(n);
            return;
        }

        // ---- RPC -----------------------------------------------------------------
        const mRpc = line.match(reRpc);
        if (mRpc) {
            const [, name, idStr] = mRpc;
            const id = +idStr;
            const n: Node = { kind: 'rpc', name, tag: id, range: [start, end], children: [] };
            if (rpcIdMap.has(id))
                errors.push({ message: `协议号 ${id} 与 ${rpcIdMap.get(id)!.name} 重复`, range: [start, end] });
            else
                rpcIdMap.set(id, n);

            symbols.set(name, n);
            push(n);
            return;
        }

        // ---- request / response --------------------------------------------------
        const mSess = line.match(reSess);
        if (mSess) {
            const [, which, brace] = mSess;
            if (brace === '{') {                                  // 内联块
                const n: Node = { kind: 'session', name: which, range: [start, end], children: [] };
                push(n);
            } else {                                              // 简写：request MyReq
                (stack.at(-1)?.children ?? ast).push({
                    kind: 'session',
                    name: which,
                    range: [start, end],
                    children: [],
                });
            }
            return;
        }

        // ---- 字段 ----------------------------------------------------------------
        const mField = line.match(reField);
        if (mField) {
            const [, fname, tagStr, star, vtype] = mField;
            const cur = stack.at(-1);
            if (!cur) {
                errors.push({ message: '字段必须放在结构体 / request / response 内', range: [start, end] });
                return;
            }
            const field: FieldNode = {
                kind: 'field',
                name: fname,
                tag: +tagStr,
                valueType: vtype,
                isArray: star === '*',
                range: [start, end],
            };
            cur.children!.push(field);
            return;
        }

        // ---- 右括号收栈 -----------------------------------------------------------
        if (/\}/.test(line)) stack.pop();
    });

    return { ast, symbols, errors };

    function push(n: Node) {
        (stack.at(-1)?.children ?? ast).push(n);
        stack.push(n);
    }
}
