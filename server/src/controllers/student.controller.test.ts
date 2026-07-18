import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import app from '../app';

const prisma = new PrismaClient();

let adminToken: string;
let teacherAToken: string;
let teacherBToken: string;
let studentId: string;

beforeAll(async () => {
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@smartattend.com', password: 'password123' });
  adminToken = adminLogin.body.data.token;

  const passwordHash = await bcrypt.hash('password123', 10);

  const teacherA = await prisma.user.create({
    data: { name: 'Student Search Teacher A', email: 'student-search-teacher-a@smartattend.com', passwordHash, role: 'teacher' },
  });
  const teacherB = await prisma.user.create({
    data: { name: 'Student Search Teacher B', email: 'student-search-teacher-b@smartattend.com', passwordHash, role: 'teacher' },
  });
  const student = await prisma.user.create({
    data: { name: 'Student Search Student', email: 'student-search-student@smartattend.com', passwordHash, role: 'student' },
  });
  studentId = student.id;

  const classA = await prisma.class.create({ data: { name: 'Student Search Class A', teacherId: teacherA.id } });
  await prisma.class.create({ data: { name: 'Student Search Class B', teacherId: teacherB.id } });

  await prisma.enrollment.create({ data: { studentId, classId: classA.id } });

  const teacherALogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student-search-teacher-a@smartattend.com', password: 'password123' });
  teacherAToken = teacherALogin.body.data.token;

  const teacherBLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student-search-teacher-b@smartattend.com', password: 'password123' });
  teacherBToken = teacherBLogin.body.data.token;
});

afterAll(async () => {
  await prisma.enrollment.deleteMany({ where: { studentId } });
  await prisma.class.deleteMany({ where: { name: { in: ['Student Search Class A', 'Student Search Class B'] } } });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'student-search-teacher-a@smartattend.com',
          'student-search-teacher-b@smartattend.com',
          'student-search-student@smartattend.com',
        ],
      },
    },
  });
  await prisma.$disconnect();
});

describe('Student search and profile', () => {
  it('lets admin list all students, including this one', async () => {
    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((s: any) => s.id === studentId)).toBe(true);
  });

  it('lets a teacher see a student enrolled in their own class', async () => {
    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${teacherAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((s: any) => s.id === studentId)).toBe(true);
  });

  it('does not let a different teacher see a student outside their classes', async () => {
    const res = await request(app).get('/api/students').set('Authorization', `Bearer ${teacherBToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((s: any) => s.id === studentId)).toBe(false);
  });

  it('lets the owning teacher view the student profile', async () => {
    const res = await request(app)
      .get(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${teacherAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.student.id).toBe(studentId);
  });

  it('blocks a non-owning teacher from viewing the student profile', async () => {
    const res = await request(app)
      .get(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${teacherBToken}`);
    expect(res.status).toBe(403);
  });

  it('lets admin view any student profile', async () => {
    const res = await request(app)
      .get(`/api/students/${studentId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});