import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();

let adminToken: string;
let teacherId: string;
let studentId: string;
const createdClassIds: string[] = [];

beforeAll(async () => {
  // Scoped cleanup: remove only this suite's fixtures from a previous run,
  // identified by the test-* email prefix, rather than wiping shared tables.
  const previousTestUsers = await prisma.user.findMany({
    where: { email: { startsWith: 'test-' } },
    select: { id: true },
  });
  const previousTestUserIds = previousTestUsers.map((u) => u.id);

  if (previousTestUserIds.length > 0) {
    await prisma.attendanceEvent.deleteMany({ where: { studentId: { in: previousTestUserIds } } });
    const previousTestClasses = await prisma.class.findMany({
      where: { teacherId: { in: previousTestUserIds } },
      select: { id: true },
    });
    const previousTestClassIds = previousTestClasses.map((c) => c.id);
    await prisma.schedule.deleteMany({ where: { classId: { in: previousTestClassIds } } });
    await prisma.enrollment.deleteMany({ where: { studentId: { in: previousTestUserIds } } });
    await prisma.class.deleteMany({ where: { id: { in: previousTestClassIds } } });
    await prisma.user.deleteMany({ where: { id: { in: previousTestUserIds } } });
  }

  const admin = await prisma.user.create({
    data: {
      name: 'Test Admin',
      email: 'test-admin@smartattend.com',
      passwordHash: 'irrelevant-for-this-test',
      role: 'admin',
    },
  });

  const teacher = await prisma.user.create({
    data: {
      name: 'Test Teacher',
      email: 'test-teacher@smartattend.com',
      passwordHash: 'irrelevant-for-this-test',
      role: 'teacher',
    },
  });

  const student = await prisma.user.create({
    data: {
      name: 'Test Student',
      email: 'test-student@smartattend.com',
      passwordHash: 'irrelevant-for-this-test',
      role: 'student',
    },
  });

  teacherId = teacher.id;
  studentId = student.id;

  const jwt = require('jsonwebtoken');
  adminToken = jwt.sign(
    { id: admin.id, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' },
  );
});

afterEach(async () => {
  if (createdClassIds.length > 0) {
    await prisma.schedule.deleteMany({ where: { classId: { in: createdClassIds } } });
    await prisma.class.deleteMany({ where: { id: { in: createdClassIds } } });
    createdClassIds.length = 0;
  }
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: 'test-' } } });
  await prisma.$disconnect();
});

describe('POST /api/classes', () => {
  it('creates a class when teacherId belongs to a real teacher', async () => {
    const response = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Client-Platform', 'web')
      .send({ name: 'Software Engineering', teacherId });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Software Engineering');
    createdClassIds.push(response.body.data.id);
  });

  it('rejects when teacherId belongs to a student, not a teacher', async () => {
    const response = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Client-Platform', 'web')
      .send({ name: 'Invalid Class', teacherId: studentId });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('rejects when name or teacherId is missing', async () => {
    const response = await request(app)
      .post('/api/classes')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Client-Platform', 'web')
      .send({ name: 'Missing Teacher' });

    expect(response.status).toBe(400);
  });
});

describe('DELETE /api/classes/:id', () => {
  it('deletes a class with no schedules attached', async () => {
    const created = await prisma.class.create({
      data: { name: 'Deletable Class', teacherId },
    });

    const response = await request(app)
      .delete(`/api/classes/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Client-Platform', 'web');

    expect(response.status).toBe(200);

    const stillExists = await prisma.class.findUnique({ where: { id: created.id } });
    expect(stillExists).toBeNull();
  });

  it('blocks deletion when the class has schedules attached', async () => {
    const created = await prisma.class.create({
      data: { name: 'Protected Class', teacherId },
    });
    createdClassIds.push(created.id);

    await prisma.schedule.create({
      data: {
        classId: created.id,
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '11:00',
        roomName: 'Room A',
        geofenceRadiusMetres: 50,
        verificationConfig: 'C2',
      },
    });

    const response = await request(app)
      .delete(`/api/classes/${created.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Client-Platform', 'web');

    expect(response.status).toBe(409);

    const stillExists = await prisma.class.findUnique({ where: { id: created.id } });
    expect(stillExists).not.toBeNull();
  });
});