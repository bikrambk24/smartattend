import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/apiResponse';

const prisma = new PrismaClient();

export async function listEnrollments(req: Request, res: Response) {
  const classId = req.query.classId as string | undefined;

  const enrollments = await prisma.enrollment.findMany({
    where: classId ? { classId } : undefined,
    include: { student: { select: { id: true, name: true, email: true, studentId: true } } },
    orderBy: { createdAt: 'asc' },
  });

  return sendSuccess(res, enrollments);
}

export async function createEnrollment(req: Request, res: Response) {
  const { classId, studentId } = req.body;

  if (!classId || !studentId) {
    return sendError(res, 'classId and studentId are required', 400);
  }

  const classExists = await prisma.class.findUnique({ where: { id: classId } });
  if (!classExists) {
    return sendError(res, 'classId does not refer to an existing class', 400);
  }

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.role !== 'student') {
    return sendError(res, 'studentId must belong to a user with role student', 400);
  }

  const existing = await prisma.enrollment.findUnique({
    where: { studentId_classId: { studentId, classId } },
  });
  if (existing) {
    return sendError(res, 'This student is already enrolled in this class', 409);
  }

  const enrollment = await prisma.enrollment.create({
    data: { classId, studentId },
    include: { student: { select: { id: true, name: true, email: true, studentId: true } } },
  });

  return sendSuccess(res, enrollment, 201);
}

export async function deleteEnrollment(req: Request, res: Response) {
  const id = req.params.id as string;

  const existing = await prisma.enrollment.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Enrollment not found', 404);
  }

  await prisma.enrollment.delete({ where: { id } });

  return sendSuccess(res, { id });
}