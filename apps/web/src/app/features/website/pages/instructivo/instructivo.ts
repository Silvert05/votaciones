import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { VenpService } from '../../services/venp.service';

interface Paso {
  icono: string;
  titulo: string;
  detalle: string;
}

@Component({
  selector: 'app-instructivo',
  imports: [MatIconModule, RouterLink],
  templateUrl: './instructivo.html',
})
export default class InstructivoComponent {
  private readonly venpService = inject(VenpService);
  descargando = false;

  pasos: Paso[] = [
    {
      icono: 'lucide:mouse-pointer-click',
      titulo: 'Ingrese al portal y presione VOTAR',
      detalle:
        'Desde la página de inicio, ubique el proceso electoral activo y presione el botón VOTAR para abrir el módulo de votación.',
    },
    {
      icono: 'lucide:id-card',
      titulo: 'Autentíquese con sus credenciales',
      detalle:
        'Escriba su número de cédula (DNI) y la contraseña que recibió. Presione INGRESAR. Sus datos identifican que usted está habilitado en el padrón, pero su voto siempre será secreto.',
    },
    {
      icono: 'lucide:file-text',
      titulo: 'Lea cada cédula de votación',
      detalle:
        'Verá una cédula por cada dignidad o cargo a elegir. En la parte superior se indica el cargo y cuántas opciones puede elegir.',
    },
    {
      icono: 'lucide:hand',
      titulo: 'Marque su preferencia',
      detalle:
        'Seleccione al candidato de su preferencia. También puede elegir "Voto en blanco" o "Voto nulo". Si no marca ninguna opción, se registrará como voto en blanco.',
    },
    {
      icono: 'lucide:arrow-right',
      titulo: 'Avance por todas las cédulas',
      detalle:
        'Use el botón "Siguiente" para pasar a la próxima cédula, o "Anterior" para revisar la previa. La barra de progreso le indica cuántas cédulas faltan.',
    },
    {
      icono: 'lucide:clipboard-check',
      titulo: 'Revise y confirme su voto',
      detalle:
        'Al terminar verá un resumen de todas sus selecciones. Revíselo con cuidado y presione "Emitir mi voto". Esta acción no se puede deshacer.',
    },
    {
      icono: 'lucide:check-circle',
      titulo: 'Reciba la confirmación',
      detalle:
        'Aparecerá el mensaje "Su participación ha sido registrada satisfactoriamente". ¡Listo! Su voto ya fue contabilizado de forma secreta.',
    },
  ];

  tips = [
    'Su voto es secreto: el sistema nunca asocia su identidad con la opción marcada.',
    'Solo puede votar una vez. Una vez emitido, no podrá volver a ingresar.',
    'Si olvidó su contraseña o no consta en el padrón, contacte al soporte técnico del proceso.',
    'Puede votar desde cualquier dispositivo con acceso a internet dentro del horario de la jornada.',
  ];

  imprimir(): void {
    if (this.descargando) return;
    this.descargando = true;
    this.venpService.descargarInstructivo().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = 'instructivo-votacion.pdf';
        enlace.click();
        URL.revokeObjectURL(url);
        this.descargando = false;
      },
      error: () => {
        this.descargando = false;
      },
    });
  }
}
