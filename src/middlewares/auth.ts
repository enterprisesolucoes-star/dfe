import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import "dotenv/config";

export interface AuthRequest extends Request {
  tenantId?: number;
  userId?: number;
  perfil?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Lê token do cookie httpOnly (preferência) ou header Bearer (fallback)
  const token = (() => {
    const cookieStr = req.headers.cookie || '';
    const m = cookieStr.match(/(?:^|;\s*)dfe_token=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
    const h = req.headers.authorization;
    if (h?.startsWith('Bearer ')) return h.split(' ')[1];
    return null;
  })();

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      idClienteSecurity: number;
      perfil: string;
    };

    req.userId = decoded.id;
    req.tenantId = decoded.idClienteSecurity;
    req.perfil = decoded.perfil;

    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
};
