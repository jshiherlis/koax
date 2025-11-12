/**
 * KoaX - High-performance Koa-compatible framework
 *
 * Key optimizations:
 * 1. Context pooling - Reuses context objects to reduce GC pressure
 * 2. Iterative middleware dispatch - Cleaner than koa-compose
 * 3. Optimized request/response wrappers with caching
 *
 * Fully compatible with existing Koa middleware
 */

export { KoaXApplication } from './application';
export { Context, ContextPool } from './context';
export { KoaXRequest } from './request';
export { KoaXResponse } from './response';
export { Middleware, KoaXContext, KoaXOptions } from './types';

// Default export for convenience
import { KoaXApplication } from './application';
export default KoaXApplication;
