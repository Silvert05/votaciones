import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcrypt';
import 'dotenv/config';
import { PrismaClient } from './generated/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding...');

  const passwordHash = hashSync('rojo456', 12);

  const superAdmin = await prisma.usuario.upsert({
    where: { usuario: 'admin' },
    update: { email: 'admin@fierpi.com', nombre: 'Admin' },
    create: {
      usuario: 'admin',
      password: passwordHash,
      nombre: 'Admin',
      email: 'admin@fierpi.com',
      rol: 'ADMIN',
      activo: true,
      cambiarPassword: false,
    },
  });
  console.log(`✅ Usuario: ${superAdmin.usuario}`);

  // Usuario de ejemplo que debe cambiar la contraseña en su primer ingreso.
  const operador = await prisma.usuario.upsert({
    where: { usuario: 'operador' },
    update: {
      password: hashSync('temporal123', 12),
      cambiarPassword: true,
    },
    create: {
      usuario: 'operador',
      password: hashSync('temporal123', 12),
      nombre: 'Operador',
      email: 'operador@fierpi.com',
      rol: 'USER',
      activo: true,
      cambiarPassword: true,
    },
  });
  console.log(`✅ Usuario: ${operador.usuario} (debe cambiar contraseña)`);

  console.log('🌱 Seed completo');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
