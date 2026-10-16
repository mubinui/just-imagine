import { parse, type Node, type Program } from 'acorn';
import { ALLOWED_GLOBALS, ALLOWED_CONSOLE_MEMBERS } from './api';
import { BUDGETS } from './budgets';

export type IssueCode =
  | 'too-large'
  | 'syntax'
  | 'import'
  | 'export'
  | 'dynamic-import'
  | 'top-level-this'
  | 'forbidden-identifier'
  | 'forbidden-member'
  | 'free-identifier'
  | 'infinite-loop';

export interface ScriptIssue {
  code: IssueCode;
  message: string;
  line: number;
}

export type CheckResult =
  | { ok: true; warnings: ScriptIssue[] }
  | { ok: false; errors: ScriptIssue[]; warnings: ScriptIssue[] };

/** Value properties of the global object that every script may read. */
const LITERAL_GLOBALS = new Set(['undefined', 'NaN', 'Infinity']);

const TIMER_HINT = 'is not available; use game.after or game.every instead';
const FORBIDDEN: Record<string, string> = {
  eval: 'is not available in a game script',
  Function: 'is not available in a game script',
  globalThis: 'is not reachable from a game script',
  self: 'is not reachable from a game script',
  window: 'is not reachable from a game script',
  global: 'is not reachable from a game script',
  document: 'is not reachable from a game script',
  setTimeout: TIMER_HINT,
  setInterval: TIMER_HINT,
  setImmediate: TIMER_HINT,
  queueMicrotask: TIMER_HINT,
  requestAnimationFrame: TIMER_HINT,
  postMessage: 'is not available; the game talks to the stage through game.*',
  importScripts: 'is not available in a game script',
  MessageChannel: 'is not available in a game script',
  BroadcastChannel: 'is not available in a game script',
  Worker: 'is not available in a game script',
  SharedWorker: 'is not available in a game script',
  fetch: 'is not available; a game script cannot use the network',
  XMLHttpRequest: 'is not available; a game script cannot use the network',
  WebSocket: 'is not available; a game script cannot use the network',
  EventSource: 'is not available; a game script cannot use the network',
  navigator: 'is not available; a game script cannot use the network',
  location: 'is not available in a game script',
  indexedDB: 'is not available; a game script cannot use storage',
  caches: 'is not available; a game script cannot use storage',
  localStorage: 'is not available; a game script cannot use storage',
  sessionStorage: 'is not available; a game script cannot use storage',
  Atomics: 'is not available in a game script',
  SharedArrayBuffer: 'is not available in a game script',
  WebAssembly: 'is not available in a game script',
  require: 'is not available in a game script',
  process: 'is not available in a game script',
  module: 'is not available in a game script',
  exports: 'is not available in a game script',
  Buffer: 'is not available in a game script',
};

const FORBIDDEN_MEMBERS = new Set(['constructor', '__proto__', 'prototype']);

interface Scope {
  names: Set<string>;
}

type AnyNode = Node & Record<string, unknown>;

function isNode(value: unknown): value is AnyNode {
  return typeof value === 'object' && value !== null && typeof (value as Node).type === 'string';
}

function parseSource(source: string): Program {
  return parse(source, {
    ecmaVersion: 2022,
    sourceType: 'module',
    locations: true,
    allowHashBang: false,
    allowReturnOutsideFunction: false,
  });
}

function lineOf(node: Node): number {
  return node.loc?.start.line ?? 1;
}

/** Names bound by a destructuring or simple pattern. */
function patternNames(node: unknown, out: Set<string>): void {
  if (!isNode(node)) return;
  switch (node.type) {
    case 'Identifier':
      out.add(node.name as string);
      break;
    case 'ObjectPattern':
      for (const p of node.properties as AnyNode[])
        patternNames(p.type === 'RestElement' ? p.argument : p.value, out);
      break;
    case 'ArrayPattern':
      for (const e of node.elements as (AnyNode | null)[]) if (e) patternNames(e, out);
      break;
    case 'RestElement':
      patternNames(node.argument, out);
      break;
    case 'AssignmentPattern':
      patternNames(node.left, out);
      break;
  }
}

/** `var` declarations anywhere below `node` without crossing a function boundary. */
function collectVars(node: unknown, out: Set<string>): void {
  if (Array.isArray(node)) {
    for (const child of node) collectVars(child, out);
    return;
  }
  if (!isNode(node)) return;
  switch (node.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
    case 'ClassDeclaration':
    case 'ClassExpression':
      return;
    case 'VariableDeclaration':
      if (node.kind === 'var')
        for (const d of node.declarations as AnyNode[]) patternNames(d.id, out);
      return;
  }
  for (const key of Object.keys(node)) {
    if (key === 'loc' || key === 'type') continue;
    const value = node[key];
    if (Array.isArray(value) || isNode(value)) collectVars(value, out);
  }
}

