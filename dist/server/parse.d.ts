export interface Node {
    kind: 'type' | 'rpc' | 'session' | 'field';
    name: string;
    tag?: number;
    range: [number, number];
    children?: Node[];
}
/** 字段节点额外信息 */
export interface FieldNode extends Node {
    kind: 'field';
    valueType: string;
    isArray: boolean;
    /** map 主键，如 (id) */
    key?: string;
    /** integer(2) 里的 (2) */
    decimal?: string;
    /** 行尾 # 注释文本（不含 #） */
    comment?: string;
}
export interface ParseResult {
    ast: Node[];
    symbols: Map<string, Node>;
    errors: {
        message: string;
        range: [number, number];
    }[];
}
export declare function parse(text: string): ParseResult;
