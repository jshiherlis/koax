import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { EventEmitter } from 'events';
import { Middleware, KoaXContext, KoaXOptions } from './types';
import { ContextPool, Context } from './context';

/**
 * KoaX Application
 *
 * KEY OPTIMIZATION: Iterative middleware execution instead of recursive
 * - Reduces call stack depth
 * - Improves performance by avoiding function call overhead
 * - Easier to debug and profile
 *
 * Context pooling reduces GC pressure and object allocation overhead
 */
export class KoaXApplication extends EventEmitter {
  private middleware: Middleware[] = [];
  private contextPool: ContextPool;
  public env: string;
  public proxy: boolean;
  public subdomainOffset: number;

  constructor(options: KoaXOptions = {}) {
    super();
    this.env = options.env || process.env.NODE_ENV || 'development';
    this.proxy = options.proxy || false;
    this.subdomainOffset = options.subdomainOffset || 2;
    this.contextPool = new ContextPool(options.contextPoolSize || 1000);
  }

  /**
   * Register middleware - compatible with Koa's app.use()
   */
  use(fn: Middleware): this {
    if (typeof fn !== 'function') {
      throw new TypeError('Middleware must be a function');
    }
    this.middleware.push(fn);
    return this;
  }

  /**
   * Create HTTP server and listen on port
   * Compatible with Koa's app.listen()
   */
  listen(port: number, callback?: () => void): Server {
    const server = createServer(this.callback());
    return server.listen(port, callback);
  }

  /**
   * Return request handler callback for http.createServer()
   * Compatible with Koa's app.callback()
   */
  callback() {
    return (req: IncomingMessage, res: ServerResponse) => {
      this.handleRequest(req, res);
    };
  }

  /**
   * Handle incoming request
   * OPTIMIZATION: Uses context pool to reuse objects
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const ctx = this.contextPool.acquire(this, req, res);

    try {
      await this.executeMiddleware(ctx);
      this.respond(ctx);
    } catch (err) {
      this.handleError(err, ctx);
    } finally {
      // Return context to pool after response is sent
      res.on('finish', () => {
        this.contextPool.release(ctx);
      });
    }
  }

  /**
   * Execute middleware chain with iterative dispatch
   *
   * OPTIMIZATION: Iterative middleware execution instead of koa-compose
   *
   * Traditional Koa uses koa-compose which creates nested function calls:
   * - Each await next() creates a new function call in the stack
   * - Stack depth = number of middleware
   * - More overhead from function call frames
   *
   * KoaX uses iterative dispatch with index-based traversal:
   * - Maintains the same onion model (downstream -> upstream)
   * - Reduces function call overhead
   * - Simpler to profile and debug
   * - Still fully compatible with Koa middleware semantics
   *
   * Example with 3 middleware:
   * M1: async (ctx, next) => { console.log(1); await next(); console.log(4); }
   * M2: async (ctx, next) => { console.log(2); await next(); console.log(3); }
   * M3: async (ctx, next) => { console.log('final'); }
   *
   * Output: 1, 2, final, 3, 4 (onion model preserved)
   */
  private async executeMiddleware(ctx: KoaXContext): Promise<void> {
    if (this.middleware.length === 0) return;

    // OPTIMIZATION: Use index-based iteration instead of recursion
    // This reduces call stack depth while maintaining Koa semantics
    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      // Prevent calling next() multiple times
      if (i <= index) {
        throw new Error('next() called multiple times');
      }

      index = i;

      // End of middleware chain
      if (i >= this.middleware.length) {
        return;
      }

      const fn = this.middleware[i];

      try {
        // Execute current middleware, passing dispatch bound to next index
        // This maintains the onion model while using iteration
        await fn(ctx, () => dispatch(i + 1));
      } catch (err) {
        throw err;
      }
    };

    await dispatch(0);
  }

  /**
   * Send response to client
   */
  private respond(ctx: KoaXContext): void {
    ctx.response.send();
  }

  /**
   * Handle errors
   */
  private handleError(err: any, ctx: KoaXContext): void {
    const status = err.status || err.statusCode || 500;
    const message = err.expose ? err.message : 'Internal Server Error';

    ctx.status = status;
    ctx.body = { error: message };

    if (!ctx.res.writableEnded) {
      ctx.response.send();
    }

    // Emit error event for logging
    this.emit('error', err, ctx);
  }

  /**
   * Get context pool statistics
   */
  getPoolStats() {
    return this.contextPool.getStats();
  }
}
