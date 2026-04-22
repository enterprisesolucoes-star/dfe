import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function diagnose() {
  console.log(" Iniciando Diagnóstico de Login...");

  try {
    // 1. Testar conexão com o banco
    const usuarios = await prisma.usuario.findMany();
    console.log(` Conexão com o banco: OK! (${usuarios.length} usuários encontrados)`);

    // 2. Localizar o admin
    const admin = await prisma.usuario.findFirst({
      where: { email: "admin@teste.com" }
    });

    if (!admin) {
      console.log(" ERRO: Usuário 'admin@teste.com' não encontrado na tabela 'usuario'.");
      return;
    }

    console.log(" Usuário Admin localizado!");
    console.log(" Dados no Banco:", { 
      id: admin.id, 
      email: admin.email, 
      login: admin.login,
      temSenha: !!admin.senhaHash 
    });

    // 3. Testar a senha '123456'
    const senhaValida = await bcrypt.compare("123456", admin.senhaHash);
    
    if (senhaValida) {
      console.log(" SUCESSO: A senha '123456' é VÁLIDA para este hash!");
    } else {
      console.log(" ERRO: A senha '123456' NÃO bate com o hash do banco.");
      console.log("DICA: Rode o comando de INSERT novamente.");
    }

  } catch (error) {
    console.error(" CRITICAL ERROR:", error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
