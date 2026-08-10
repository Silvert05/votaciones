import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { PrismaClient } from './generated/client';

/**
 * Actualiza SOLO la columna `icono` de las Opciones existentes (los nombres
 * de icono heroicons_outline:* de antes cambiaron a lucide:*). A diferencia
 * de `db:seed`, este script no toca usuarios, perfiles, ni la eleccion demo
 * (no hay ningun delete): es seguro correrlo sobre una base de datos con
 * datos reales de prueba ya cargados.
 *
 * Uso: pnpm -C apps/api db:update-icons
 */

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ICONOS: Array<[codigo: string, icono: string]> = [
  ['dashboard', 'lucide:house'],
  ['seguridad', 'lucide:shield-check'],
  ['seguridad.usuarios', 'lucide:users-round'],
  ['seguridad.perfiles', 'lucide:id-card'],
  ['seguridad.opciones', 'lucide:grid-2x2'],
  ['seguridad.auditoria', 'lucide:clipboard-check'],
  ['elecciones', 'lucide:layers'],
  ['elecciones.gestion', 'lucide:clipboard-list'],
  ['elecciones.configuracion', 'lucide:paintbrush'],
  ['elecciones.cronograma', 'lucide:calendar-days'],
  ['elecciones.dignidades', 'lucide:id-card'],
  ['elecciones.electores', 'lucide:users'],
  ['elecciones.padron', 'lucide:list'],
  ['elecciones.listas', 'lucide:palette'],
  ['elecciones.candidaturas', 'lucide:user-plus'],
  ['elecciones.jornada', 'lucide:flag'],
  ['elecciones.votacion', 'lucide:mouse-pointer-click'],
  ['elecciones.resultados', 'lucide:chart-bar'],
  ['elecciones.escrutinio', 'lucide:file-check'],
  ['elecciones.impugnaciones', 'lucide:scale'],
  ['elecciones.resultados_finales', 'lucide:trophy'],
];

async function main() {
  console.log('Actualizando iconos de Opcion (heroicons -> lucide)...');
  let actualizadas = 0;
  for (const [codigo, icono] of ICONOS) {
    const result = await prisma.opcion.updateMany({
      where: { codigo },
      data: { icono },
    });
    actualizadas += result.count;
  }
  console.log(`Listo. Opciones actualizadas: ${actualizadas} de ${ICONOS.length}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
