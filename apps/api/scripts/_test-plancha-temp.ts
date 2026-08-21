import 'dotenv/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditoriaService } from '../src/modules/auditoria/auditoria.service';
import { VotacionService } from '../src/modules/votacion/votacion.service';
import { EscrutinioService } from '../src/modules/escrutinio/escrutinio.service';

const ELECCION_ID = 'efa5bf18-d45b-447e-81eb-29e54ad7c265';

const DIG_PRESIDENTE = '8712644f-2b4d-431e-a35a-74c9a2415322';
const DIG_VICE = '3840ffff-2cb5-40fd-b849-bc3fe45b0363';
const DIG_TESORERO = 'b3b0fe11-ce2d-444b-9ba7-fcd25faf9ec3';

const CAND = {
  presidenteA: '340b8020-c5aa-4555-89ca-81de4f1b8145',
  presidenteB: '29ab2f80-f460-4944-a6bb-9ba006a612aa',
  viceA: '501693d3-64e4-470a-9c06-82cf8e89efaa',
  viceB: '302ca97b-9be2-4b9a-ab8b-9b7317fb2024',
  tesoreroA: '887b961f-5497-457b-be13-6f72db7c9d52',
  tesoreroB: 'b678e137-16da-4cb6-ba58-17145ca802bb',
};

// Electores sin voto tomados de la inspeccion previa (no son candidatos).
const KEVIN = 'c0f530cc-e751-462f-ab42-e10f69eb867d'; // ESTUDIANTE
const PAOLA = '46824093-81a8-4cec-8593-97e60e098b31'; // DOCENTE
const SOFIA = '2717cddd-b024-41ed-85f3-a88e7a3eeb44'; // DOCENTE
const IVONNE = '1b5605d0-dcf5-4d08-90ce-14e54e91d8bb'; // ESTUDIANTE
const URSULA = 'e40475b4-9c9b-439e-bc07-f16a90ad50e1'; // DOCENTE
const VICTOR = '5ad7f8db-33e9-4c49-872a-e00fb46e8650'; // DOCENTE

