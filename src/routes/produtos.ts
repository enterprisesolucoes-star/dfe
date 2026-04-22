import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.js";
import { prismaNfce } from "../lib/prisma.js";

export async function listarProdutos(req: AuthRequest, res: Response) {
  try {
    const produtos = await prismaNfce.produto.findMany({
      where: { idClienteSecurity: req.tenantId },
      orderBy: { descricao: "asc" },
    });
    res.json(produtos);
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    res.status(500).json({ error: "Erro ao listar produtos" });
  }
}

export async function criarProduto(req: AuthRequest, res: Response) {
  try {
    const { codigoInterno, descricao, ncm, cfop, valorUnitario, unidade } = req.body;

    if (!codigoInterno || !descricao || !ncm || !cfop || !valorUnitario) {
      return res.status(400).json({ error: "Campos obrigatórios não preenchidos" });
    }

    const produto = await prismaNfce.produto.create({
      data: {
        idClienteSecurity: req.tenantId!,
        codigoInterno,
        descricao,
        ncm,
        cfop,
        valorUnitario: parseFloat(valorUnitario),
        unidade,
      },
    });

    res.status(201).json(produto);
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    res.status(500).json({ error: "Erro ao criar produto" });
  }
}

export async function atualizarProduto(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { descricao, ncm, cfop, valorUnitario, unidade, ativo } = req.body;

    const produto = await prismaNfce.produto.update({
      where: { id: parseInt(id), idClienteSecurity: req.tenantId },
      data: {
        ...(descricao && { descricao }),
        ...(ncm && { ncm }),
        ...(cfop && { cfop }),
        ...(valorUnitario && { valorUnitario: parseFloat(valorUnitario) }),
        ...(unidade !== undefined && { unidade }),
        ...(ativo !== undefined && { ativo }),
      },
    });

    res.json(produto);
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
}

export async function excluirProduto(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    await prismaNfce.produto.delete({
      where: { id: parseInt(id), idClienteSecurity: req.tenantId },
    });

    res.status(204).send();
  } catch (error) {
    console.error("Erro ao excluir produto:", error);
    res.status(500).json({ error: "Erro ao excluir produto" });
  }
}
