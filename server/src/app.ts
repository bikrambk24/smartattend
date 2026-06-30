import express from 'express';
import helmet from 'helmet';
import { corsConfig } from './config/cors';
import authRoutes from './routes/auth.routes';
import classRoutes from './routes/class.routes';
import scheduleRoutes from './routes/schedule.routes';
import sessionRoutes from './routes/session.routes';

const app = express();

app.use(helmet());
app.use(corsConfig);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/sessions', sessionRoutes);

export default app;