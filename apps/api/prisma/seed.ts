import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcrypt';
import 'dotenv/config';
import { PrismaClient } from './generated/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding...');

  const passwordHash = hashSync('rojo456', 12);

  const dashboard = await prisma.opcion.upsert({
    where: { codigo: 'dashboard' },
    update: {
      titulo: 'Panel',
      ruta: '/admin/dashboard',
      icono: 'heroicons_outline:home',
      tipo: 'PANTALLA',
      orden: 10,
      activo: true,
    },
    create: {
      codigo: 'dashboard',
      titulo: 'Panel',
      ruta: '/admin/dashboard',
      icono: 'heroicons_outline:home',
      tipo: 'PANTALLA',
      orden: 10,
      activo: true,
    },
  });

  const seguridad = await prisma.opcion.upsert({
    where: { codigo: 'seguridad' },
    update: {
      titulo: 'Seguridad',
      icono: 'heroicons_outline:shield-check',
      tipo: 'GRUPO',
      orden: 20,
      activo: true,
    },
    create: {
      codigo: 'seguridad',
      titulo: 'Seguridad',
      icono: 'heroicons_outline:shield-check',
      tipo: 'GRUPO',
      orden: 20,
      activo: true,
    },
  });

  const opcionesSeguridad = await Promise.all([
    prisma.opcion.upsert({
      where: { codigo: 'seguridad.usuarios' },
      update: {
        titulo: 'Usuarios',
        ruta: '/admin/seguridad/usuarios',
        icono: 'heroicons_outline:user-group',
        tipo: 'PANTALLA',
        padreId: seguridad.id,
        orden: 10,
        activo: true,
      },
      create: {
        codigo: 'seguridad.usuarios',
        titulo: 'Usuarios',
        ruta: '/admin/seguridad/usuarios',
        icono: 'heroicons_outline:user-group',
        tipo: 'PANTALLA',
        padreId: seguridad.id,
        orden: 10,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'seguridad.perfiles' },
      update: {
        titulo: 'Perfiles',
        ruta: '/admin/seguridad/perfiles',
        icono: 'heroicons_outline:identification',
        tipo: 'PANTALLA',
        padreId: seguridad.id,
        orden: 20,
        activo: true,
      },
      create: {
        codigo: 'seguridad.perfiles',
        titulo: 'Perfiles',
        ruta: '/admin/seguridad/perfiles',
        icono: 'heroicons_outline:identification',
        tipo: 'PANTALLA',
        padreId: seguridad.id,
        orden: 20,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'seguridad.opciones' },
      update: {
        titulo: 'Opciones',
        ruta: '/admin/seguridad/opciones',
        icono: 'heroicons_outline:squares-2x2',
        tipo: 'PANTALLA',
        padreId: seguridad.id,
        orden: 30,
        activo: true,
      },
      create: {
        codigo: 'seguridad.opciones',
        titulo: 'Opciones',
        ruta: '/admin/seguridad/opciones',
        icono: 'heroicons_outline:squares-2x2',
        tipo: 'PANTALLA',
        padreId: seguridad.id,
        orden: 30,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'seguridad.auditoria' },
      update: {
        titulo: 'Auditoria',
        ruta: '/admin/seguridad/auditoria',
        icono: 'heroicons_outline:clipboard-document-check',
        tipo: 'PANTALLA',
        padreId: seguridad.id,
        orden: 40,
        activo: true,
      },
      create: {
        codigo: 'seguridad.auditoria',
        titulo: 'Auditoria',
        ruta: '/admin/seguridad/auditoria',
        icono: 'heroicons_outline:clipboard-document-check',
        tipo: 'PANTALLA',
        padreId: seguridad.id,
        orden: 40,
        activo: true,
      },
    }),
  ]);

  const elecciones = await prisma.opcion.upsert({
    where: { codigo: 'elecciones' },
    update: {
      titulo: 'Elecciones',
      icono: 'heroicons_outline:rectangle-stack',
      tipo: 'GRUPO',
      orden: 30,
      activo: true,
    },
    create: {
      codigo: 'elecciones',
      titulo: 'Elecciones',
      icono: 'heroicons_outline:rectangle-stack',
      tipo: 'GRUPO',
      orden: 30,
      activo: true,
    },
  });

  const opcionesElecciones = await Promise.all([
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.gestion' },
      update: {
        titulo: 'Gestion',
        ruta: '/admin/elecciones',
        icono: 'heroicons_outline:clipboard-document-list',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 10,
        activo: true,
      },
      create: {
        codigo: 'elecciones.gestion',
        titulo: 'Gestion',
        ruta: '/admin/elecciones',
        icono: 'heroicons_outline:clipboard-document-list',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 10,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.cronograma' },
      update: {
        titulo: 'Cronograma',
        ruta: '/admin/elecciones/cronograma',
        icono: 'heroicons_outline:calendar-days',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 20,
        activo: true,
      },
      create: {
        codigo: 'elecciones.cronograma',
        titulo: 'Cronograma',
        ruta: '/admin/elecciones/cronograma',
        icono: 'heroicons_outline:calendar-days',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 20,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.dignidades' },
      update: {
        titulo: 'Dignidades',
        ruta: '/admin/elecciones/dignidades',
        icono: 'heroicons_outline:identification',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 30,
        activo: true,
      },
      create: {
        codigo: 'elecciones.dignidades',
        titulo: 'Dignidades',
        ruta: '/admin/elecciones/dignidades',
        icono: 'heroicons_outline:identification',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 30,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.electores' },
      update: {
        titulo: 'Electores',
        ruta: '/admin/elecciones/electores',
        icono: 'heroicons_outline:users',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 40,
        activo: true,
      },
      create: {
        codigo: 'elecciones.electores',
        titulo: 'Electores',
        ruta: '/admin/elecciones/electores',
        icono: 'heroicons_outline:users',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 40,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.padron' },
      update: {
        titulo: 'Padron electoral',
        ruta: '/admin/elecciones/padron',
        icono: 'heroicons_outline:list-bullet',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 50,
        activo: true,
      },
      create: {
        codigo: 'elecciones.padron',
        titulo: 'Padron electoral',
        ruta: '/admin/elecciones/padron',
        icono: 'heroicons_outline:list-bullet',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 50,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.listas' },
      update: {
        titulo: 'Listas',
        ruta: '/admin/elecciones/listas',
        icono: 'heroicons_outline:swatch',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 60,
        activo: true,
      },
      create: {
        codigo: 'elecciones.listas',
        titulo: 'Listas',
        ruta: '/admin/elecciones/listas',
        icono: 'heroicons_outline:swatch',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 60,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.candidaturas' },
      update: {
        titulo: 'Candidaturas',
        ruta: '/admin/elecciones/candidaturas',
        icono: 'heroicons_outline:user-plus',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 70,
        activo: true,
      },
      create: {
        codigo: 'elecciones.candidaturas',
        titulo: 'Candidaturas',
        ruta: '/admin/elecciones/candidaturas',
        icono: 'heroicons_outline:user-plus',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 70,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.votacion' },
      update: {
        titulo: 'Votacion',
        ruta: '/admin/elecciones/votacion',
        icono: 'heroicons_outline:cursor-arrow-rays',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 80,
        activo: true,
      },
      create: {
        codigo: 'elecciones.votacion',
        titulo: 'Votacion',
        ruta: '/admin/elecciones/votacion',
        icono: 'heroicons_outline:cursor-arrow-rays',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 80,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.resultados' },
      update: {
        titulo: 'Resultados',
        ruta: '/admin/elecciones/resultados',
        icono: 'heroicons_outline:chart-bar',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 90,
        activo: true,
      },
      create: {
        codigo: 'elecciones.resultados',
        titulo: 'Resultados',
        ruta: '/admin/elecciones/resultados',
        icono: 'heroicons_outline:chart-bar',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 90,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.escrutinio' },
      update: {
        titulo: 'Escrutinio',
        ruta: '/admin/elecciones/escrutinio',
        icono: 'heroicons_outline:document-check',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 100,
        activo: true,
      },
      create: {
        codigo: 'elecciones.escrutinio',
        titulo: 'Escrutinio',
        ruta: '/admin/elecciones/escrutinio',
        icono: 'heroicons_outline:document-check',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 100,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.impugnaciones' },
      update: {
        titulo: 'Impugnaciones',
        ruta: '/admin/elecciones/impugnaciones',
        icono: 'heroicons_outline:scale',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 110,
        activo: true,
      },
      create: {
        codigo: 'elecciones.impugnaciones',
        titulo: 'Impugnaciones',
        ruta: '/admin/elecciones/impugnaciones',
        icono: 'heroicons_outline:scale',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 110,
        activo: true,
      },
    }),
    prisma.opcion.upsert({
      where: { codigo: 'elecciones.resultados_finales' },
      update: {
        titulo: 'Resultados finales',
        ruta: '/admin/elecciones/resultados-finales',
        icono: 'heroicons_outline:trophy',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 120,
        activo: true,
      },
      create: {
        codigo: 'elecciones.resultados_finales',
        titulo: 'Resultados finales',
        ruta: '/admin/elecciones/resultados-finales',
        icono: 'heroicons_outline:trophy',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 120,
        activo: true,
      },
    }),
  ]);

  const adminPerfil = await prisma.perfil.upsert({
    where: { nombre: 'Administrador General' },
    update: {
      descripcion: 'Acceso completo a las pantallas administrativas.',
      activo: true,
    },
    create: {
      nombre: 'Administrador General',
      descripcion: 'Acceso completo a las pantallas administrativas.',
      activo: true,
    },
  });

  const usuarioPerfil = await prisma.perfil.upsert({
    where: { nombre: 'Usuario' },
    update: {
      descripcion: 'Acceso basico al panel.',
      activo: true,
    },
    create: {
      nombre: 'Usuario',
      descripcion: 'Acceso basico al panel.',
      activo: true,
    },
  });

  await prisma.perfilOpcion.deleteMany({
    where: { perfilId: adminPerfil.id },
  });
  await prisma.perfilOpcion.createMany({
    data: [
      dashboard,
      seguridad,
      ...opcionesSeguridad,
      elecciones,
      ...opcionesElecciones,
    ].map((opcion) => ({
      perfilId: adminPerfil.id,
      opcionId: opcion.id,
    })),
  });

  await prisma.perfilOpcion.deleteMany({
    where: { perfilId: usuarioPerfil.id },
  });
  await prisma.perfilOpcion.create({
    data: {
      perfilId: usuarioPerfil.id,
      opcionId: dashboard.id,
    },
  });

  const superAdmin = await prisma.usuario.upsert({
    where: { usuario: 'admin' },
    update: {
      email: 'admin@fierpi.com',
      nombre: 'Admin',
      perfilId: adminPerfil.id,
    },
    create: {
      usuario: 'admin',
      password: passwordHash,
      nombre: 'Admin',
      email: 'admin@fierpi.com',
      rol: 'ADMIN',
      perfilId: adminPerfil.id,
      activo: true,
      cambiarPassword: false,
    },
  });
  console.log(`✅ Usuario: ${superAdmin.usuario}`);

  const operador = await prisma.usuario.upsert({
    where: { usuario: 'operador' },
    update: {
      password: hashSync('temporal123', 12),
      cambiarPassword: true,
      perfilId: usuarioPerfil.id,
    },
    create: {
      usuario: 'operador',
      password: hashSync('temporal123', 12),
      nombre: 'Operador',
      email: 'operador@fierpi.com',
      rol: 'USER',
      perfilId: usuarioPerfil.id,
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
