import { PrismaClient } from '@prisma/client';

// Single shared instance, avoids exhausting DB connections
export const prisma = new PrismaClient();
