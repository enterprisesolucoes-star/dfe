import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { prismaNfce } from "../lib/prisma.js";

export async function listarVendas(req: AuthRequest, res: Response) {
  try {
    const vendas = await prismaNfce.venda.findMany({
      where: { idClienteSecurity: req.tenantId },
      orderBy: { dataEmissao: "desc" },
    });
    res.json(vendas);
  } catch (error) {
    console.error("Erro ao listar vendas:", error);
    res.status(500).json({ error: "Erro ao listar vendas" });
  }
}

export async function criarVenda(req: AuthRequest, res: Response) {
  try {
    const { numero, valorTotal } = req.body;

    if (!numero || !valorTotal) {
      return res.status(400).json({ error: "Número e valor total são obrigatórios" });
    }

    const venda = await prismaNfce.venda.create({
      data: {
        idClienteSecurity: req.tenantId!,
        numero,
        valorTotal: parseFloat(valorTotal),
      },
    });

    res.status(201).json(venda);
  } catch (error) {
    console.error("Erro ao criar venda:", error);
    res.status(500).json({ error: "Erro ao criar venda" });
  }
}
