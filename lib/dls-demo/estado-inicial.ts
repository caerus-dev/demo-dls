import type { DemoState, Worker } from './types'

const NOMBRES = ['Worker Alpha', 'Worker Beta', 'Worker Gamma'] as const

export function estadoInicial(nodos: 2 | 3, motor: DemoState['motor']): DemoState {
  const workers = NOMBRES.slice(0, nodos).map(
    (nombre, i): Worker => ({
      id: `w${i + 1}`,
      nombre,
      tarea: 'Esperando una tarea',
      estado: 'IDLE',
      tiene: [],
    }),
  )

  return {
    escenario: null,
    modo: 'auto',
    nodos,
    enCurso: false,
    esperandoSiguientePaso: false,
    workers,
    recursos: [
      { id: 'file:reports_export', etiqueta: 'Reporte exportado', tipo: 'archivo', holders: [], cola: [] },
      { id: 'network:cloud_uploader', etiqueta: 'Canal de subida a la nube', tipo: 'red', holders: [], cola: [] },
    ],
    aristas: [],
    motor,
    log: [],
  }
}
