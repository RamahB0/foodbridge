// Single shared PrismaClient instance. Node's ESM module cache guarantees this
// file only runs once per process, so every route/middleware that imports from
// here gets the same connection pool instead of opening a new one per request.
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
