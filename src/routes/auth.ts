import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { prismaNfce } from "../lib/prisma.ts";

export async function login(req: Request, res: Response) {
  try {
    const { login, senha } = req.body;
    if (!login || !senha) {
      return res.status(400).json({ success: false, error: "Login e senha são obrigatórios" });
    }

    const usuario = await prismaNfce.usuarios.findFirst({
      where: {
        OR: [
          { login: login },
        ],
        ativo: 1,
      },
    });

    if (!usuario) {
      return res.status(401).json({ success: false, error: "Usuário não encontrado" });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ success: false, error: "Senha inválida" });
    }
    // Verifica status da empresa
    if (usuario.empresa_id) {
      const empresa = await prismaNfce.empresas.findFirst({ where: { id: usuario.empresa_id } });
      if (empresa) {
        if (empresa.status === 'Inativo') {
          return res.json({ success: false, message: 'Esta conta foi desativada.' });
        }
        if (empresa.status === 'Manutenção') {
          return res.json({ success: false, manutencao: true, message: 'Sistema em manutenção. Por favor, aguarde e tente novamente em alguns minutos.' });
        }
        if (empresa.status === 'Bloqueado') {
          return res.json({ success: false, message: 'BLOQUEADO: Favor entrar em contato com Administrador!' });
        }
      }
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        idClienteSecurity: usuario.empresa_id,
        perfil: usuario.perfil,
      },
      process.env.JWT_SECRET || "123456",
      { expiresIn: "24h" }
    );

    return res.json({
      success: true,
      token,
      usuarioId: usuario.id,
      nome: usuario.nome,
      perfil: usuario.perfil,
      empresaId: usuario.empresa_id ?? 1,
      empresaConfigurada: true,
      usuarioDfe: usuario.empresa_id ? (await (async () => { try { const emp = await prismaNfce.empresas.findFirst({ where: { id: usuario.empresa_id! } }); return emp?.usuario_dfe ?? 2; } catch { return 2; } })()) : 2,
      user: {
        id: usuario.id,
        login: usuario.login,
        nome: usuario.nome,
        perfil: usuario.perfil,
        idClienteSecurity: usuario.empresa_id,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ success: false, error: "Erro ao processar login" });
  }
}
