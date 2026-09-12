export type RecursoId = 'file:reports_export' | 'network:cloud_uploader'

export type WorkerEstado =
  | 'IDLE'
  | 'STARTING_TX'
  | 'HOLDING'
  | 'QUEUED'
  | 'DEADLOCK_ABORTED'
  | 'COMMITTED'
  | 'ZOMBIE_REJECTED'

export interface Worker {
  id: string
  nombre: string
  tarea: string
  estado: WorkerEstado
  transaccionId?: string
  ttlRestanteMs?: number
  ttlTotalMs?: number
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
  ultimoRechazo?: { worker: string; token: number; ultimoAceptado: number }
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

export type Escenario = 'shared_read' | 'tarea_simple' | 'deadlock' | 'zombie'

export interface DemoState {
  escenario: Escenario | null
  modo: 'auto' | 'paso'
  nodos: 2 | 3
  enCurso: boolean
  esperandoSiguientePaso: boolean
  workers: Worker[]
  recursos: Recurso[]
  aristas: Arista[]
  deadlock?: Deadlock
  motor: { conectado: boolean; endpoint: string }
  log: EventoLog[]
}

export interface DemoCallbacks {
  onEscenario: (escenario: Escenario) => void
  onModo: (modo: 'auto' | 'paso') => void
  onNodos: (nodos: 2 | 3) => void
  onSiguientePaso: () => void
  onReiniciar: () => void
}
