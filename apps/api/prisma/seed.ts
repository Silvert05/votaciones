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
      where: { codigo: 'elecciones.configuracion' },
      update: {
        titulo: 'Configuracion',
        ruta: '/admin/elecciones/configuracion',
        icono: 'heroicons_outline:paint-brush',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 15,
        activo: true,
      },
      create: {
        codigo: 'elecciones.configuracion',
        titulo: 'Configuracion',
        ruta: '/admin/elecciones/configuracion',
        icono: 'heroicons_outline:paint-brush',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 15,
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
      where: { codigo: 'elecciones.jornada' },
      update: {
        titulo: 'Jornada electoral',
        ruta: '/admin/elecciones/jornada',
        icono: 'heroicons_outline:flag',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 75,
        activo: true,
      },
      create: {
        codigo: 'elecciones.jornada',
        titulo: 'Jornada electoral',
        ruta: '/admin/elecciones/jornada',
        icono: 'heroicons_outline:flag',
        tipo: 'PANTALLA',
        padreId: elecciones.id,
        orden: 75,
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
      email: 'admin@yavirac.edu.ec',
      nombre: 'Admin',
      perfilId: adminPerfil.id,
    },
    create: {
      usuario: 'admin',
      password: passwordHash,
      nombre: 'Admin',
      email: 'admin@yavirac.edu.ec',
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
      email: 'operador@yavirac.edu.ec',
      rol: 'USER',
      perfilId: usuarioPerfil.id,
      activo: true,
      cambiarPassword: true,
    },
  });
  console.log(`✅ Usuario: ${operador.usuario} (debe cambiar contraseña)`);

  const catalogos = await seedCatalogos();
  await seedProcesoElectoral(catalogos);

  console.log('🌱 Seed completo');
}

// UUID fijo para poder re-sembrar de forma idempotente (borra y recrea).
const ELECCION_DEMO_ID = '11111111-1111-4111-8111-111111111111';

// Clasificacion academica de los estudiantes demo (nombres del catalogo).
const DEMO_CARRERA = 'DESARROLLO DE SOFTWARE';
const DEMO_NIVEL = 'QUINTO';
const DEMO_PARALELO = 'A';
const DEMO_JORNADA = 'INTENSIVA';

interface ElectorSeed {
  identificacion: string;
  nombres: string;
  apellidos: string;
  tipo: 'DOCENTE' | 'ESTUDIANTE';
  email: string;
}

const ESTUDIANTES: ElectorSeed[] = [
  ['0102030401', 'Maria', 'Andrade'],
  ['0102030402', 'Juan', 'Bermeo'],
  ['0102030403', 'Camila', 'Castro'],
  ['0102030404', 'Diego', 'Delgado'],
  ['0102030405', 'Elena', 'Espinoza'],
  ['0102030406', 'Fabian', 'Freire'],
  ['0102030407', 'Gabriela', 'Guaman'],
  ['0102030408', 'Hugo', 'Herrera'],
  ['0102030409', 'Ivonne', 'Ibarra'],
  ['0102030410', 'Kevin', 'Jara'],
  ['0102030411', 'Lucia', 'Leon'],
  ['0102030412', 'Mateo', 'Morales'],
].map(([identificacion, nombres, apellidos]) => ({
  identificacion,
  nombres,
  apellidos,
  tipo: 'ESTUDIANTE' as const,
  email: `${nombres.toLowerCase()}.${apellidos.toLowerCase()}@estudiante.yavirac.edu.ec`,
}));

const DOCENTES: ElectorSeed[] = [
  ['0203040501', 'Nadia', 'Navarro'],
  ['0203040502', 'Oscar', 'Ordonez'],
  ['0203040503', 'Paola', 'Pena'],
  ['0203040504', 'Ramiro', 'Quezada'],
  ['0203040505', 'Sofia', 'Ramos'],
  ['0203040506', 'Tomas', 'Salazar'],
  ['0203040507', 'Ursula', 'Torres'],
  ['0203040508', 'Victor', 'Vega'],
].map(([identificacion, nombres, apellidos]) => ({
  identificacion,
  nombres,
  apellidos,
  tipo: 'DOCENTE' as const,
  email: `${nombres.toLowerCase()}.${apellidos.toLowerCase()}@yavirac.edu.ec`,
}));

