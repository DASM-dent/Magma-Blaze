import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export type AuthUser = { id: string; email: string; role: string };

declare global { namespace Express { interface Request { user?: AuthUser } } }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ message: 'No autenticado' });
  try {
    req.user = jwt.verify(token, config.jwtSecret) as AuthUser;
    next();
  } catch {
    return res.status(401).json({ message: 'Sesión inválida o expirada' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Acceso solo para administradores' });
  next();
}

export function requireStaff(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role === 'CUSTOMER') return res.status(403).json({ message: 'Acceso solo para equipo autorizado' });
  next();
}
