import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Prevent multiple instances of Prisma Client in development
// This helps with hot-reloading in development
declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

// Use singleton pattern to avoid multiple Prisma Client instances
const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
}

export default prisma;
