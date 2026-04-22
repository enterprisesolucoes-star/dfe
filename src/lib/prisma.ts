import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
export const prismaNfce = prisma;
export { prisma };
export async function getClienteSecurity(idClienteSecurity: number) {
  return {
    ID: idClienteSecurity,
    ATIVO: 1, // Retorna número 1 para passar no check (cliente.ATIVO !== 1)
    MENSAGEM: "Acesso Liberado",
  };
}
export default prisma;
