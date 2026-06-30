import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess, sendError } from '../utils/apiResponse';

const prisma = new PrismaClient();

interface ScanReading {
  bssid: string;
  rssi: number;
}

function validateScans(body: any): string[] {
  const errors: string[] = [];

  if (!Array.isArray(body.scans)) {
    errors.push('scans must be an array of scan points');
    return errors;
  }

  if (body.scans.length < 2) {
    errors.push('at least 2 scan points are required to merge a fingerprint');
    return errors;
  }

  body.scans.forEach((scan: any, i: number) => {
    if (!Array.isArray(scan)) {
      errors.push(`scan ${i} must be an array of {bssid, rssi} readings`);
      return;
    }
    scan.forEach((reading: any, j: number) => {
      if (typeof reading.bssid !== 'string' || reading.bssid.length === 0) {
        errors.push(`scan ${i} reading ${j} missing a valid bssid`);
      }
      if (typeof reading.rssi !== 'number' || reading.rssi > 0 || reading.rssi < -100) {
        errors.push(`scan ${i} reading ${j} rssi must be a number between -100 and 0`);
      }
    });
  });

  return errors;
}

function mergeScans(scans: ScanReading[][]): { fingerprint: { bssid: string; avgRssi: number }[]; anchorBssid: string; anchorRssi: number } {
  const readingsByBssid = new Map<string, number[]>();

  for (const scan of scans) {
    for (const reading of scan) {
      const existing = readingsByBssid.get(reading.bssid) ?? [];
      existing.push(reading.rssi);
      readingsByBssid.set(reading.bssid, existing);
    }
  }

  const fingerprint = Array.from(readingsByBssid.entries()).map(([bssid, rssiValues]) => ({
    bssid,
    avgRssi: rssiValues.reduce((sum, v) => sum + v, 0) / rssiValues.length,
  }));

  fingerprint.sort((a, b) => b.avgRssi - a.avgRssi);

  const anchor = fingerprint[0];

  return {
    fingerprint,
    anchorBssid: anchor.bssid,
    anchorRssi: Math.round(anchor.avgRssi),
  };
}

export async function captureFingerprint(req: Request, res: Response) {
  const id = req.params.id as string;

  const schedule = await prisma.schedule.findUnique({ where: { id } });
  if (!schedule) {
    return sendError(res, 'Schedule not found', 404);
  }

  const errors = validateScans(req.body);
  if (errors.length > 0) {
    return sendError(res, errors.join('; '), 400);
  }

  const { fingerprint, anchorBssid, anchorRssi } = mergeScans(req.body.scans);

  const updated = await prisma.schedule.update({
    where: { id },
    data: {
      expectedFingerprint: fingerprint,
      anchorBssid,
      anchorRssi,
    },
  });

  return sendSuccess(res, updated);
}

export async function getFingerprint(req: Request, res: Response) {
  const id = req.params.id as string;

  const schedule = await prisma.schedule.findUnique({
    where: { id },
    select: { id: true, roomName: true, expectedFingerprint: true, anchorBssid: true, anchorRssi: true },
  });

  if (!schedule) {
    return sendError(res, 'Schedule not found', 404);
  }

  return sendSuccess(res, schedule);
}