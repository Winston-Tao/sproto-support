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
