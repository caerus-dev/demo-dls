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

export interface VistaMotor {
  tomado: boolean
  modo?: 'EXCLUSIVE' | 'SHARED_READ'
  holders: { worker?: string; token?: number }[]
  enCola: number
}

export interface Recurso {
  id: RecursoId
  etiqueta: string
  tipo: 'archivo' | 'red'
  modo?: 'EXCLUSIVE' | 'SHARED_READ'
  holders: string[]
  cola: string[]
  ultimoTokenAceptado?: number
  motor?: VistaMotor
}

export interface LineaArchivo {
  worker: string
  token: number
  texto: string
}

export interface Subida {
  worker: string
  progreso: number
  estado: 'subiendo' | 'cortada' | 'completa'
}

export interface Archivo {
  lineas: LineaArchivo[]
  ultimoToken?: number
  lectores: string[]
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

export interface Momento {
  t: number
  titulo: string
  detalle?: string
  tono: 'info' | 'ok' | 'aviso' | 'error'
  foco: string[]
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
  momentos: Momento[]
  archivo: Archivo
  subidas: Subida[]
}

export interface DemoCallbacks {
  onEscenario: (escenario: Escenario) => void
  onNodos: (nodos: 2 | 3) => void
  onReiniciar: () => void
}
