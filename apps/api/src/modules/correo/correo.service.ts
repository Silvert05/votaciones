import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import nodemailer, { Transporter } from 'nodemailer';
import { envs } from 'src/config/enviroment';

export interface CredencialVotacionEmail {
  email: string;
  nombres: string;
  apellidos: string;
  identificacion: string;
  clave: string;
  eleccionId: string;
  eleccionNombre: string;
  institucion?: string | null;
}

export interface CorreoPrueba {
  id: string;
  email: string;
  usuario: string;
  clave: string;
  eleccionNombre: string;
  accesoUrl: string;
  createdAt: string;
}

@Injectable()
export class CorreoService {
  private readonly transporter: Transporter | null;
  private readonly buzonPruebas: CorreoPrueba[] = [];

  constructor() {
    if (envs.MAIL_MODE === 'preview') {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      return;
    }

    const authCompleta = Boolean(envs.SMTP_USER && envs.SMTP_PASS);
    const authVacia = !envs.SMTP_USER && !envs.SMTP_PASS;
    this.transporter =
      envs.SMTP_HOST && envs.SMTP_FROM && (authCompleta || authVacia)
        ? nodemailer.createTransport({
            host: envs.SMTP_HOST,
            port: envs.SMTP_PORT,
            secure: envs.SMTP_SECURE,
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            ...(authCompleta
              ? { auth: { user: envs.SMTP_USER!, pass: envs.SMTP_PASS! } }
              : {}),
          })
        : null;
  }

  asegurarConfigurado(): void {
    if (envs.MAIL_MODE === 'preview') return;
    if (!this.transporter) {
      throw new ServiceUnavailableException(
        'El correo institucional no esta configurado. Yavirac usa Google Workspace: configure SMTP_USER, SMTP_PASS (contrasena de aplicacion) y SMTP_FROM en apps/api/.env.',
      );
    }
  }

  async enviarCredencialVotacion(data: CredencialVotacionEmail): Promise<void> {
    this.asegurarConfigurado();
    const votarUrl = new URL('/votar', envs.PUBLIC_APP_URL);
    votarUrl.searchParams.set('eleccion', data.eleccionId);

    const institucion = data.institucion?.trim() || 'la institucion';
    const nombreCompleto = `${data.nombres} ${data.apellidos}`.trim();
    const text = [
      `Hola ${nombreCompleto},`,
      '',
      `Has sido habilitado para votar en: ${data.eleccionNombre}.`,
      `Usuario: ${data.identificacion}`,
      `Contrasena unica: ${data.clave}`,
      `Acceso: ${votarUrl.toString()}`,
      '',
      'La credencial queda invalidada definitivamente cuando se registra tu voto.',
      'No compartas esta informacion. El personal institucional nunca te solicitara la contrasena.',
    ].join('\n');

    const subject = `Credenciales de votacion - ${data.eleccionNombre}`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#172033">
        <h2 style="color:#1d4ed8">Credenciales de votacion</h2>
        <p>Hola <strong>${this.escapeHtml(nombreCompleto)}</strong>,</p>
        <p>Has sido habilitado por ${this.escapeHtml(institucion)} para votar en <strong>${this.escapeHtml(data.eleccionNombre)}</strong>.</p>
        <div style="background:#f1f5f9;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0 0 8px"><strong>Usuario:</strong> ${this.escapeHtml(data.identificacion)}</p>
          <p style="margin:0"><strong>Contrasena unica:</strong> <span style="font-family:monospace;font-size:18px">${this.escapeHtml(data.clave)}</span></p>
        </div>
        <p><a href="${this.escapeHtml(votarUrl.toString())}" style="display:inline-block;background:#1d4ed8;color:white;text-decoration:none;padding:12px 20px;border-radius:8px">Ingresar a votar</a></p>
        <p>La credencial queda invalidada definitivamente cuando se registra tu voto.</p>
        <p style="color:#64748b;font-size:13px">No compartas esta informacion. El personal institucional nunca te solicitara la contrasena.</p>
      </div>
    `;

    await this.transporter!.sendMail({
      from:
        envs.SMTP_FROM ??
        'Elecciones Yavirac (pruebas) <preview@yavirac.edu.ec>',
      to: data.email,
      subject,
      text,
      html,
    });

    if (envs.MAIL_MODE === 'preview') {
      this.buzonPruebas.unshift({
        id: randomUUID(),
        email: data.email,
        usuario: data.identificacion,
        clave: data.clave,
        eleccionNombre: data.eleccionNombre,
        accesoUrl: votarUrl.toString(),
        createdAt: new Date().toISOString(),
      });
      if (this.buzonPruebas.length > 500) this.buzonPruebas.length = 500;
    }
  }

  estado() {
    return {
      modo: envs.MAIL_MODE,
      configurado:
        envs.MAIL_MODE === 'preview' ? true : Boolean(this.transporter),
    };
  }

  listarBuzonPruebas(): CorreoPrueba[] {
    this.asegurarModoPrueba();
    return this.buzonPruebas.slice(0, 100);
  }

  limpiarBuzonPruebas() {
    this.asegurarModoPrueba();
    const eliminados = this.buzonPruebas.length;
    this.buzonPruebas.length = 0;
    return { eliminados };
  }

  private asegurarModoPrueba(): void {
    if (envs.MAIL_MODE !== 'preview') {
      throw new BadRequestException(
        'El buzon de pruebas solo esta disponible en modo local.',
      );
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;',
      };
      return entities[char];
    });
  }
}
