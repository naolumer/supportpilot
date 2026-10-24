import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma ??= new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    return globalForPrisma.prisma;
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
