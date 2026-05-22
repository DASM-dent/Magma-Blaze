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

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[API_ERROR]', err);
  res.status(500).json({ message:'No pudimos completar la solicitud. Intenta nuevamente.' });
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
