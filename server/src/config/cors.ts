import cors from 'cors';

const allowedOrigins = ['http://localhost:5173'];

export const corsConfig = cors({
  origin: allowedOrigins,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Platform'],
});