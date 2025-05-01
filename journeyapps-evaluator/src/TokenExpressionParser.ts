import * as babelParser from '@babel/parser';
import { Node } from '@babel/types';
import { memoize } from 'lodash';
import LRUCache from 'lru-cache';
import { FormatStringContextFactory } from './context/FormatStringContext';
import { FunctionExpressionContextFactory } from './context/FunctionExpressionContext';
import { ParseContext, ParseContextFactory } from './context/ParseContext';
import {
  AbstractExpressionParser,
  ArrayExpressionParserFactory,
  BlockStatementParserFactory,
  CallExpressionParserFactory,
  ConditionalExpressionParserFactory,
  ExpressionNodeParserFactory,
  ExpressionParserFactory,
  IdentifierExpressionParserFactory,
  LiteralExpressionParserFactory,
  LogicalExpressionParserFactory,
  MemberExpressionParserFactory,
  NodeType,
  ObjectExpressionParserFactory
} from './parsers';
import { FallbackExpressionParser } from './parsers/FallbackExpressionParser';
import { TokenExpression } from './token-expressions';

export interface TokenExpressionParseEvent {
  source: string;
  context?: ParseContext;
}

export interface ParseNodeEvent<N extends Node = Node> extends TokenExpressionParseEvent {
  node: N;
}

export class TokenExpressionParser {
  cache: LRUCache<string, TokenExpression>;
  parserFactories: ExpressionParserFactory[];
  contextFactories: ParseContextFactory[];

  static instance: TokenExpressionParser;
  static get(): TokenExpressionParser {
    if (!this.instance) {
      this.instance = new TokenExpressionParser();
    }
    return this.instance;
  }

  constructor() {
    this.cache = new LRUCache({ max: 1000 });

    // Parser factories
    this.parserFactories = [];
    this.registerParserFactory(new ArrayExpressionParserFactory());
    this.registerParserFactory(new BlockStatementParserFactory());
    this.registerParserFactory(new CallExpressionParserFactory());
    this.registerParserFactory(new ConditionalExpressionParserFactory());
    this.registerParserFactory(new IdentifierExpressionParserFactory());
    this.registerParserFactory(new ExpressionNodeParserFactory());
    this.registerParserFactory(new LogicalExpressionParserFactory());
    this.registerParserFactory(new LiteralExpressionParserFactory());
    this.registerParserFactory(new MemberExpressionParserFactory());
    this.registerParserFactory(new ObjectExpressionParserFactory());

    // ParseContext factories
    this.contextFactories = [];
    this.registerContextFactory(new FunctionExpressionContextFactory());
    this.registerContextFactory(new FormatStringContextFactory());
  }

  // TODO: Better lifecycle control and dispose it afterwards
  parse<T extends TokenExpression = TokenExpression>(event: TokenExpressionParseEvent): T | null {
    if (event.source.trim() === '') {
      return null;
    }
    if (!event.context) {
      event.context = this.inferContext(event.source);
    }
    const source = this.transformSource(event);

    if (this.cache.has(source)) {
      return this.cache.get(source) as T;
    }

    const { program, errors } = babelParser.parse(source, {
      errorRecovery: true,
      allowAwaitOutsideFunction: true,
      allowReturnOutsideFunction: true
    });
    if (errors?.length > 0) {
      console.warn(`[TokenExpressionParser] Error parsing source: ${source}`, errors);
    }
    const node = program.body[0] ?? program.directives[0];
    const parsed = this.parseNode({ node, source: source, context: event.context });
    this.cache.set(source, parsed);

    return parsed as T;
  }

  parseNode(event: ParseNodeEvent): TokenExpression | null {
    const parser = this.getParser(event.node.type);
    return parser.parse({ ...event, parseNode: this.parseNode.bind(this) });
  }

  registerParserFactory(factory: ExpressionParserFactory) {
    this.parserFactories.push(factory);
  }

  registerContextFactory(factory: ParseContextFactory) {
    this.contextFactories.push(factory);
  }

  transformSource(event: TokenExpressionParseEvent): string {
    if (!event.context?.hasTransformers()) {
      return event.source;
    }
    return event.context.transformSource(event.source);
  }

  getParser = memoize((nodeType: NodeType): AbstractExpressionParser => {
    for (const factory of this.parserFactories) {
      if (factory.canParse(nodeType)) {
        return factory.getParser();
      }
    }
    console.warn(`[TokenExpressionParser] No parser found for node type '${nodeType}', using FallbackExpressionParser`);
    return new FallbackExpressionParser();
  });

  inferContext(source: string): ParseContext | null {
    for (const factory of this.contextFactories) {
      const context = factory.inferParseContext(source);
      if (context != null) {
        return context;
      }
    }
    return null;
  }
}
