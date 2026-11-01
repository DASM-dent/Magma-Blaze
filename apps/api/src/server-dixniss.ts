import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config, mailConfigured } from './config.js';
import { prisma } from './prisma.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import dropRoutes from './routes/drops.js';
import categoryRoutes from './routes/categories.js';
import newsRoutes from './routes/news.js';
import contentRoutes from './routes/content.js';
import accountRoutes from './routes/account.js';
import securityRoutes, { blockBannedIp } from './routes/security.js';

function patchExpressAsyncErrors() {
  const router = express.Router();
  router.get('/__async_patch__', (_req, res) => res.end());
  const stack = (router as any).stack;
  const layer = Array.isArray(stack) ? stack[0] : null;
  const Layer = layer?.constructor;
  if (!Layer?.prototype || Layer.prototype.__magmaAsyncPatched) return;
  const original = Layer.prototype.handle_request;
  Layer.prototype.handle_request = function handleRequest(req: express.Request, res: express.Response, next: express.NextFunction) {
    const fn = this.handle;
    if (fn.length > 3) return original.call(this, req, res, next);
    try {
      const result = fn(req, res, next);
      if (result && typeof result.catch === 'function') result.catch(next);
    } catch (error) {
      next(error);
    }
  };
  Layer.prototype.__magmaAsyncPatched = true;
}

patchExpressAsyncErrors();

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

const allowedOrigins = new Set([
  ...config.frontendUrls,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]);

app.use(cors({
  origin(origin, callback) {
    if (
      !origin ||
      allowedOrigins.has(origin) ||
      /^http:\/\/localhost:\d+$/.test(origin) ||
      /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
      /^http:\/\/192\.168\./.test(origin)
    ) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
}));

app.use(express.json({ limit:'25mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => req.path === '/health',
}));

app.use('/security', securityRoutes);
app.use(blockBannedIp);

app.get('/', (_req, res) => {
  res.json({
    ok: true,
    service: 'magma-api',
    health: '/health',
    frontend: Array.from(allowedOrigins).filter((origin) => origin.startsWith('http')),
  });
});

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok:true, service:'magma-api', database:'ok', mail: mailConfigured() ? 'configured' : 'missing' });
  } catch {
    res.status(500).json({ ok:false, service:'magma-api', database:'error', mail: mailConfigured() ? 'configured' : 'missing', message:'La API corre, pero la base de datos no esta lista. Ejecuta npm run db:migrate y npm run db:seed.' });
  }
});

app.use('/auth', authRoutes);
app.use('/account', accountRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/admin', adminRoutes);
app.use('/drops', dropRoutes);
app.use('/categories', categoryRoutes);
app.use('/news', newsRoutes);
app.use('/content', contentRoutes);

app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API_ERROR]', err);
  if (res.headersSent) return next(err);
  const knownErrors: Record<string,{status:number;message:string}> = {
    P2002: { status:409, message:'Ya existe un registro con esos datos.' },
    P2003: { status:409, message:'Este registro esta relacionado con otros datos y no se puede modificar de esa forma.' },
    P2025: { status:404, message:'El registro solicitado ya no existe.' },
    P2028: { status:503, message:'La base de datos tardo demasiado. Intenta guardar nuevamente.' },
  };
  const known=knownErrors[String(err?.code||'')];
  res.status(known?.status||500).json({
    message:known?.message||'No pudimos completar la solicitud. Intenta nuevamente.',
  });
});

const server = app.listen(config.port, () => console.log(`API lista en http://localhost:${config.port}`));

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`No se pudo iniciar la API: el puerto ${config.port} ya esta en uso. Cierra el otro npm run dev o cambia PORT en apps/api/.env.`);
    process.exit(1);
  }
  console.error('[API_LISTEN_ERROR]', error);
  process.exit(1);
});
