import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authLimiter, authRouter } from './modules/auth/routes';
import { boardsRouter } from './modules/boards/routes';
import { cardsRouter } from './modules/cards/routes';
import { columnsRouter } from './modules/columns/routes';

export function createApp() {
  const app = express();

  // Required for secure cookies to work behind a reverse proxy (Render, nginx)
  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  });

  app.use('/api/auth', authLimiter, authRouter);
  app.use('/api/boards', boardsRouter);
  app.use('/api/columns', columnsRouter);
  app.use('/api/cards', cardsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