/** `let`, `const`, `class` and `function` declarations directly in a statement list. */
function collectLexical(statements: unknown[], out: Set<string>): void {
  for (const s of statements) {
    if (!isNode(s)) continue;
    if (s.type === 'VariableDeclaration' && s.kind !== 'var')
      for (const d of s.declarations as AnyNode[]) patternNames(d.id, out);
    else if ((s.type === 'ClassDeclaration' || s.type === 'FunctionDeclaration') && isNode(s.id))
      out.add(s.id.name as string);
  }
}

/** Whether a loop body can leave the loop with `break` or `return`. */
function canExitLoop(body: unknown, depth = 0): boolean {
  if (Array.isArray(body)) return body.some((b) => canExitLoop(b, depth));
  if (!isNode(body)) return false;
  switch (body.type) {
    case 'BreakStatement':
      return depth === 0 || body.label != null;
    case 'ReturnStatement':
    case 'ThrowStatement':
      return true;
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'ArrowFunctionExpression':
    case 'ClassDeclaration':
    case 'ClassExpression':
      return false;
    case 'WhileStatement':
    case 'DoWhileStatement':
    case 'ForStatement':
    case 'ForInStatement':
    case 'ForOfStatement':
    case 'SwitchStatement':
      depth += 1;
      break;
  }
  for (const key of Object.keys(body)) {
    if (key === 'loc' || key === 'type') continue;
    const value = body[key];
    if ((Array.isArray(value) || isNode(value)) && canExitLoop(value, depth)) return true;
  }
  return false;
}

class Checker {
  readonly errors: ScriptIssue[] = [];
  readonly warnings: ScriptIssue[] = [];
  private scopes: Scope[] = [];
  /** Whether `this` currently refers to the script's top level. */
  private topLevelThis = true;

  private error(code: IssueCode, message: string, node: Node): void {
    this.errors.push({ code, message, line: lineOf(node) });
  }

  private declared(name: string): boolean {
    return this.scopes.some((s) => s.names.has(name));
  }

  private withScope(names: Set<string>, fn: () => void): void {
    this.scopes.push({ names });
    fn();
    this.scopes.pop();
  }

  private withThis(topLevel: boolean, fn: () => void): void {
    const previous = this.topLevelThis;
    this.topLevelThis = topLevel;
    fn();
    this.topLevelThis = previous;
  }

  /** Checks an identifier used as a binding (declaration) or a reference. */
  private identifier(node: AnyNode, binding: boolean): void {
    const name = node.name as string;
    const reason = FORBIDDEN[name];
    if (reason !== undefined) {
      this.error('forbidden-identifier', `'${name}' ${reason}`, node);
      return;
    }
    if (binding || this.declared(name) || LITERAL_GLOBALS.has(name)) return;
    if (name === 'console') {
      this.error('forbidden-member', `'console' may only be used as console.log`, node);
      return;
    }
    if (ALLOWED_GLOBALS.has(name)) return;
    this.error(
      'free-identifier',
      `'${name}' is not declared in the script and is not part of the Game API`,
      node,
    );
  }

  /** Visits a pattern in binding position: identifiers declare, defaults and computed keys are expressions. */
  private pattern(node: unknown): void {
    if (!isNode(node)) return;
    switch (node.type) {
      case 'Identifier':
        this.identifier(node, true);
        return;
      case 'ObjectPattern':
        for (const p of node.properties as AnyNode[]) {
          if (p.type === 'RestElement') this.pattern(p.argument);
          else {
            if (p.computed) this.visit(p.key);
            else this.propertyKey(p.key as AnyNode);
            this.pattern(p.value);
          }
        }
        return;
      case 'ArrayPattern':
        for (const e of node.elements as (AnyNode | null)[]) if (e) this.pattern(e);
        return;
      case 'RestElement':
        this.pattern(node.argument);
        return;
      case 'AssignmentPattern':
        this.pattern(node.left);
        this.visit(node.right);
        return;
      default:
        this.visit(node);
    }
  }

  /** Non-computed property keys are names, not references, but `__proto__` is still a hole. */
  private propertyKey(key: AnyNode): void {
    const name = key.type === 'Identifier' ? (key.name as string) : (key.value as unknown);
    if (name === '__proto__')
      this.error('forbidden-member', `'__proto__' may not be used as a property key`, key);
  }

