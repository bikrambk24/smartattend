import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app';

const prisma = new PrismaClient();

let adminToken: string;
let teacherId: string;
let classId: string;
let scheduleId: string;

beforeAll(async () => {
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@smartattend.com', password: 'password123' });
  adminToken = loginRes.body.data.token;

  const teacher = await prisma.user.findUnique({ where: { email: 'teacher@smartattend.com' } });
  teacherId = teacher!.id;

  const classRecord = await prisma.class.create({
    data: { name: 'Fingerprint Test Class', teacherId },
  });
  classId = classRecord.id;

  const schedule = await prisma.schedule.create({
    data: { classId, dayOfWeek: 1, startTime: '09:00', endTime: '10:00', roomName: 'Fingerprint Room' },
  });
  scheduleId = schedule.id;
});

afterAll(async () => {
  await prisma.schedule.deleteMany({ where: { classId } });
  await prisma.class.delete({ where: { id: classId } });
  await prisma.$disconnect();
});

describe('Fingerprint capture', () => {
  it('merges multiple scan points into an averaged fingerprint with anchor', async () => {
    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/fingerprint`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        scans: [
          [
            { bssid: 'AA:AA:AA:AA:AA:01', rssi: -40 },
            { bssid: 'BB:BB:BB:BB:BB:02', rssi: -65 },
          ],
          [
            { bssid: 'AA:AA:AA:AA:AA:01', rssi: -44 },
            { bssid: 'BB:BB:BB:BB:BB:02', rssi: -70 },
          ],
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.data.anchorBssid).toBe('AA:AA:AA:AA:AA:01');
    expect(res.body.data.anchorRssi).toBe(-42);
    expect(res.body.data.expectedFingerprint).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bssid: 'AA:AA:AA:AA:AA:01', avgRssi: -42 }),
        expect.objectContaining({ bssid: 'BB:BB:BB:BB:BB:02', avgRssi: -67.5 }),
      ]),
    );
  });

  it('rejects fewer than 2 scan points', async () => {
    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/fingerprint`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ scans: [[{ bssid: 'AA:AA:AA:AA:AA:01', rssi: -40 }]] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('at least 2 scan points');
  });

  it('rejects an invalid rssi value', async () => {
    const res = await request(app)
      .post(`/api/schedules/${scheduleId}/fingerprint`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        scans: [
          [{ bssid: 'AA:AA:AA:AA:AA:01', rssi: 5 }],
          [{ bssid: 'AA:AA:AA:AA:AA:01', rssi: -40 }],
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('rssi must be a number between -100 and 0');
  });

  it('retrieves the saved fingerprint', async () => {
    const res = await request(app)
      .get(`/api/schedules/${scheduleId}/fingerprint`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.anchorBssid).toBe('AA:AA:AA:AA:AA:01');
  });

  it('returns 404 for a nonexistent schedule', async () => {
    const res = await request(app)
      .get('/api/schedules/nonexistent-id/fingerprint')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});