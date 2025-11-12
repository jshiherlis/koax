# KoaX Quick Start

## 5-Minute Setup

### 1. Install Dependencies

```bash
cd koax-implementation
npm install
```

### 2. Build TypeScript

```bash
npm run build
```

### 3. Run Basic Example

```bash
npm run dev
```

Visit: http://localhost:3000

### 4. Run Benchmark

```bash
npm run benchmark
```

## Minimal Example

Create `test.ts`:

```typescript
import KoaX from './src';

const app = new KoaX();

app.use(async (ctx) => {
  ctx.body = { message: 'Hello KoaX!' };
});

app.listen(3000, () => {
  console.log('http://localhost:3000');
});
```

Run:
```bash
ts-node test.ts
```

## Key Features to Try

### 1. Logger Middleware
```typescript
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  console.log(`${ctx.method} ${ctx.url} - ${Date.now() - start}ms`);
});
```

### 2. Error Handling
```typescript
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err: any) {
    ctx.status = err.status || 500;
    ctx.body = { error: err.message };
  }
});
```

### 3. Simple Router
```typescript
app.use(async (ctx) => {
  if (ctx.path === '/api/hello') {
    ctx.body = { message: 'Hello!' };
    return;
  }

  if (ctx.path === '/api/stats') {
    ctx.body = app.getPoolStats();
    return;
  }

  ctx.status = 404;
  ctx.body = { error: 'Not Found' };
});
```

### 4. Pool Monitoring
```typescript
app.use(async (ctx, next) => {
  await next();

  if (ctx.path === '/stats') {
    const stats = app.getPoolStats();
    console.log('Pool stats:', stats);
  }
});
```

## Performance Testing

### Using curl

```bash
# Basic test
curl http://localhost:3000/

# Load test (requires Apache Bench)
ab -n 10000 -c 100 http://localhost:3000/

# Or use autocannon
npx autocannon -c 100 -d 10 http://localhost:3000/
```

### Compare with Koa

Create `koa-test.js`:
```javascript
const Koa = require('koa');
const app = new Koa();

app.use(async (ctx) => {
  ctx.body = { message: 'Hello Koa!' };
});

app.listen(3001);
```

Run both:
```bash
# Terminal 1: KoaX
npm run dev

# Terminal 2: Koa
node koa-test.js

# Terminal 3: Benchmark
npx autocannon -c 100 -d 10 http://localhost:3000/  # KoaX
npx autocannon -c 100 -d 10 http://localhost:3001/  # Koa
```

## Configuration

### Pool Size Tuning

```typescript
const app = new KoaX({
  contextPoolSize: 1000  // Adjust based on load
});

// Monitor utilization
setInterval(() => {
  const stats = app.getPoolStats();
  const util = (1 - stats.poolSize / stats.maxSize) * 100;
  console.log(`Pool utilization: ${util.toFixed(1)}%`);
}, 30000);
```

### Recommendations

| Traffic (req/s) | Pool Size |
|----------------|-----------|
| < 1000 | 100-500 |
| 1000-5000 | 500-1000 |
| > 5000 | 1000-2000 |

## Common Patterns

### REST API
```typescript
app.use(async (ctx) => {
  const { method, path } = ctx;

  if (path === '/users' && method === 'GET') {
    ctx.body = { users: [] };
  } else if (path === '/users' && method === 'POST') {
    ctx.status = 201;
    ctx.body = { id: 1 };
  } else {
    ctx.status = 404;
  }
});
```

### JSON Response
```typescript
app.use(async (ctx) => {
  ctx.body = {
    timestamp: Date.now(),
    data: { /* your data */ }
  };
  // Automatically serialized to JSON
});
```

### Custom Headers
```typescript
app.use(async (ctx) => {
  ctx.set('X-Response-Time', '10ms');
  ctx.set('X-Powered-By', 'KoaX');
  ctx.body = { ok: true };
});
```

## Migration from Koa

### Before (Koa)
```typescript
const Koa = require('koa');
const app = new Koa();

app.use(/* middleware */);
app.listen(3000);
```

### After (KoaX)
```typescript
import KoaX from 'koax';
const app = new KoaX({ contextPoolSize: 1000 });

app.use(/* same middleware */);
app.listen(3000);
```

**That's it!** All middleware works unchanged.

## Troubleshooting

### Issue: Pool exhausted warning
```
Pool utilization: 95%+
```

**Solution:** Increase `contextPoolSize`

### Issue: High memory usage
```
Memory keeps growing
```

**Solution:** Check for memory leaks in middleware (storing references in `ctx.state`)

### Issue: Performance not improved
```
Same speed as Koa
```

**Solutions:**
- Ensure pool size is adequate
- Test under higher load (>1000 req/s)
- Check if bottleneck is elsewhere (DB, etc.)

## Next Steps

1. Read [README.md](./README.md) for full documentation
2. Check [OPTIMIZATIONS.fr.md](./OPTIMIZATIONS.fr.md) for technical details
3. Explore [examples/](./examples/) for more patterns
4. Run [benchmarks/compare.ts](./benchmarks/compare.ts) for your use case

## Useful Commands

```bash
# Development
npm run dev              # Run basic example
npm run build            # Build TypeScript
npm run benchmark        # Run performance tests

# Testing
ts-node examples/basic.ts         # Basic server
ts-node examples/with-router.ts   # With router
ts-node benchmarks/compare.ts     # Benchmark

# Custom test
ts-node -e "
  import KoaX from './src';
  const app = new KoaX();
  app.use(async ctx => { ctx.body = 'OK'; });
  app.listen(3000);
"
```

## Resources

- 📖 [Full Documentation](./README.md)
- 🔧 [Optimizations Guide](./OPTIMIZATIONS.fr.md)
- 📊 [Comparison with Koa](./COMPARISON.md)
- 💡 [Examples](./examples/)

---

**Ready to build?** Start with `examples/basic.ts` and customize from there!
