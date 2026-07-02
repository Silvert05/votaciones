import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-actividades',
  imports: [MatIconModule],
  templateUrl: './actividades.html',
})
export default class ActividadesComponent {

  actividad = [
    {
      fecha: '26/09/2022',
      actividad: [
        { title: 'Reunión de trabajo con los órganos del instituto yavirac', responsable: 'PRESIDENTE T.E ', lugar: 'INSTITUTO YAVIRAC' },
        { title: 'Enviar oficios solicitando la base de datos del instituto para conformar el padrón electoral', responsable: 'SECRETARIO', lugar: 'INSTITUTO YAVIRAC' }
      ]
    },
    /*{
      fecha: '28/09/2022',
      actividad: [
        { title: 'Rueda de prensa con todos los medios alternativos de las iglesias de la FIERP', responsable: 'TRIBUNAL ELECTORAL', lugar: 'CASA FIERPI', hora: '17:30' }
      ]
    },*/
    {
      fecha: '03/10/2022',
      actividad: [
        { title: 'Recepción de la base de datos', responsable: 'SECRETARIA Y TRIBUNAL ELECTORAL', lugar: 'INSTITUTO YAVIRAC', hora: '19:00' }
      ]
    },
    {
      fecha: '05/10/2022',
      actividad: [
        { title: 'Enviar convocatorias para la Asamblea General, aprobación del Reglamento', responsable: 'PRESIDENTE TRIBUNAL' }
      ]
    },
    {
      fecha: '12/10/2022',
      actividad: [
        { title: 'Asamblea General REFORMA DEL REGLAMENTO', responsable: 'PRESIDENTE TRIBUNAL', lugar: 'INSTITUTO YAVIRAC', hora: '17:00' }
      ]
    },
    {
      fecha: '19/10/2022',
      actividad: [
        { title: 'Inscripciones de candidatos', responsable: 'TRIBUNAL', lugar: 'INSTITUTO YAVIRAC' }
      ]
    },
    {
      fecha: '24/10/2022',
      actividad: [
        { title: 'Calificación de los candidatos', responsable: 'TRIBUNAL', lugar: 'INSTITUTO YAVIRAC' }
      ]
    },
    {
      fecha: '26/10/2022',
      actividad: [
        { title: 'Asamblea General Presentar formalmente a  las listas y la socialización', responsable: 'TRIBUNAL', lugar: 'INSTITUTO YAVIRAC' }
      ]
    },
    {
      fecha: '27/10/2022 A 07/11/2022',
      actividad: [
        { title: 'Socialización de los candidatos – Cierre de campaña', responsable: 'CANDIDATOS' }
      ]
    },
    {
      fecha: '19/11/2022',
      actividad: [
        { title: 'CONGRESO Elección del Concilio de Pastores', responsable: 'TRIBUNAL' }
      ]
    },
    {
      fecha: '14/11/2022 A 25/11/2022',
      actividad: [
        { title: 'Conformación de las juntas receptoras de votos', responsable: 'TRIBUNAL', lugar: 'INSTITUTO YAVIRAC' }
      ]
    },
    {
      fecha: '27/11/2022',
      actividad: [
        { title: 'Elecciones y proclamación de las nuevas autoridades DECLARADO DÍA CÍVICO DL YAVIRAC', responsable: 'TRIBUNAL', lugar: 'INSTITUTO YAVIRAC' }
      ]
    },
    {
      fecha: '28/11/2022',
      actividad: [
        { title: 'Impugnaciones', responsable: 'TRIBUNAL', lugar: 'INSTITUTO YAVIRAC' }
      ]
    },
    {
      fecha: '30/11/2022',
      actividad: [
        { title: 'Planificación del posicionamiento de las nuevas autoridades', responsable: 'TRIBUNAL Y LAS NUEVAS AUTORIDADES', lugar: 'INSTITUTO YAVIRAC' }
      ]
    },
    {
      fecha: '17/12/2022',
      actividad: [
        { title: 'Posicionamiento de las nuevas autoridades', responsable: 'TRIBUNAL Y LAS NUEVAS AUTORIDADES', lugar: 'PENDIENTE' }
      ]
    }
  ];
}
