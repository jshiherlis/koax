import { IncomingMessage, ServerResponse } from 'http';
import { KoaXRequest } from './request';
import { KoaXResponse } from './response';
import { KoaXApplication } from './application';

/**
 * Middleware function signature compatible with Koa
 * @param ctx - Context object containing request/response
 * @param next - Function to call next middleware in chain
 */
export type Middleware = (ctx: KoaXContext, next: () => Promise<void>) => Promise<void> | void;

/**
 * Context object interface - compatible with Koa's context
 */
export interface KoaXContext {
  app: KoaXApplication;
  req: IncomingMessage;
  res: ServerResponse;
  request: KoaXRequest;
  response: KoaXResponse;
  state: Record<string, any>;

  // Delegated properties from request
  url: string;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;

  // Delegated properties from response
  status: number;
  message: string;
  body: any;

  // Helper methods
  throw(status: number, message?: string): never;
  assert(condition: any, status: number, message?: string): asserts condition;
  set(field: string, val: string | string[]): void;
  get(field: string): string | number | string[] | undefined;

  // Internal pooling flag
  _inUse?: boolean;
}

/**
 * Application options
 */
export interface KoaXOptions {
  env?: string;
  proxy?: boolean;
  subdomainOffset?: number;
  contextPoolSize?: number; // New: size of context pool
}
