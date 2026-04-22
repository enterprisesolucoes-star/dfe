import { PrismaClient } from "@prisma/client";

export function createTenantPrisma() {
  return new PrismaClient();
}
