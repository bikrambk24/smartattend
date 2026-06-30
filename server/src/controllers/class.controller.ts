import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/apiResponse';

const prisma = new PrismaClient();

export async function createClass(req: Request, res: Response) {
  const { name, teacherId } = req.body;

  if (!name || !teacherId) {
    return sendError(res, 'name and teacherId are required', 400);
  }

  const teacher = await prisma.user.findUnique({ where: { id: teacherId } });

  if (!teacher || teacher.role !== 'teacher') {
    return sendError(res, 'teacherId must belong to a user with role teacher', 400);
  }

  const newClass = await prisma.class.create({ data: { name, teacherId } });

  return sendSuccess(res, newClass, 201);
}

export async function listClasses(req: Request, res: Response) {
  const classes = await prisma.class.findMany({ include: { teacher: true } });
  return sendSuccess(res, classes);
}

export async function getClass(req: Request, res: Response) {
  const id = req.params.id as string;

  const classRecord = await prisma.class.findUnique({
    where: { id },
    include: { teacher: true, schedules: true },
  });

  if (!classRecord) {
    return sendError(res, 'Class not found', 404);
  }

  return sendSuccess(res, classRecord);
}

export async function updateClass(req: Request, res: Response) {
  const id = req.params.id as string;
  const { name, teacherId } = req.body;

  if (teacherId) {
    const teacher = await prisma.user.findUnique({ where: { id: teacherId } });

    if (!teacher || teacher.role !== 'teacher') {
      return sendError(res, 'teacherId must belong to a user with role teacher', 400);
    }
  }

  const updated = await prisma.class.update({
    where: { id },
    data: { name, teacherId },
  });

  return sendSuccess(res, updated);
}

export async function deleteClass(req: Request, res: Response) {
  const id = req.params.id as string;

  const scheduleCount = await prisma.schedule.count({ where: { classId: id } });

  if (scheduleCount > 0) {
    return sendError(
      res,
      `Cannot delete: ${scheduleCount} schedule(s) exist for this class`,
      409,
    );
  }

  await prisma.class.delete({ where: { id } });

  return sendSuccess(res, { id });
}