import dotenv from 'dotenv';

dotenv.config(); // load .env into process.env

export const env = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
};

// fail fast rather than run with a missing secret
if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is not set in .env');
}