  private memberName(node: AnyNode): string | undefined {
    const property = node.property as AnyNode;
    if (!node.computed)
      return property.type === 'Identifier' ? (property.name as string) : undefined;
    if (property.type === 'Literal' && typeof property.value === 'string') return property.value;
    return undefined;
  }

  private functionLike(node: AnyNode): void {
    const names = new Set<string>();
    if (node.type === 'FunctionExpression' && isNode(node.id)) names.add(node.id.name as string);
    for (const p of node.params as AnyNode[]) patternNames(p, names);
    const body = node.body as AnyNode;
    if (body.type === 'BlockStatement') {
      collectVars(body.body, names);
      collectLexical(body.body as unknown[], names);
    }
    const arrow = node.type === 'ArrowFunctionExpression';
    this.withScope(names, () =>
      this.withThis(arrow ? this.topLevelThis : false, () => {
        for (const p of node.params as AnyNode[]) this.pattern(p);
        if (body.type === 'BlockStatement') this.statements(body.body as unknown[]);
        else this.visit(body);
      }),
    );
  }

  private statements(list: unknown[]): void {
    for (const s of list) this.visit(s);
  }

  private block(statements: unknown[]): void {
    const names = new Set<string>();
    collectLexical(statements, names);
    this.withScope(names, () => this.statements(statements));
  }

  private loopWarning(node: AnyNode, forever: boolean): void {
    if (forever && !canExitLoop(node.body))
      this.warnings.push({
        code: 'infinite-loop',
        message: 'this loop never ends: add a break or use game.every for repeating work',
        line: lineOf(node),
      });
  }

  visit(node: unknown): void {
    if (Array.isArray(node)) {
      for (const child of node) this.visit(child);
      return;
    }
    if (!isNode(node)) return;
    switch (node.type) {
      case 'Program': {
        const names = new Set<string>();
        collectVars(node.body, names);
        collectLexical(node.body as unknown[], names);
        this.withScope(names, () => this.statements(node.body as unknown[]));
        return;
      }
      case 'ImportDeclaration':
        this.error('import', 'import is not allowed in a game script', node);
        return;
      case 'ExportNamedDeclaration':
      case 'ExportDefaultDeclaration':
      case 'ExportAllDeclaration':
        this.error('export', 'export is not allowed in a game script', node);
        return;
      case 'ImportExpression':
        this.error('dynamic-import', 'import() is not allowed in a game script', node);
        return;
      case 'MetaProperty':
        if ((node.meta as AnyNode).name === 'import')
          this.error('dynamic-import', 'import.meta is not allowed in a game script', node);
        return;
      case 'ThisExpression':
        if (this.topLevelThis)
          this.error(
            'top-level-this',
            `'this' at the top level of a game script is not allowed`,
            node,
          );
        return;
      case 'Identifier':
        this.identifier(node, false);
        return;
      case 'FunctionDeclaration':
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        this.functionLike(node);
        return;
      case 'ClassDeclaration':
        this.visit(node.superClass);
        this.withThis(false, () => this.visit(node.body));
        return;
      case 'ClassExpression': {
        const names = new Set<string>();
        if (isNode(node.id)) names.add(node.id.name as string);
        this.withScope(names, () => {
          this.visit(node.superClass);
          this.withThis(false, () => this.visit(node.body));
        });
        return;
      }
      case 'MethodDefinition':
      case 'PropertyDefinition':
        if (node.computed) this.visit(node.key);
        else this.propertyKey(node.key as AnyNode);
        this.visit(node.value);
        return;
      case 'StaticBlock':
        this.withThis(false, () => this.block(node.body as unknown[]));
        return;
      case 'BlockStatement':
        this.block(node.body as unknown[]);
        return;
      case 'SwitchStatement': {
        this.visit(node.discriminant);
        const cases = node.cases as AnyNode[];
        const names = new Set<string>();
        for (const c of cases) collectLexical(c.consequent as unknown[], names);
        this.withScope(names, () => {
          for (const c of cases) {
            this.visit(c.test);
            this.statements(c.consequent as unknown[]);
          }
        });
        return;
      }
      case 'ForStatement': {
        const names = new Set<string>();
        const init = node.init as AnyNode | null;
        if (init?.type === 'VariableDeclaration' && init.kind !== 'var')
          for (const d of init.declarations as AnyNode[]) patternNames(d.id, names);
        this.loopWarning(node, node.test == null);
        this.withScope(names, () => {
          this.visit(node.init);
          this.visit(node.test);
          this.visit(node.update);
          this.visit(node.body);
        });
        return;
      }
      case 'ForInStatement':
      case 'ForOfStatement': {
        const names = new Set<string>();
        const left = node.left as AnyNode;
        if (left.type === 'VariableDeclaration' && left.kind !== 'var')
          for (const d of left.declarations as AnyNode[]) patternNames(d.id, names);
        this.withScope(names, () => {
          if (left.type === 'VariableDeclaration') this.visit(left);
          else this.visit(left);
          this.visit(node.right);
          this.visit(node.body);
        });
        return;
      }
      case 'WhileStatement':
      case 'DoWhileStatement': {
        const test = node.test as AnyNode;
        this.loopWarning(node, test.type === 'Literal' && test.value === true);
        this.visit(node.test);
        this.visit(node.body);
        return;
      }
      case 'CatchClause': {
        const names = new Set<string>();
        patternNames(node.param, names);
        this.withScope(names, () => {
          this.pattern(node.param);
          this.visit(node.body);
        });
        return;
      }
      case 'VariableDeclarator':
        this.pattern(node.id);
        this.visit(node.init);
        return;
      case 'AssignmentPattern':
        this.visit(node.left);
        this.visit(node.right);
        return;
      case 'LabeledStatement':
        this.visit(node.body);
        return;
      case 'BreakStatement':
      case 'ContinueStatement':
        return;
      case 'Property': {
        if (node.computed) this.visit(node.key);
        else this.propertyKey(node.key as AnyNode);
        this.visit(node.value);
        return;
      }
      case 'MemberExpression': {
        const object = node.object as AnyNode;
        const name = this.memberName(node);
        if (name !== undefined && FORBIDDEN_MEMBERS.has(name))
          this.error('forbidden-member', `'.${name}' may not be accessed in a game script`, node);
        if (
          object.type === 'Identifier' &&
          object.name === 'console' &&
          !this.declared('console')
        ) {
          if (name === undefined || !ALLOWED_CONSOLE_MEMBERS.has(name))
            this.error('forbidden-member', `'console' may only be used as console.log`, node);
        } else this.visit(object);
        if (node.computed) this.visit(node.property);
        return;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'type') continue;
      const value = node[key];
      if (Array.isArray(value) || isNode(value)) this.visit(value);
    }
  }
}

