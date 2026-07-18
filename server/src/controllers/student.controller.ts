import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/apiResponse';

const prisma = new PrismaClient();

async function teacherCanAccessStudent(teacherUserId: string, studentId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId,
      class: { teacherId: teacherUserId },
    },
  });
  return !!enrollment;
}

export async function listStudents(req: Request, res: Response) {
  const requester = req.user!;

  if (requester.role === 'admin') {
    const students = await prisma.user.findMany({
      where: { role: 'student' },
      select: { id: true, name: true, email: true, studentId: true, isDisabled: true },
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, students);
  }

  // Teacher: only students actually enrolled in a class this teacher teaches.
  const enrollments = await prisma.enrollment.findMany({
    where: { class: { teacherId: requester.userId } },
    include: {
      student: { select: { id: true, name: true, email: true, studentId: true, isDisabled: true } },
    },
  });

  const seen = new Set<string>();
  const students = [];
  for (const e of enrollments) {
    if (!seen.has(e.student.id)) {
      seen.add(e.student.id);
      students.push(e.student);
    }
  }
  students.sort((a, b) => a.name.localeCompare(b.name));

  return sendSuccess(res, students);
}

export async function getStudentProfile(req: Request, res: Response) {
  const requester = req.user!;
  const studentId = req.params.id as string;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, name: true, email: true, studentId: true, role: true, isDisabled: true },
  });

  if (!student || student.role !== 'student') {
    return sendError(res, 'Student not found', 404);
  }

  if (requester.role === 'teacher') {
    const allowed = await teacherCanAccessStudent(requester.userId, studentId);
    if (!allowed) {
      return sendError(res, 'This student is not enrolled in any of your classes', 403);
    }
  }

  const history = await prisma.attendanceEvent.findMany({
    where: { studentId },
    orderBy: { timestamp: 'desc' },
    include: {
      schedule: { select: { roomName: true, class: { select: { name: true, teacherId: true } } } },
    },
  });

  // A teacher only sees history for classes they teach, not the student's
  // full record across other teachers' classes.
  const visibleHistory =
    requester.role === 'teacher'
      ? history.filter((h) => h.schedule.class.teacherId === requester.userId)
      : history;

  return sendSuccess(res, { student, history: visibleHistory });
}