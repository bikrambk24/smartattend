import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { orchestrateCheckIn, orchestrateCheckOut } from '../services/verification';

const prisma = new PrismaClient();

function validateCheckInBody(body: any): string[] {
  const errors: string[] = [];
  if (!body.scheduleId) errors.push('scheduleId is required');
  if (typeof body.studentLat !== 'number') errors.push('studentLat must be a number');
  if (typeof body.studentLng !== 'number') errors.push('studentLng must be a number');
  if (!Array.isArray(body.studentScan)) errors.push('studentScan must be an array of {bssid, rssi}');
  if (!body.deviceId) errors.push('deviceId is required');
  return errors;
}

export async function checkIn(req: Request, res: Response) {
  const studentId = req.user!.userId;
  const errors = validateCheckInBody(req.body);
  if (errors.length > 0) {
    return sendError(res, errors.join('; '), 400);
  }

  const schedule = await prisma.schedule.findUnique({ where: { id: req.body.scheduleId } });
  if (!schedule) {
    return sendError(res, 'Schedule not found', 404);
  }

  const student = await prisma.user.findUnique({ where: { id: studentId } });

  const lastEvent = await prisma.attendanceEvent.findFirst({
    where: { studentId, scheduleId: schedule.id },
    orderBy: { timestamp: 'desc' },
  });
  const hasOpenCheckInAlready = lastEvent?.eventType === 'checkin';

  const deviceOwner = await prisma.user.findFirst({
    where: { deviceId: req.body.deviceId, role: 'student', NOT: { id: studentId } },
  });

  const mostRecentPriorCheckIn = await prisma.attendanceEvent.findFirst({
    where: { studentId, eventType: 'checkin' },
    orderBy: { timestamp: 'desc' },
    include: { schedule: { select: { roomName: true } } },
  });

  const checkInTimestamp = new Date();

  const result = orchestrateCheckIn({
    verificationConfig: schedule.verificationConfig as any,

    studentLat: req.body.studentLat,
    studentLng: req.body.studentLng,
    geofenceLat: schedule.geofenceLat ?? 0,
    geofenceLng: schedule.geofenceLng ?? 0,
    geofenceRadiusMetres: schedule.geofenceRadiusMetres,
    gpsAccuracyMetres: req.body.gpsAccuracyMetres,

    roomFingerprint: (schedule.expectedFingerprint as any) ?? [],
    studentScan: req.body.studentScan,
    anchorBssid: schedule.anchorBssid,

    incomingDeviceId: req.body.deviceId,
    boundDeviceId: student?.deviceId ?? null,

    sessionOpen: schedule.sessionOpen,
    hasOpenCheckInAlready,

    currentStudentId: studentId,
    deviceOwnerStudentId: deviceOwner?.id ?? null,
    roomName: schedule.roomName,
    checkInTimestamp,
    mostRecentPriorCheckIn: mostRecentPriorCheckIn
      ? { roomName: mostRecentPriorCheckIn.schedule.roomName, timestamp: mostRecentPriorCheckIn.timestamp }
      : null,
  });

  if (!result.allowed) {
    return sendError(res, `Check-in rejected: ${result.snapshot.rejectionReason}`, 409);
  }

  const event = await prisma.attendanceEvent.create({
    data: {
      studentId,
      scheduleId: schedule.id,
      eventType: 'checkin',
      timestamp: checkInTimestamp,

      wifiScanResult: req.body.studentScan,
      jaccardScore: result.snapshot.jaccardScore as number | undefined,
      anchorMatch: result.snapshot.anchorMatch as boolean | undefined,
      anchorRssi: result.snapshot.anchorRssi as number | undefined,

      gpsLat: req.body.studentLat,
      gpsLng: req.body.studentLng,
      gpsAccuracyMetres: req.body.gpsAccuracyMetres,
      geofenceResult: result.snapshot.geofenceResult as any,
      gpsDistanceMetres: result.snapshot.gpsDistanceMetres as number | undefined,

      deviceId: req.body.deviceId,
      deviceBound: result.snapshot.deviceBound as boolean | undefined,

      verificationConfig: schedule.verificationConfig,
      verificationOutcome: result.verificationOutcome!,

      flagged: result.flagged,
      flagReasons: result.flagReasons,
    },
  });

  if (result.newBoundDeviceId) {
    await prisma.user.update({
      where: { id: studentId },
      data: { deviceId: result.newBoundDeviceId },
    });
  }

  return sendSuccess(res, event, 201);
}

export async function checkOut(req: Request, res: Response) {
  const studentId = req.user!.userId;

  if (!req.body.scheduleId) {
    return sendError(res, 'scheduleId is required', 400);
  }

  const schedule = await prisma.schedule.findUnique({ where: { id: req.body.scheduleId } });
  if (!schedule) {
    return sendError(res, 'Schedule not found', 404);
  }

  const lastEvent = await prisma.attendanceEvent.findFirst({
    where: { studentId, scheduleId: schedule.id },
    orderBy: { timestamp: 'desc' },
  });
  const hasMatchingOpenCheckIn = lastEvent?.eventType === 'checkin';

  const result = orchestrateCheckOut(schedule.sessionOpen, hasMatchingOpenCheckIn);

  if (!result.allowed) {
    return sendError(res, `Check-out rejected: ${result.flagReasons.join(', ') || 'session closed'}`, 409);
  }

  const event = await prisma.attendanceEvent.create({
    data: {
      studentId,
      scheduleId: schedule.id,
      eventType: 'checkout',
      verificationConfig: schedule.verificationConfig,
      verificationOutcome: 'verified',
      flagged: result.flagged,
      flagReasons: result.flagReasons,
    },
  });

  return sendSuccess(res, event, 201);
}

export async function getMySchedules(req: Request, res: Response) {
  const studentId = req.user!.userId;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      class: {
        include: { schedules: true },
      },
    },
  });

  const schedules = enrollments.flatMap((e) =>
    e.class.schedules.map((s) => ({
      ...s,
      className: e.class.name,
    })),
  );

  return sendSuccess(res, schedules);
}