// ---------------------------------------------------------------------------
// Catalogos academicos. Fuente: docs/MAESTRO DE PARALELOS.xls (periodo 2026-1P).
// Nombres en MAYUSCULAS tal como el maestro institucional. Sirven para
// clasificar al elector (carrera / nivel / paralelo / jornada) en reportes.
// ---------------------------------------------------------------------------
const CARRERAS = [
  'ARTE CULINARIO ECUATORIANO',
  'CENTRO DE IDIOMAS YAVIRAC',
  'DESARROLLO DE SOFTWARE',
  'DISEÑO DE MODAS',
  'DISEÑO DE MODAS CON NIVEL EQUIVALENTE A TECNOLOGIA SUPERIOR',
  'GUIA NACIONAL DE TURISMO',
  'GUIA NACIONAL DE TURISMO CON NIVEL EQUIVALENTE A TECNOLOGIA SUPERIOR',
  'IMPULSAT V01 VIRTUAL',
  'MARKETING DIGITAL',
  'TECNOLOGIA EN MARKETING',
  'TECNOLOGIA SUPERIOR EN DESARROLLO DE SOFTWARE',
  'TECNOLOGIA SUPERIOR EN MARKETING',
];

// Nivel academico con su orden natural.
const NIVELES: Array<[string, number]> = [
  ['PRIMERO', 1],
  ['SEGUNDO', 2],
  ['TERCERO', 3],
  ['CUARTO', 4],
  ['QUINTO', 5],
  ['SEXTO', 6],
];

const PARALELOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'T', 'Z'];

// Jornada academica del elector. NOAPLICAJORNADA es el marcador "sin jornada".
const JORNADAS: Array<[string, number]> = [
  ['MATUTINA', 1],
  ['VESPERTINA', 2],
  ['NOCTURNA', 3],
  ['INTENSIVA', 4],
  ['NOAPLICAJORNADA', 9],
];

interface Catalogos {
  carreras: Map<string, string>;
  niveles: Map<string, string>;
  paralelos: Map<string, string>;
  jornadas: Map<string, string>;
}

async function seedCatalogos(): Promise<Catalogos> {
  console.log(
    '📚 Sembrando catalogos academicos (carrera, nivel, paralelo, jornada)...',
  );

  const carreras = new Map<string, string>();
  for (let i = 0; i < CARRERAS.length; i++) {
    const nombre = CARRERAS[i];
    const row = await prisma.carrera.upsert({
      where: { nombre },
      update: { orden: i + 1, activo: true },
      create: { nombre, orden: i + 1, activo: true },
    });
    carreras.set(nombre, row.id);
  }

  const niveles = new Map<string, string>();
  for (const [nombre, orden] of NIVELES) {
    const row = await prisma.nivel.upsert({
      where: { nombre },
      update: { orden, activo: true },
      create: { nombre, orden, activo: true },
    });
    niveles.set(nombre, row.id);
  }

  const paralelos = new Map<string, string>();
  for (let i = 0; i < PARALELOS.length; i++) {
    const nombre = PARALELOS[i];
    const row = await prisma.paralelo.upsert({
      where: { nombre },
      update: { orden: i + 1, activo: true },
      create: { nombre, orden: i + 1, activo: true },
    });
    paralelos.set(nombre, row.id);
  }

  const jornadas = new Map<string, string>();
  for (const [nombre, orden] of JORNADAS) {
    const row = await prisma.jornada.upsert({
      where: { nombre },
      update: { orden, activo: true },
      create: { nombre, orden, activo: true },
    });
    jornadas.set(nombre, row.id);
  }

  console.log(
    `✅ Catalogos: ${carreras.size} carreras, ${niveles.size} niveles, ${paralelos.size} paralelos, ${jornadas.size} jornadas.`,
  );
  return { carreras, niveles, paralelos, jornadas };
}

