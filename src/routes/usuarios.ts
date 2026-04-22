import { Request, Response } from "express";
import pg from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { prismaNfce } from "../lib/prisma.js";

export async function listarClientes(req: Request, res: Response) {
  try {
    const client = new pg.Client({
      connectionString: process.env.DATABASE_URL_SECURITY,
    });
    await client.connect();
    const result = await client.query(
      'SELECT "ID", "RAZAO_SOCIAL", "CNPJ", "ATIVO" FROM "TBCLIENTES" WHERE "ATIVO" = 1 ORDER BY "RAZAO_SOCIAL"'
    );
    await client.end();
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar clientes:", error);
    res.status(500).json({ error: "Erro ao listar clientes" });
  }
}

export async function criarUsuario(req: Request, res: Response) {
  try {
    const { login, senha, perfil, idClienteSecurity } = req.body;

    if (!login || !senha || !idClienteSecurity) {
      return res.status(400).json({ error: "Login, senha e cliente são obrigatórios" });
    }

    const usuarioExistente = await prismaNfce.usuario.findUnique({
      where: { login },
    });

    if (usuarioExistente) {
      return res.status(400).json({ error: "Login já está em uso" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prismaNfce.usuario.create({
      data: {
        login,
        senhaHash,
        perfil: perfil || "usuario",
        idClienteSecurity: parseInt(idClienteSecurity),
      },
    });

    res.status(201).json({
      id: usuario.id,
      login: usuario.login,
      perfil: usuario.perfil,
      idClienteSecurity: usuario.idClienteSecurity,
    });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ error: "Erro ao criar usuário" });
  }
}