const actor = {
  user: { id: 'test-script', usuario: 'test-script' } as any,
  ip: '127.0.0.1',
};

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const auditoria = new AuditoriaService(prisma);
  const votacionService = new VotacionService(prisma, auditoria, new JwtService({}));
  const escrutinioService = new EscrutinioService(prisma, auditoria);

  const log = (title: string) => console.log(`\n=== ${title} ===`);

  // --- TEST 1: voto mixto (lista A en una dignidad, lista B en otra) debe rechazarse ---
  log('TEST 1: voto mixto debe ser rechazado');
  try {
    await votacionService.emitirVotante(ELECCION_ID, KEVIN, {
      votos: [
        { dignidadId: DIG_PRESIDENTE, tipo: 'CANDIDATO' as any, candidaturaId: CAND.presidenteA },
        { dignidadId: DIG_VICE, tipo: 'CANDIDATO' as any, candidaturaId: CAND.viceB },
        { dignidadId: DIG_TESORERO, tipo: 'BLANCO' as any, candidaturaId: null },
      ],
    });
    console.log('FALLO: el voto mixto se acepto (no debia).');
  } catch (e: any) {
    console.log('OK, rechazado con mensaje:', e.message);
  }

  const votoKevin = await prisma.votoEmitido.findFirst({ where: { eleccionId: ELECCION_ID, electorId: KEVIN } });
  console.log('Voto de Kevin quedo registrado?:', votoKevin ? 'SI (mal)' : 'NO (correcto)');

  // --- TEST 2: voto consistente en lista B debe aceptarse ---
  log('TEST 2: voto consistente (lista B completa) debe aceptarse');
  try {
    const res = await votacionService.emitirVotante(ELECCION_ID, KEVIN, {
      votos: [
        { dignidadId: DIG_PRESIDENTE, tipo: 'CANDIDATO' as any, candidaturaId: CAND.presidenteB },
        { dignidadId: DIG_VICE, tipo: 'CANDIDATO' as any, candidaturaId: CAND.viceB },
        { dignidadId: DIG_TESORERO, tipo: 'CANDIDATO' as any, candidaturaId: CAND.tesoreroB },
      ],
    });
    console.log('OK, registrado:', res.registrado, 'dignidades:', res.dignidades);
  } catch (e: any) {
    console.log('FALLO inesperado:', e.message);
  }

  const conteoTrasTest2 = await prisma.conteoVoto.findMany({
    where: { eleccionId: ELECCION_ID },
    select: { dignidadId: true, opcionKey: true, total: true },
  });
  console.log('Conteo tras test 2 (deberia ser 1-1 en cada dignidad, empate):', conteoTrasTest2);

  // --- TEST 3: cerrar votacion, generar actas, verificar empate en las 3 dignidades ---
  log('TEST 3: cerrar votacion y generar actas (debe detectar empate en las 3)');
  await votacionService.cerrarVotacion(ELECCION_ID, actor);
  const genResult = await escrutinioService.generarActas(ELECCION_ID, actor);
  const resumen1 = await escrutinioService.resumen(ELECCION_ID);
  for (const r of resumen1.resultados) {
    console.log(`  ${r.dignidad}: empatado=${r.empatado} vuelta=${r.vuelta} ganadores=${r.ganadores.length}`);
  }

  // --- Cerrar y aprobar las 3 actas ---
  log('Cerrando y aprobando las 3 actas');
  const actas = await prisma.actaEscrutinio.findMany({
    where: { eleccionId: ELECCION_ID, vuelta: 1 },
    select: { id: true, dignidadId: true },
  });
  for (const acta of actas) {
    await escrutinioService.cerrarActa(acta.id, {} as any, actor);
    await escrutinioService.aprobarActa(acta.id, {} as any, actor);
  }
  console.log('Actas cerradas y aprobadas:', actas.length);

  // --- TEST 4: iniciar segunda vuelta desde UNA dignidad, verificar que reabre las 3 juntas ---
  log('TEST 4: iniciarSegundaVuelta(presidente) debe reabrir las 3 dignidades de la plancha');
  await escrutinioService.iniciarSegundaVuelta(ELECCION_ID, DIG_PRESIDENTE, { plazoHoras: 1 } as any, actor);
  const dignidadesTrasSV = await prisma.dignidad.findMany({
    where: { id: { in: [DIG_PRESIDENTE, DIG_VICE, DIG_TESORERO] } },
    select: { id: true, nombre: true, vuelta: true, activo: true, pausadaSegundaVuelta: true },
  });
  console.log(dignidadesTrasSV);
  const candidaturasExcluidas = await prisma.candidatura.findMany({
    where: { eleccionId: ELECCION_ID, excluidaSegundaVuelta: true },
    select: { id: true },
  });
  console.log('Candidaturas excluidas (esperado 0, ya que A y B seguian empatadas):', candidaturasExcluidas.length);

  // --- TEST 5: votar en la segunda vuelta: 2 votos a lista A, 1 a lista B (A gana con margen, sin empate) ---
  log('TEST 5: votar segunda vuelta - 2 votos lista A, 1 voto lista B, mas 1 en blanco');
  for (const [electorId, cand] of [
    [PAOLA, { p: CAND.presidenteA, v: CAND.viceA, t: CAND.tesoreroA }],
    [SOFIA, { p: CAND.presidenteA, v: CAND.viceA, t: CAND.tesoreroA }],
    [IVONNE, { p: CAND.presidenteB, v: CAND.viceB, t: CAND.tesoreroB }],
  ] as const) {
    await votacionService.emitirVotante(ELECCION_ID, electorId, {
      votos: [
        { dignidadId: DIG_PRESIDENTE, tipo: 'CANDIDATO' as any, candidaturaId: cand.p },
        { dignidadId: DIG_VICE, tipo: 'CANDIDATO' as any, candidaturaId: cand.v },
        { dignidadId: DIG_TESORERO, tipo: 'CANDIDATO' as any, candidaturaId: cand.t },
      ],
    });
  }
  // Un voto en blanco explicito para probar la regla del Art. 18.
  await votacionService.emitirVotante(ELECCION_ID, URSULA, {
    votos: [
      { dignidadId: DIG_PRESIDENTE, tipo: 'BLANCO' as any, candidaturaId: null },
      { dignidadId: DIG_VICE, tipo: 'BLANCO' as any, candidaturaId: null },
      { dignidadId: DIG_TESORERO, tipo: 'BLANCO' as any, candidaturaId: null },
    ],
  });
  console.log('Votos de segunda vuelta registrados (A=2, B=1, blanco=1).');

  // --- TEST 6: cerrar votacion de nuevo, generar actas, verificar que blanco se sumo a la lista lider (A) ---
  log('TEST 6: cerrar y generar actas de la segunda vuelta - verificar regla Art. 18');
  await votacionService.cerrarVotacion(ELECCION_ID, actor);
  await escrutinioService.generarActas(ELECCION_ID, actor);
  const resumen2 = await escrutinioService.resumen(ELECCION_ID);
  for (const r of resumen2.resultados) {
    console.log(
      `  ${r.dignidad}: vuelta=${r.vuelta} empatado=${r.empatado} votosBlancos(informativo)=${r.votosBlancos} votosValidos=${r.votosValidos}`,
    );
    for (const g of r.ganadores) {
      console.log(`     ganador: ${g.candidatura?.elector.apellidos} total(con blancos sumados)=${g.total}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('ERROR GENERAL:', e);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
