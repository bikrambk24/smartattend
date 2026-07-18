import cors from 'cors';

const allowedOrigins = ['http://localhost:5173', 'https://smartattend.bikrambk.com.np'];

export const corsConfig = cors({
  origin: allowedOrigins,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Platform'],
});