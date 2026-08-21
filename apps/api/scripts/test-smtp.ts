import 'dotenv/config';
import nodemailer from 'nodemailer';

/**
 * Prueba la configuracion SMTP del .env directamente contra Gmail, sin pasar
 * por el resto de la app. Muestra el error real si Gmail rechaza la conexion
 * o la autenticacion.
 *
 * Uso: pnpm -C apps/api test:smtp
 */

async function main() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM;

  console.log('Configuracion detectada:');
  console.log('  MAIL_MODE :', process.env.MAIL_MODE);
  console.log('  SMTP_HOST :', host);
  console.log('  SMTP_PORT :', port);
  console.log('  SMTP_SECURE:', secure);
  console.log('  SMTP_USER :', user);
  console.log('  SMTP_PASS :', pass ? `${pass.slice(0, 4)}${'*'.repeat(Math.max(pass.length - 4, 0))} (${pass.length} caracteres)` : '(vacio)');
  console.log('  SMTP_FROM :', from);
  console.log('');

  if (!host || !user || !pass) {
    console.error('Faltan SMTP_HOST, SMTP_USER o SMTP_PASS en apps/api/.env');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  console.log('Verificando conexion y autenticacion contra', host, '...');
  try {
    await transporter.verify();
    console.log('✅ Conexion y autenticacion SMTP correctas.');
    console.log('   El problema NO esta en las credenciales SMTP.');
  } catch (error: any) {
    console.error('❌ Gmail rechazo la conexion/autenticacion.');
    console.error('   Codigo :', error?.code);
    console.error('   Mensaje:', error?.response ?? error?.message);
    console.error('');
    console.error('   Interpretacion rapida:');
    if (String(error?.response ?? '').includes('5.7.8')) {
      console.error(
        '   -> "Username and Password not accepted": la contraseña de aplicacion es invalida,',
      );
      console.error(
        '      esta revocada, o esa cuenta no tiene la verificacion en 2 pasos activada',
      );
      console.error('      (sin 2FA activo, Google no deja crear/usar contraseñas de aplicacion).');
    } else if (String(error?.response ?? '').includes('5.7.0')) {
      console.error(
        '   -> El administrador del Workspace (yavirac.edu.ec) probablemente tiene bloqueado',
      );
      console.error(
        '      el acceso SMTP para esta cuenta desde la Consola de administracion de Google.',
      );
    } else if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNREFUSED') {
      console.error('   -> No se pudo ni conectar al servidor (firewall/red bloqueando el puerto 587).');
    }
    process.exit(1);
  }
}

main();
