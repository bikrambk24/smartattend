import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/apiResponse';

const prisma = new PrismaClient();

async function getScheduleIfOwnedByTeacher(scheduleId: string, teacherUserId: string) {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { class: true },
  });

  if (!schedule) return { schedule: null, owned: false };
  return { schedule, owned: schedule.class.teacherId === teacherUserId };
}

export async function startSession(req: Request, res: Response) {
  const scheduleId = req.params.scheduleId as string;
  const teacherUserId = req.user!.userId;

  const { schedule, owned } = await getScheduleIfOwnedByTeacher(scheduleId, teacherUserId);

  if (!schedule) {
    return sendError(res, 'Schedule not found', 404);
  }
  if (!owned) {
    return sendError(res, 'You do not teach the class this schedule belongs to', 403);
  }
  if (schedule.sessionOpen) {
    return sendError(res, 'Session is already open for this schedule', 409);
  }

  const updated = await prisma.schedule.update({
    where: { id: scheduleId },
    data: { sessionOpen: true },
  });

  return sendSuccess(res, updated);
}

export async function endSession(req: Request, res: Response) {
  const scheduleId = req.params.scheduleId as string;
  const teacherUserId = req.user!.userId;

  const { schedule, owned } = await getScheduleIfOwnedByTeacher(scheduleId, teacherUserId);

  if (!schedule) {
    return sendError(res, 'Schedule not found', 404);
  }
  if (!owned) {
    return sendError(res, 'You do not teach the class this schedule belongs to', 403);
  }
  if (!schedule.sessionOpen) {
    return sendError(res, 'Session is not currently open for this schedule', 409);
  }

  const updated = await prisma.schedule.update({
    where: { id: scheduleId },
    data: { sessionOpen: false },
  });

  return sendSuccess(res, updated);
}

export async function getLiveRoster(req: Request, res: Response) {
  const scheduleId = req.params.scheduleId as string;
  const requester = req.user!;

  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: { class: true },
  });

  if (!schedule) {
    return sendError(res, 'Schedule not found', 404);
  }

  // Teachers may only view their own class's roster; admins may view any.
  if (requester.role === 'teacher' && schedule.class.teacherId !== requester.userId) {
    return sendError(res, 'You do not teach the class this schedule belongs to', 403);
  }

  const events = await prisma.attendanceEvent.findMany({
    where: { scheduleId },
    orderBy: { timestamp: 'desc' },
    include: { student: { select: { id: true, name: true, studentId: true } } },
  });

  return sendSuccess(res, events);
}

export async function reviewFlaggedCheckIn(req: Request, res: Response) {
  const eventId = req.params.eventId as string;
  const teacherUserId = req.user!.userId;
  const { decision } = req.body;

  if (decision !== 'confirmed' && decision !== 'rejected') {
    return sendError(res, "decision must be 'confirmed' or 'rejected'", 400);
  }

  const event = await prisma.attendanceEvent.findUnique({
    where: { id: eventId },
    include: { schedule: { include: { class: true } } },
  });

  if (!event) {
    return sendError(res, 'Attendance event not found', 404);
  }
  if (event.schedule.class.teacherId !== teacherUserId) {
    return sendError(res, 'You do not teach the class this event belongs to', 403);
  }
  if (event.flagged === false && event.verificationOutcome === 'verified') {
    return sendError(res, 'This event does not need review', 409);
  }

  const updated = await prisma.attendanceEvent.update({
    where: { id: eventId },
    data: { teacherReviewed: true, teacherDecision: decision },
  });

  return sendSuccess(res, updated);
}

export async function getMySchedulesAsTeacher(req: Request, res: Response) {
  const teacherId = req.user!.userId;

  const schedules = await prisma.schedule.findMany({
    where: { class: { teacherId } },
    include: { class: { select: { name: true } } },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  return sendSuccess(res, schedules);
}