async function seedProcesoElectoral(catalogos: Catalogos) {
  console.log('🗳️  Sembrando proceso electoral de demostracion...');

  // Idempotencia: borrar la eleccion demo (cascade limpia dignidades,
  // listas, candidaturas, padron, votos, conteos y configuracion).
  await prisma.eleccion.deleteMany({ where: { id: ELECCION_DEMO_ID } });

  // Clasificacion academica demo (resuelta desde el catalogo por nombre).
  // Solo aplica a estudiantes; los docentes no llevan carrera/nivel/paralelo.
  const claseEstudiante = {
    carreraId: catalogos.carreras.get(DEMO_CARRERA) ?? null,
    nivelId: catalogos.niveles.get(DEMO_NIVEL) ?? null,
    paraleloId: catalogos.paralelos.get(DEMO_PARALELO) ?? null,
    jornadaId: catalogos.jornadas.get(DEMO_JORNADA) ?? null,
  };

  // Electores (globales) via upsert por identificacion.
  const electores = new Map<string, string>();
  for (const e of [...ESTUDIANTES, ...DOCENTES]) {
    const fotoUrl = `https://i.pravatar.cc/150?u=${e.identificacion}`;
    const clase =
      e.tipo === 'ESTUDIANTE'
        ? claseEstudiante
        : { carreraId: null, nivelId: null, paraleloId: null, jornadaId: null };
    const elector = await prisma.elector.upsert({
      where: { identificacion: e.identificacion },
      update: {
        nombres: e.nombres,
        apellidos: e.apellidos,
        tipo: e.tipo,
        email: e.email,
        fotoUrl,
        ...clase,
        activo: true,
      },
      create: {
        identificacion: e.identificacion,
        nombres: e.nombres,
        apellidos: e.apellidos,
        tipo: e.tipo,
        email: e.email,
        fotoUrl,
        ...clase,
        activo: true,
      },
    });
    electores.set(e.identificacion, elector.id);
  }

  // Eleccion en jornada de votacion abierta.
  const eleccion = await prisma.eleccion.create({
    data: {
      id: ELECCION_DEMO_ID,
      nombre: 'Eleccion Institucional Yavirac 2026 (Demo)',
      descripcion:
        'Proceso de demostracion precargado para simular el voto electronico de principio a fin.',
      tipo: 'INSTITUCIONAL',
      estado: 'VOTACION_ABIERTA',
      fechaConvocatoria: new Date('2026-06-01T08:00:00.000Z'),
    },
  });

  await prisma.historialEstadoEleccion.create({
    data: {
      eleccionId: eleccion.id,
      estadoAnterior: null,
      estadoNuevo: 'VOTACION_ABIERTA',
      comentario: 'Jornada de votacion abierta (datos de demostracion).',
      usuario: 'seed',
    },
  });

  // Configuracion institucional (identidad visual del video VENP).
  await prisma.configuracionEleccion.create({
    data: {
      eleccionId: eleccion.id,
      nombreInstitucion: 'Instituto Superior Tecnologico Yavirac',
      logoUrl: '/img/logo.png',
      escudoUrl: '/img/logo.png',
      videoUrl: 'https://www.youtube.com/embed/AnuLEj7suo8',
      colorPrimario: '#1d4ed8',
      colorSecundario: '#0ea5e9',
      colorAcento: '#f59e0b',
      mensajeBienvenida:
        'Bienvenido al sistema de voto electronico. Selecciona tus preferencias y confirma tu voto.',
    },
  });

  // Cronograma coherente con la jornada abierta.
  await prisma.cronogramaElectoral.create({
    data: {
      eleccionId: eleccion.id,
      fechaConvocatoria: new Date('2026-06-01T08:00:00.000Z'),
      fechaPublicacionPadron: new Date('2026-06-05T08:00:00.000Z'),
      fechaInicioInscripcion: new Date('2026-06-08T08:00:00.000Z'),
      fechaFinInscripcion: new Date('2026-06-12T18:00:00.000Z'),
      fechaPublicacionCandidaturas: new Date('2026-06-15T08:00:00.000Z'),
      fechaInicioCampania: new Date('2026-06-16T08:00:00.000Z'),
      fechaFinCampania: new Date('2026-06-28T18:00:00.000Z'),
      fechaInicioVotacion: new Date('2026-06-30T08:00:00.000Z'),
      fechaFinVotacion: new Date('2026-06-30T18:00:00.000Z'),
      fechaPublicacionResultados: new Date('2026-06-30T19:00:00.000Z'),
    },
  });

  // Listas / organizaciones politicas.
  const listasData = [
    { codigo: 'A', nombre: 'Lista Unidad', color: '#2563eb' },
    { codigo: 'B', nombre: 'Lista Renovacion', color: '#16a34a' },
    { codigo: 'C', nombre: 'Lista Compromiso', color: '#dc2626' },
  ];
  const listas = new Map<string, string>();
  for (const l of listasData) {
    const lista = await prisma.listaElectoral.create({
      data: {
        eleccionId: eleccion.id,
        codigo: l.codigo,
        nombre: l.nombre,
        color: l.color,
        estado: 'CALIFICADA',
        propuesta: `Propuesta de la ${l.nombre}.`,
      },
    });
    listas.set(l.codigo, lista.id);
  }

  // Dignidades / cargos a elegir.
  const dignPresidente = await prisma.dignidad.create({
    data: {
      eleccionId: eleccion.id,
      nombre: 'Presidente del Consejo Estudiantil',
      tipoElectorPermitido: 'ESTUDIANTE',
      cantidadGanadores: 1,
      requiereLista: true,
      orden: 1,
    },
  });
  const dignRepEstudiantes = await prisma.dignidad.create({
    data: {
      eleccionId: eleccion.id,
      nombre: 'Representantes Estudiantiles del Instituto',
      tipoElectorPermitido: 'ESTUDIANTE',
      cantidadGanadores: 2,
      requiereLista: true,
      orden: 2,
    },
  });
  const dignRepDocentes = await prisma.dignidad.create({
    data: {
      eleccionId: eleccion.id,
      nombre: 'Representantes Docentes del Instituto',
      tipoElectorPermitido: 'DOCENTE',
      cantidadGanadores: 2,
      requiereLista: true,
      orden: 3,
    },
  });

  // Candidaturas calificadas: un candidato por lista en cada dignidad.
  const candidatosPresidente = ['0102030401', '0102030402', '0102030403'];
  const candidatosRepEst = ['0102030404', '0102030405', '0102030406'];
  const candidatosRepDoc = ['0203040501', '0203040502', '0203040503'];
  const codigosLista = ['A', 'B', 'C'];

  async function crearCandidaturas(dignidadId: string, ids: string[]) {
    const result: Array<{ candidaturaId: string; codigoLista: string }> = [];
    for (let i = 0; i < ids.length; i++) {
      const codigoLista = codigosLista[i];
      const candidatura = await prisma.candidatura.create({
        data: {
          eleccionId: eleccion.id,
          dignidadId,
          electorId: electores.get(ids[i])!,
          listaId: listas.get(codigoLista)!,
          orden: i + 1,
          estado: 'CALIFICADA',
        },
      });
      result.push({ candidaturaId: candidatura.id, codigoLista });
    }
    return result;
  }

  const candPresidente = await crearCandidaturas(
    dignPresidente.id,
    candidatosPresidente,
  );
  const candRepEst = await crearCandidaturas(
    dignRepEstudiantes.id,
    candidatosRepEst,
  );
  const candRepDoc = await crearCandidaturas(
    dignRepDocentes.id,
    candidatosRepDoc,
  );

  // Padron electoral publicado y habilitado (todos los electores demo).
  // Credencial de votante conocida para pruebas: DNI + CLAVE_DEMO.
  const fechaPublicacion = new Date('2026-06-05T08:00:00.000Z');
  const CLAVE_DEMO = 'Voto2026';
  const claveHash = hashSync(CLAVE_DEMO, 10);
  await prisma.padronElectoral.createMany({
    data: [...electores.values()].map((electorId) => ({
      eleccionId: eleccion.id,
      electorId,
      estado: 'HABILITADO' as const,
      publicado: true,
      fechaPublicacion,
      credencialHash: claveHash,
      credencialGeneradaAt: fechaPublicacion,
      credencialEnviadaAt: fechaPublicacion,
      credencialVersion: 1,
    })),
  });

  // Simulacion de votos (participacion ~80%, con un ganador marcado por lista A).
  const votosEmitidos: Array<{
    eleccionId: string;
    dignidadId: string;
    electorId: string;
  }> = [];
  const conteoAcc = new Map<
    string,
    {
      dignidadId: string;
      candidaturaId: string | null;
      tipo: 'CANDIDATO' | 'BLANCO' | 'NULO';
      opcionKey: string;
      total: number;
    }
  >();

  function registrarVoto(
    dignidadId: string,
    electorId: string,
    candidatos: Array<{ candidaturaId: string; codigoLista: string }>,
    i: number,
  ) {
    let tipo: 'CANDIDATO' | 'BLANCO' | 'NULO';
    let candidaturaId: string | null;
    let opcionKey: string;

    if (i % 11 === 5) {
      tipo = 'BLANCO';
      candidaturaId = null;
      opcionKey = 'BLANCO';
    } else if (i % 17 === 7) {
      tipo = 'NULO';
      candidaturaId = null;
      opcionKey = 'NULO';
    } else {
      // Sesgo hacia la lista A para producir un ganador claro.
      const idx = i % 3 === 0 ? 0 : i % candidatos.length;
      const elegido = candidatos[idx];
      tipo = 'CANDIDATO';
      candidaturaId = elegido.candidaturaId;
      opcionKey = elegido.candidaturaId;
    }

    votosEmitidos.push({ eleccionId: eleccion.id, dignidadId, electorId });

    const key = `${dignidadId}:${opcionKey}`;
    const prev = conteoAcc.get(key);
    if (prev) {
      prev.total += 1;
    } else {
      conteoAcc.set(key, {
        dignidadId,
        candidaturaId,
        tipo,
        opcionKey,
        total: 1,
      });
    }
  }

  const idsEstudiantes = ESTUDIANTES.map((e) => e.identificacion);
  const idsDocentes = DOCENTES.map((e) => e.identificacion);

  idsEstudiantes.forEach((ident, i) => {
    if (i % 5 === 4) return; // ~20% abstencion
    const electorId = electores.get(ident)!;
    registrarVoto(dignPresidente.id, electorId, candPresidente, i);
    registrarVoto(dignRepEstudiantes.id, electorId, candRepEst, i + 2);
  });

  idsDocentes.forEach((ident, i) => {
    if (i % 6 === 5) return; // pequena abstencion docente
    const electorId = electores.get(ident)!;
    registrarVoto(dignRepDocentes.id, electorId, candRepDoc, i);
  });

  await prisma.votoEmitido.createMany({ data: votosEmitidos });
  await prisma.padronElectoral.updateMany({
    where: {
      eleccionId: eleccion.id,
      electorId: { in: [...new Set(votosEmitidos.map((voto) => voto.electorId))] },
    },
    data: {
      credencialHash: null,
      credencialRevocadaAt: new Date('2026-06-15T12:00:00.000Z'),
    },
  });
  await prisma.conteoVoto.createMany({
    data: [...conteoAcc.values()].map((c) => ({
      eleccionId: eleccion.id,
      dignidadId: c.dignidadId,
      candidaturaId: c.candidaturaId,
      tipo: c.tipo,
      opcionKey: c.opcionKey,
      total: c.total,
    })),
  });

  // Jornada electoral en el paso 3 (Votacion iniciada, link activo, cronometro corriendo).
  const fechaFinVotacion = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const jornada = await prisma.jornadaElectoral.create({
    data: {
      eleccionId: eleccion.id,
      configBloqueada: true,
      inicializadaAt: new Date('2026-06-30T07:30:00.000Z'),
      puestaCeroAt: new Date('2026-06-30T07:45:00.000Z'),
      votacionIniciadaAt: new Date('2026-06-30T08:00:00.000Z'),
      fechaFinVotacion,
      linkVotacionActivo: true,
    },
  });
  await prisma.jornadaEvento.createMany({
    data: [
      {
        jornadaId: jornada.id,
        paso: 'INICIALIZACION',
        reporte: 'Jornada inicializada. Configuracion bloqueada.',
        usuario: 'seed',
      },
      {
        jornadaId: jornada.id,
        paso: 'PUESTA_A_CERO',
        reporte: 'Puesta a cero verificada al inicio.',
        usuario: 'seed',
      },
      {
        jornadaId: jornada.id,
        paso: 'INICIO_VOTACION',
        reporte: 'Votacion iniciada. Link de votante habilitado.',
        usuario: 'seed',
      },
    ],
  });

  // Electores que aun NO han votado (utiles para probar el portal del votante).
  const noVotaron = [
    ...idsEstudiantes.filter((_, i) => i % 5 === 4),
    ...idsDocentes.filter((_, i) => i % 6 === 5),
  ];

  console.log(
    `✅ Eleccion demo: ${electores.size} electores, 3 dignidades, ${
      candPresidente.length + candRepEst.length + candRepDoc.length
    } candidaturas, ${votosEmitidos.length} votos emitidos.`,
  );
  console.log(
    `🔑 Credencial de votante para pruebas: clave = "${CLAVE_DEMO}" (para cualquier DNI del padron).`,
  );
  console.log(
    `🗳️  DNIs que aun no votan (para probar el flujo): ${noVotaron.join(', ')}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
