import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db';
import { signToken } from '../services/token.service';

// Admin-only: creates a student or teacher account
export async function createUser(req: Request, res: Response) {
  const { name, email, role, studentId, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ success: false, error: 'Email already in use' });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, role, studentId, passwordHash },
  });

  res.status(201).json({ success: true, data: { id: user.id, email: user.email, role: user.role } });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.isDisabled) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({ success: true, data: { token, role: user.role, name: user.name } });
}

export async function listUsers(req: Request, res: Response) {
  const role = req.query.role as string | undefined;

  const users = await prisma.user.findMany({
    where: role ? { role: role as any } : undefined,
    select: { id: true, name: true, email: true, role: true, studentId: true, isDisabled: true, createdAt: true },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: users });
}

export async function toggleUserDisabled(req: Request, res: Response) {
  const id = req.params.id as string;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isDisabled: !user.isDisabled },
  });

  res.json({ success: true, data: { id: updated.id, isDisabled: updated.isDisabled } });
}