import express from 'express';
import cors from 'cors';
import { config } from './config';
import contractRoutes from './routes/contracts';
import authRoutes from './routes/auth';
import templateRoutes from './routes/templates';
import messageRoutes from './routes/messages';

const app = express();

app.use(cors());
app.use(express.json());

// לוג כל בקשה – כדי לראות בקונסול גם 404 ונתיבים
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(`${config.apiPrefix}/auth`, authRoutes);
app.use(`${config.apiPrefix}/contracts`, contractRoutes);
app.use(`${config.apiPrefix}/templates`, templateRoutes);
app.use(`${config.apiPrefix}/messages`, messageRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.path} – לא נמצא`);
  res.status(404).json({ error: 'לא נמצא' });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'שגיאת שרת' });
});

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}${config.apiPrefix}`);
});
