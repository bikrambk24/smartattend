import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();

let studentToken: string;
let studentUserId: string;
let teacherId: string;
let classId: string;
let scheduleId: string;

beforeAll(async () => {
  const studentLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student@smartattend.com', password: 'password123' });
  studentToken = studentLogin.body.data.token;

  const student = await prisma.user.findUnique({ where: { email: 'student@smartattend.com' } });
  studentUserId = student!.id;

  const teacher = await prisma.user.findUnique({ where: { email: 'teacher@smartattend.com' } });
  teacherId = teacher!.id;

  const classRecord = await prisma.class.create({
    data: { name: 'Attendance Test Class', teacherId },
  });
  classId = classRecord.id;

  const schedule = await prisma.schedule.create({
    data: {
      classId,
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:00',
      roomName: 'Attendance Room',
      verificationConfig: 'C0', // GPS-only keeps the happy-path test simple and deterministic
      geofenceLat: 51.5074,
      geofenceLng: -0.1278,
      geofenceRadiusMetres: 50,
      sessionOpen: true,
    },
  });
  scheduleId = schedule.id;
});

afterEach(async () => {
  await prisma.attendanceEvent.deleteMany({ where: { scheduleId } });
});

afterAll(async () => {
  await prisma.schedule.deleteMany({ where: { classId } });
  await prisma.class.delete({ where: { id: classId } });
  await prisma.user.update({ where: { id: studentUserId }, data: { deviceId: null } });
  await prisma.$disconnect();
});

describe('Attendance check-in', () => {
  it('verifies a check-in when the student is inside the geofence (C0)', async () => {
    const res = await request(app)
      .post('/api/attendance/checkin')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scheduleId,
        studentLat: 51.5074,
        studentLng: -0.1278,
        gpsAccuracyMetres: 5,
        studentScan: [],
        deviceId: 'device-abc-123',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.verificationOutcome).toBe('verified');
    expect(res.body.data.geofenceResult).toBe('inside');
  });

  it('rejects a duplicate check-in for the same open session', async () => {
    await request(app)
      .post('/api/attendance/checkin')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scheduleId,
        studentLat: 51.5074,
        studentLng: -0.1278,
        studentScan: [],
        deviceId: 'device-abc-123',
      });

    const res = await request(app)
      .post('/api/attendance/checkin')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scheduleId,
        studentLat: 51.5074,
        studentLng: -0.1278,
        studentScan: [],
        deviceId: 'device-abc-123',
      });

    expect(res.status).toBe(409);
  });

  it('rejects check-in when the session is closed', async () => {
    await prisma.schedule.update({ where: { id: scheduleId }, data: { sessionOpen: false } });

    const res = await request(app)
      .post('/api/attendance/checkin')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scheduleId,
        studentLat: 51.5074,
        studentLng: -0.1278,
        studentScan: [],
        deviceId: 'device-abc-123',
      });

    expect(res.status).toBe(409);

    await prisma.schedule.update({ where: { id: scheduleId }, data: { sessionOpen: true } });
  });

  it('marks outcome unverified when the student is far outside the geofence', async () => {
    const res = await request(app)
      .post('/api/attendance/checkin')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scheduleId,
        studentLat: 0,
        studentLng: 0,
        studentScan: [],
        deviceId: 'device-abc-123',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.verificationOutcome).toBe('unverified');
    expect(res.body.data.geofenceResult).toBe('outside');
  });
});

describe('Attendance check-out', () => {
  it('checks out cleanly after a matching check-in', async () => {
    await request(app)
      .post('/api/attendance/checkin')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        scheduleId,
        studentLat: 51.5074,
        studentLng: -0.1278,
        studentScan: [],
        deviceId: 'device-abc-123',
      });

    const res = await request(app)
      .post('/api/attendance/checkout')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ scheduleId });

    expect(res.status).toBe(201);
    expect(res.body.data.flagged).toBe(false);
  });

  it('flags but allows check-out with no matching check-in', async () => {
    const res = await request(app)
      .post('/api/attendance/checkout')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ scheduleId });

    expect(res.status).toBe(201);
    expect(res.body.data.flagged).toBe(true);
  });

  it('rejects check-out when the session is closed', async () => {
    await prisma.schedule.update({ where: { id: scheduleId }, data: { sessionOpen: false } });

    const res = await request(app)
      .post('/api/attendance/checkout')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ scheduleId });

    expect(res.status).toBe(409);

    await prisma.schedule.update({ where: { id: scheduleId }, data: { sessionOpen: true } });
  });
});