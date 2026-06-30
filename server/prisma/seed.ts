import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@smartattend.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@smartattend.com',
      passwordHash,
      role: 'admin',
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@smartattend.com' },
    update: {},
    create: {
      name: 'Dr Smith',
      email: 'teacher@smartattend.com',
      passwordHash,
      role: 'teacher',
    },
  });

  const student = await prisma.user.upsert({
    where: { email: 'student@smartattend.com' },
    update: {},
    create: {
      name: 'Bikram Student',
      email: 'student@smartattend.com',
      passwordHash,
      role: 'student',
    },
  });

  console.log('Seeded users:');
  console.log('  admin:', admin.email);
  console.log('  teacher:', teacher.email);
  console.log('  student:', student.email);
  console.log('  password for all:', 'password123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });