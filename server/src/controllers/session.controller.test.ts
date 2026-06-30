import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();

let teacherToken: string;
let otherTeacherToken: string;
let adminToken: string;
let classId: string;
let scheduleId: string;
let studentId: string;

beforeAll(async () => {
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@smartattend.com', password: 'password123' });
  adminToken = adminLogin.body.data.token;

  const teacherLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'teacher@smartattend.com', password: 'password123' });
  teacherToken = teacherLogin.body.data.token;

  const teacher = await prisma.user.findUnique({ where: { email: 'teacher@smartattend.com' } });
  const student = await prisma.user.findUnique({ where: { email: 'student@smartattend.com' } });
  studentId = student!.id;

  // A second teacher account, used only to prove ownership checks work.
  const otherTeacher = await prisma.user.upsert({
    where: { email: 'other-teacher@smartattend.com' },
    update: {},
    create: {
      name: 'Other Teacher',
      email: 'other-teacher@smartattend.com',
      passwordHash: (await import('bcryptjs')).default.hashSync('password123', 10),
      role: 'teacher',
    },
  });
  const otherLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'other-teacher@smartattend.com', password: 'password123' });
  otherTeacherToken = otherLogin.body.data.token;

  const classRecord = await prisma.class.create({
    data: { name: 'Session Test Class', teacherId: teacher!.id },
  });
  classId = classRecord.id;

  const schedule = await prisma.schedule.create({
    data: { classId, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', roomName: 'Session Room' },
  });
  scheduleId = schedule.id;
});

afterAll(async () => {
  await prisma.attendanceEvent.deleteMany({ where: { scheduleId } });
  await prisma.schedule.deleteMany({ where: { classId } });
  await prisma.class.delete({ where: { id: classId } });
  await prisma.user.deleteMany({ where: { email: 'other-teacher@smartattend.com' } });
  await prisma.$disconnect();
});

describe('Session routes', () => {
  it('lets the owning teacher start a session', async () => {
    const res = await request(app)
      .post(`/api/sessions/${scheduleId}/start`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessionOpen).toBe(true);
  });

  it('blocks a non-owning teacher from ending the session', async () => {
    const res = await request(app)
      .post(`/api/sessions/${scheduleId}/end`)
      .set('Authorization', `Bearer ${otherTeacherToken}`);

    expect(res.status).toBe(403);
  });

  it('lets admin view the live roster without owning the class', async () => {
    const res = await request(app)
      .get(`/api/sessions/${scheduleId}/roster`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('confirms a flagged check-in for the owning teacher', async () => {
    const event = await prisma.attendanceEvent.create({
      data: {
        studentId,
        scheduleId,
        eventType: 'checkin',
        verificationConfig: 'C5',
        verificationOutcome: 'partial',
        flagged: true,
        flagReasons: ['shared device'],
      },
    });

    const res = await request(app)
      .patch(`/api/sessions/events/${event.id}/review`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ decision: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.data.teacherDecision).toBe('confirmed');
  });

  it('lets the owning teacher end the session', async () => {
    const res = await request(app)
      .post(`/api/sessions/${scheduleId}/end`)
      .set('Authorization', `Bearer ${teacherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.sessionOpen).toBe(false);
  });
});