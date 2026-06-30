import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();

let adminToken: string;
let teacherId: string;
let classId: string;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@smartattend.com', password: 'password123' });

  console.log('LOGIN STATUS:', loginRes.status);
  console.log('LOGIN BODY:', JSON.stringify(loginRes.body));

  adminToken = loginRes.body.data.token;

  const teacher = await prisma.user.findUnique({ where: { email: 'teacher@smartattend.com' } });
  teacherId = teacher!.id;

  const classRecord = await prisma.class.create({
    data: { name: 'Schedule Test Class', teacherId },
  });
  classId = classRecord.id;
});

afterAll(async () => {
  await prisma.schedule.deleteMany({ where: { classId } });
  await prisma.class.delete({ where: { id: classId } });
  await prisma.$disconnect();
});

describe('Schedule routes', () => {
  let createdScheduleId: string;

  it('creates a schedule with valid data', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        classId,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        roomName: 'Room 101',
        verificationConfig: 'C3',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.roomName).toBe('Room 101');
    expect(res.body.data.verificationConfig).toBe('C3');
    createdScheduleId = res.body.data.id;
  });

  it('rejects invalid classId', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        classId: 'nonexistent-id',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        roomName: 'Room 101',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ classId });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('dayOfWeek is required');
  });

  it('rejects invalid verificationConfig', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        classId,
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        roomName: 'Room 102',
        verificationConfig: 'C9',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('verificationConfig must be one of');
  });

  it('rejects startTime after endTime', async () => {
    const res = await request(app)
      .post('/api/schedules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        classId,
        dayOfWeek: 1,
        startTime: '11:00',
        endTime: '10:00',
        roomName: 'Room 103',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('startTime must be before endTime');
  });

  it('lists schedules filtered by classId', async () => {
    const res = await request(app)
      .get(`/api/schedules?classId=${classId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((s: any) => s.classId === classId)).toBe(true);
  });

  it('updates a schedule', async () => {
    const res = await request(app)
      .patch(`/api/schedules/${createdScheduleId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ roomName: 'Room 101B' });

    expect(res.status).toBe(200);
    expect(res.body.data.roomName).toBe('Room 101B');
  });

  it('deletes a schedule with no attendance records', async () => {
    const res = await request(app)
      .delete(`/api/schedules/${createdScheduleId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('blocks deletion of a schedule with attendance records', async () => {
    const schedule = await prisma.schedule.create({
      data: { classId, dayOfWeek: 2, startTime: '09:00', endTime: '10:00', roomName: 'Room 104' },
    });
    const student = await prisma.user.findUnique({ where: { email: 'student@smartattend.com' } });

    await prisma.attendanceEvent.create({
      data: {
        studentId: student!.id,
        scheduleId: schedule.id,
        eventType: 'checkin',
        verificationConfig: 'C2',
        verificationOutcome: 'verified',
      },
    });

    const res = await request(app)
      .delete(`/api/schedules/${schedule.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);

    // cleanup
    await prisma.attendanceEvent.deleteMany({ where: { scheduleId: schedule.id } });
    await prisma.schedule.delete({ where: { id: schedule.id } });
  });
});