function syntaxIssue(error: unknown): ScriptIssue {
  const e = error as { message?: string; loc?: { line?: number } };
  const message = String(e.message ?? error).replace(/\s*\(\d+:\d+\)\s*$/, '');
  return { code: 'syntax', message, line: e.loc?.line ?? 1 };
}

/**
 * Parses a game script with acorn (ECMAScript 2022, module grammar so strict
 * mode is in force) and rejects everything the sandbox would not allow.
 */
export function checkScript(source: string): CheckResult {
  const bytes = new TextEncoder().encode(source).length;
  if (bytes > BUDGETS.maxSourceBytes) {
    const kb = (bytes / 1024).toFixed(1);
    return {
      ok: false,
      errors: [
        {
          code: 'too-large',
          message: `the script is ${kb} KB; the limit is ${BUDGETS.maxSourceBytes / 1024} KB`,
          line: 1,
        },
      ],
      warnings: [],
    };
  }
  let program: Program;
  try {
    program = parseSource(source);
  } catch (error) {
    return { ok: false, errors: [syntaxIssue(error)], warnings: [] };
  }
  const checker = new Checker();
  checker.visit(program);
  if (checker.errors.length > 0)
    return { ok: false, errors: checker.errors, warnings: checker.warnings };
  return { ok: true, warnings: checker.warnings };
}

/** The `game.<method>` calls that appear anywhere in the script. Empty when it does not parse. */
export function scanApiCalls(source: string): Set<string> {
  const calls = new Set<string>();
  let program: Program;
  try {
    program = parseSource(source);
  } catch {
    return calls;
  }
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const child of node) walk(child);
      return;
    }
    if (!isNode(node)) return;
    if (node.type === 'CallExpression') {
      const callee = node.callee as AnyNode;
      if (callee.type === 'MemberExpression' && !callee.computed) {
        const object = callee.object as AnyNode;
        const property = callee.property as AnyNode;
        if (
          object.type === 'Identifier' &&
          object.name === 'game' &&
          property.type === 'Identifier'
        )
          calls.add(property.name as string);
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'loc' || key === 'type') continue;
      walk(node[key]);
    }
  };
  walk(program);
  return calls;
}
