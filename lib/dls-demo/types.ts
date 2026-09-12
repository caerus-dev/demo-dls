export type RecursoId = 'file:reports_export' | 'network:cloud_uploader'

export type WorkerEstado = 'IDLE' | 'STARTING_TX' | 'HOLDING' | 'QUEUED' | 'DEADLOCK_ABORTED' | 'COMMITTED'

export interface Worker {
  id: string
  nombre: string
  tarea: string
  estado: WorkerEstado
  transaccionId?: string
  tiene: RecursoId[]
  espera?: RecursoId
  fencingToken?: number
}

export interface Recurso {
  id: RecursoId
  etiqueta: string
  tipo: 'archivo' | 'red'
  modo?: 'EXCLUSIVE' | 'SHARED_READ'
  holders: string[]
  cola: string[]
  ultimoTokenAceptado?: number
}

export interface Arista {
  desde: string
  hacia: string
  recurso: RecursoId
  enCiclo: boolean
}

export interface Deadlock {
  ciclo: string[]
  victima: string
}

export interface EventoLog {
  t: number
  nivel: 'info' | 'ok' | 'aviso' | 'error'
  texto: string
}

export type Escenario = 'shared_read' | 'tarea_simple' | 'deadlock'

export interface Motor {
  conectado: boolean
  verificando?: boolean
  endpoint: string
}

export interface DemoState {
  escenario: Escenario | null
  nodos: 2 | 3
  enCurso: boolean
  workers: Worker[]
  recursos: Recurso[]
  aristas: Arista[]
  deadlock?: Deadlock
  motor: Motor
  log: EventoLog[]
}

export interface DemoCallbacks {
  onEscenario: (escenario: Escenario) => void
  onNodos: (nodos: 2 | 3) => void
  onReiniciar: () => void
}
