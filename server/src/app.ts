import express from 'express';
import helmet from 'helmet';
import { corsConfig } from './config/cors';
import authRoutes from './routes/auth.routes';
import classRoutes from './routes/class.routes';

const app = express();

app.use(helmet());
app.use(corsConfig);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);

export default app;