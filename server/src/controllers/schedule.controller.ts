import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/apiResponse';

const prisma = new PrismaClient();

const VALID_CONFIGS = ['C0', 'C1', 'C2', 'C3', 'C4', 'C5'];
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validateScheduleFields(body: any, isUpdate: boolean): string[] {
  const errors: string[] = [];

  if (!isUpdate) {
    if (!body.classId) errors.push('classId is required');
    if (body.dayOfWeek === undefined || body.dayOfWeek === null) errors.push('dayOfWeek is required');
    if (!body.startTime) errors.push('startTime is required');
    if (!body.endTime) errors.push('endTime is required');
    if (!body.roomName) errors.push('roomName is required');
  }

  if (body.dayOfWeek !== undefined && body.dayOfWeek !== null) {
    if (!Number.isInteger(body.dayOfWeek) || body.dayOfWeek < 0 || body.dayOfWeek > 6) {
      errors.push('dayOfWeek must be an integer between 0 (Sunday) and 6 (Saturday)');
    }
  }

  if (body.startTime !== undefined && !TIME_PATTERN.test(body.startTime)) {
    errors.push('startTime must be in HH:MM 24-hour format');
  }
  if (body.endTime !== undefined && !TIME_PATTERN.test(body.endTime)) {
    errors.push('endTime must be in HH:MM 24-hour format');
  }
  if (
    body.startTime &&
    body.endTime &&
    TIME_PATTERN.test(body.startTime) &&
    TIME_PATTERN.test(body.endTime) &&
    body.startTime >= body.endTime
  ) {
    errors.push('startTime must be before endTime');
  }

  if (body.verificationConfig !== undefined && !VALID_CONFIGS.includes(body.verificationConfig)) {
    errors.push(`verificationConfig must be one of ${VALID_CONFIGS.join(', ')}`);
  }

  if (body.geofenceLat !== undefined && body.geofenceLat !== null) {
    if (typeof body.geofenceLat !== 'number' || body.geofenceLat < -90 || body.geofenceLat > 90) {
      errors.push('geofenceLat must be a number between -90 and 90');
    }
  }
  if (body.geofenceLng !== undefined && body.geofenceLng !== null) {
    if (typeof body.geofenceLng !== 'number' || body.geofenceLng < -180 || body.geofenceLng > 180) {
      errors.push('geofenceLng must be a number between -180 and 180');
    }
  }
  if (body.geofenceRadiusMetres !== undefined && body.geofenceRadiusMetres !== null) {
    if (!Number.isInteger(body.geofenceRadiusMetres) || body.geofenceRadiusMetres <= 0) {
      errors.push('geofenceRadiusMetres must be a positive integer');
    }
  }

  return errors;
}

export async function createSchedule(req: Request, res: Response) {
  const errors = validateScheduleFields(req.body, false);
  if (errors.length > 0) {
    return sendError(res, errors.join('; '), 400);
  }

  const classExists = await prisma.class.findUnique({ where: { id: req.body.classId } });
  if (!classExists) {
    return sendError(res, 'classId does not refer to an existing class', 400);
  }

  const schedule = await prisma.schedule.create({
    data: {
      classId: req.body.classId,
      dayOfWeek: req.body.dayOfWeek,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      roomName: req.body.roomName,
      verificationConfig: req.body.verificationConfig ?? 'C2',
      geofenceLat: req.body.geofenceLat,
      geofenceLng: req.body.geofenceLng,
      geofenceRadiusMetres: req.body.geofenceRadiusMetres ?? 50,
      anchorBssid: req.body.anchorBssid,
      anchorRssi: req.body.anchorRssi,
      expectedFingerprint: req.body.expectedFingerprint,
    },
  });

  return sendSuccess(res, schedule, 201);
}

export async function listSchedules(req: Request, res: Response) {
  const classId = req.query.classId as string | undefined;

  const schedules = await prisma.schedule.findMany({
    where: classId ? { classId } : undefined,
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  return sendSuccess(res, schedules);
}

export async function getSchedule(req: Request, res: Response) {
  const id = req.params.id as string;

  const schedule = await prisma.schedule.findUnique({ where: { id } });
  if (!schedule) {
    return sendError(res, 'Schedule not found', 404);
  }

  return sendSuccess(res, schedule);
}

export async function updateSchedule(req: Request, res: Response) {
  const id = req.params.id as string;

  const errors = validateScheduleFields(req.body, true);
  if (errors.length > 0) {
    return sendError(res, errors.join('; '), 400);
  }

  if (req.body.classId) {
    const classExists = await prisma.class.findUnique({ where: { id: req.body.classId } });
    if (!classExists) {
      return sendError(res, 'classId does not refer to an existing class', 400);
    }
  }

  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      classId: req.body.classId,
      dayOfWeek: req.body.dayOfWeek,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      roomName: req.body.roomName,
      verificationConfig: req.body.verificationConfig,
      geofenceLat: req.body.geofenceLat,
      geofenceLng: req.body.geofenceLng,
      geofenceRadiusMetres: req.body.geofenceRadiusMetres,
      anchorBssid: req.body.anchorBssid,
      anchorRssi: req.body.anchorRssi,
      expectedFingerprint: req.body.expectedFingerprint,
    },
  });

  return sendSuccess(res, updated);
}

export async function deleteSchedule(req: Request, res: Response) {
  const id = req.params.id as string;

  const existing = await prisma.schedule.findUnique({ where: { id } });
  if (!existing) {
    return sendError(res, 'Schedule not found', 404);
  }

  const attendanceCount = await prisma.attendanceEvent.count({ where: { scheduleId: id } });
  if (attendanceCount > 0) {
    return sendError(res, `Cannot delete: ${attendanceCount} attendance record(s) exist for this schedule`, 409);
  }

  await prisma.schedule.delete({ where: { id } });

  return sendSuccess(res, { id });
}