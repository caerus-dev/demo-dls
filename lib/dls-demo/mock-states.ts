import type { DemoState, EventoLog } from './types'

const ENDPOINT = 'dls://caerus.prod:7420'
const T0 = 1_710_000_000_000

function log(offsetMs: number, nivel: EventoLog['nivel'], texto: string): EventoLog {
  return { t: T0 + offsetMs, nivel, texto }
}

const motor = { conectado: true, endpoint: ENDPOINT }

/** 1 · Estado de arranque: dos workers inactivos, recursos libres. */
export const inicial: DemoState = {
  escenario: null,
  modo: 'auto',
  nodos: 2,
  enCurso: false,
  esperandoSiguientePaso: false,
  workers: [
    { id: 'w1', nombre: 'Worker Alpha', tarea: 'Exportar reporte mensual', estado: 'IDLE', tiene: [] },
    { id: 'w2', nombre: 'Worker Beta', tarea: 'Subir respaldo a la nube', estado: 'IDLE', tiene: [] },
  ],
  recursos: [
    { id: 'file:reports_export', etiqueta: 'Reporte exportado', tipo: 'archivo', holders: [], cola: [] },
    { id: 'network:cloud_uploader', etiqueta: 'Canal de subida', tipo: 'red', holders: [], cola: [] },
  ],
  aristas: [],
  motor,
  log: [log(0, 'ok', 'Conexión establecida con el motor Caerus DLS')],
}

/** 2 · Lectura compartida: ambos workers sostienen el archivo en SHARED_READ. */
export const lecturaCompartida: DemoState = {
  escenario: 'shared_read',
  modo: 'auto',
  nodos: 2,
  enCurso: false,
  esperandoSiguientePaso: false,
  workers: [
    {
      id: 'w1',
      nombre: 'Worker Alpha',
      tarea: 'Leer reporte para dashboard',
      estado: 'HOLDING',
      transaccionId: 'tx-9f3ac1b2-e77d-4a01',
      ttlRestanteMs: 21000,
      ttlTotalMs: 30000,
      tiene: ['file:reports_export'],
      fencingToken: 1044,
    },
    {
      id: 'w2',
      nombre: 'Worker Beta',
      tarea: 'Leer reporte para auditoría',
      estado: 'HOLDING',
      transaccionId: 'tx-4c81de55-1abf-49f2',
      ttlRestanteMs: 24500,
      ttlTotalMs: 30000,
      tiene: ['file:reports_export'],
      fencingToken: 1045,
    },
  ],
  recursos: [
    {
      id: 'file:reports_export',
      etiqueta: 'Reporte exportado',
      tipo: 'archivo',
      modo: 'SHARED_READ',
      holders: ['w1', 'w2'],
      cola: [],
      ultimoTokenAceptado: 1045,
    },
    { id: 'network:cloud_uploader', etiqueta: 'Canal de subida', tipo: 'red', holders: [], cola: [] },
  ],
  aristas: [],
  motor,
  log: [
    log(0, 'info', 'Alpha solicita SHARED_READ sobre file:reports_export'),
    log(120, 'ok', 'Lock compartido concedido a Alpha (token #1044)'),
    log(340, 'info', 'Beta solicita SHARED_READ sobre file:reports_export'),
    log(410, 'ok', 'Lock compartido concedido a Beta (token #1045)'),
  ],
}

/** 3 · En cola: Alpha con lock exclusivo, Beta esperando en cola. */
export const enCola: DemoState = {
  escenario: 'tarea_simple',
  modo: 'auto',
  nodos: 2,
  enCurso: false,
  esperandoSiguientePaso: false,
  workers: [
    {
      id: 'w1',
      nombre: 'Worker Alpha',
      tarea: 'Reescribir reporte exportado',
      estado: 'HOLDING',
      transaccionId: 'tx-1b77e0aa-9c34-4d10',
      ttlRestanteMs: 12000,
      ttlTotalMs: 30000,
      tiene: ['file:reports_export'],
      fencingToken: 1041,
    },
    {
      id: 'w2',
      nombre: 'Worker Beta',
      tarea: 'Reescribir reporte exportado',
      estado: 'QUEUED',
      transaccionId: 'tx-88be2f10-7a55-4c0d',
      tiene: [],
      espera: 'file:reports_export',
    },
  ],
  recursos: [
    {
      id: 'file:reports_export',
      etiqueta: 'Reporte exportado',
      tipo: 'archivo',
      modo: 'EXCLUSIVE',
      holders: ['w1'],
      cola: ['w2'],
      ultimoTokenAceptado: 1041,
    },
    { id: 'network:cloud_uploader', etiqueta: 'Canal de subida', tipo: 'red', holders: [], cola: [] },
  ],
  aristas: [{ desde: 'w2', hacia: 'w1', recurso: 'file:reports_export', enCiclo: false }],
  motor,
  log: [
    log(0, 'ok', 'Alpha obtiene lock EXCLUSIVE sobre file:reports_export (token #1041)'),
    log(260, 'info', 'Beta solicita EXCLUSIVE sobre file:reports_export'),
    log(300, 'aviso', 'Recurso ocupado: Beta encolado detrás de Alpha'),
  ],
}

/** 4 · Deadlock detectado por el servidor: ciclo Alpha ↔ Beta. */
export const deadlockDetectado: DemoState = {
  escenario: 'deadlock',
  modo: 'auto',
  nodos: 2,
  enCurso: false,
  esperandoSiguientePaso: false,
  workers: [
    {
      id: 'w1',
      nombre: 'Worker Alpha',
      tarea: 'Exportar y luego subir',
      estado: 'QUEUED',
      transaccionId: 'tx-1b77e0aa-9c34-4d10',
      tiene: ['file:reports_export'],
      espera: 'network:cloud_uploader',
      fencingToken: 1041,
    },
    {
      id: 'w2',
      nombre: 'Worker Beta',
      tarea: 'Subir y luego exportar',
      estado: 'QUEUED',
      transaccionId: 'tx-88be2f10-7a55-4c0d',
      tiene: ['network:cloud_uploader'],
      espera: 'file:reports_export',
      fencingToken: 1042,
    },
  ],
  recursos: [
    {
      id: 'file:reports_export',
      etiqueta: 'Reporte exportado',
      tipo: 'archivo',
      modo: 'EXCLUSIVE',
      holders: ['w1'],
      cola: ['w2'],
      ultimoTokenAceptado: 1041,
    },
    {
      id: 'network:cloud_uploader',
      etiqueta: 'Canal de subida',
      tipo: 'red',
      modo: 'EXCLUSIVE',
      holders: ['w2'],
      cola: ['w1'],
      ultimoTokenAceptado: 1042,
    },
  ],
  aristas: [
    { desde: 'w1', hacia: 'w2', recurso: 'network:cloud_uploader', enCiclo: true },
    { desde: 'w2', hacia: 'w1', recurso: 'file:reports_export', enCiclo: true },
  ],
  deadlock: { ciclo: ['w1', 'w2'], victima: 'w2' },
  motor,
  log: [
    log(0, 'ok', 'Alpha sostiene file:reports_export, solicita network:cloud_uploader'),
    log(90, 'ok', 'Beta sostiene network:cloud_uploader, solicita file:reports_export'),
    log(150, 'aviso', 'Ambas transacciones quedan encoladas mutuamente'),
    log(210, 'error', 'Ciclo de espera detectado: w1 → w2 → w1'),
    log(215, 'aviso', 'Selección de víctima: Worker Beta (transacción más joven)'),
  ],
}

/** 5 · Víctima abortada: Beta abortado, Alpha completa con ambos recursos. */
export const victimaAbortada: DemoState = {
  escenario: 'deadlock',
  modo: 'auto',
  nodos: 2,
  enCurso: false,
  esperandoSiguientePaso: false,
  workers: [
    {
      id: 'w1',
      nombre: 'Worker Alpha',
      tarea: 'Exportar y luego subir',
      estado: 'HOLDING',
      transaccionId: 'tx-1b77e0aa-9c34-4d10',
      ttlRestanteMs: 26000,
      ttlTotalMs: 30000,
      tiene: ['file:reports_export', 'network:cloud_uploader'],
      fencingToken: 1043,
    },
    {
      id: 'w2',
      nombre: 'Worker Beta',
      tarea: 'Subir y luego exportar',
      estado: 'DEADLOCK_ABORTED',
      transaccionId: 'tx-88be2f10-7a55-4c0d',
      tiene: [],
    },
  ],
  recursos: [
    {
      id: 'file:reports_export',
      etiqueta: 'Reporte exportado',
      tipo: 'archivo',
      modo: 'EXCLUSIVE',
      holders: ['w1'],
      cola: [],
      ultimoTokenAceptado: 1043,
    },
    {
      id: 'network:cloud_uploader',
      etiqueta: 'Canal de subida',
      tipo: 'red',
      modo: 'EXCLUSIVE',
      holders: ['w1'],
      cola: [],
      ultimoTokenAceptado: 1043,
    },
  ],
  aristas: [],
  motor,
  log: [
    log(0, 'error', 'Deadlock resuelto: transacción de Beta abortada por el servidor'),
    log(60, 'aviso', 'Beta libera network:cloud_uploader'),
    log(120, 'ok', 'Alpha adquiere network:cloud_uploader (token #1043)'),
    log(180, 'ok', 'Alpha ahora sostiene ambos recursos, continúa la tarea'),
  ],
}

/** 6 · Víctima en tres nodos: triángulo Alpha → Beta → Gamma → Alpha, víctima Gamma. */
export const victimaTresNodos: DemoState = {
  escenario: 'deadlock',
  modo: 'auto',
  nodos: 3,
  enCurso: false,
  esperandoSiguientePaso: false,
  workers: [
    {
      id: 'w1',
      nombre: 'Worker Alpha',
      tarea: 'Exportar reporte',
      estado: 'QUEUED',
      transaccionId: 'tx-1b77e0aa-9c34-4d10',
      tiene: ['file:reports_export'],
      espera: 'network:cloud_uploader',
      fencingToken: 1041,
    },
    {
      id: 'w2',
      nombre: 'Worker Beta',
      tarea: 'Subir respaldo',
      estado: 'QUEUED',
      transaccionId: 'tx-88be2f10-7a55-4c0d',
      tiene: ['network:cloud_uploader'],
      espera: 'file:reports_export',
      fencingToken: 1042,
    },
    {
      id: 'w3',
      nombre: 'Worker Gamma',
      tarea: 'Reindexar reporte',
      estado: 'DEADLOCK_ABORTED',
      transaccionId: 'tx-33aa90ee-2b64-4f88',
      tiene: [],
      espera: 'file:reports_export',
    },
  ],
  recursos: [
    {
      id: 'file:reports_export',
      etiqueta: 'Reporte exportado',
      tipo: 'archivo',
      modo: 'EXCLUSIVE',
      holders: ['w1'],
      cola: ['w2', 'w3'],
      ultimoTokenAceptado: 1041,
    },
    {
      id: 'network:cloud_uploader',
      etiqueta: 'Canal de subida',
      tipo: 'red',
      modo: 'EXCLUSIVE',
      holders: ['w2'],
      cola: ['w1'],
      ultimoTokenAceptado: 1042,
    },
  ],
  aristas: [
    { desde: 'w1', hacia: 'w2', recurso: 'network:cloud_uploader', enCiclo: true },
    { desde: 'w2', hacia: 'w3', recurso: 'file:reports_export', enCiclo: true },
    { desde: 'w3', hacia: 'w1', recurso: 'file:reports_export', enCiclo: true },
  ],
  deadlock: { ciclo: ['w1', 'w2', 'w3'], victima: 'w3' },
  motor,
  log: [
    log(0, 'aviso', 'Tres transacciones en espera circular'),
    log(80, 'error', 'Ciclo detectado: w1 → w2 → w3 → w1'),
    log(140, 'aviso', 'Selección de víctima: Worker Gamma (menor costo de reintento)'),
    log(150, 'info', 'El servidor decide la víctima; la pantalla no la calcula'),
  ],
}

/** 7 · Escritura zombie rechazada por fencing token obsoleto. */
export const zombieRechazado: DemoState = {
  escenario: 'zombie',
  modo: 'auto',
  nodos: 2,
  enCurso: false,
  esperandoSiguientePaso: false,
  workers: [
    {
      id: 'w1',
      nombre: 'Worker Alpha',
      tarea: 'Escribir reporte (pausado por GC)',
      estado: 'ZOMBIE_REJECTED',
      transaccionId: 'tx-1b77e0aa-9c34-4d10',
      tiene: [],
      fencingToken: 103,
    },
    {
      id: 'w2',
      nombre: 'Worker Beta',
      tarea: 'Escribir reporte',
      estado: 'HOLDING',
      transaccionId: 'tx-88be2f10-7a55-4c0d',
      ttlRestanteMs: 27000,
      ttlTotalMs: 30000,
      tiene: ['file:reports_export'],
      fencingToken: 105,
    },
  ],
  recursos: [
    {
      id: 'file:reports_export',
      etiqueta: 'Reporte exportado',
      tipo: 'archivo',
      modo: 'EXCLUSIVE',
      holders: ['w2'],
      cola: [],
      ultimoTokenAceptado: 105,
      ultimoRechazo: { worker: 'w1', token: 103, ultimoAceptado: 105 },
    },
    { id: 'network:cloud_uploader', etiqueta: 'Canal de subida', tipo: 'red', holders: [], cola: [] },
  ],
  aristas: [],
  motor,
  log: [
    log(0, 'aviso', 'Alpha se congeló y su lock expiró por TTL'),
    log(90, 'ok', 'Beta adquiere file:reports_export (token #105)'),
    log(400, 'info', 'Alpha revive e intenta escribir con token #103'),
    log(430, 'error', 'Escritura rechazada: token #103 < último aceptado #105'),
  ],
}

export interface MockEntry {
  clave: string
  etiqueta: string
  state: DemoState
}

export const MOCK_STATES: MockEntry[] = [
  { clave: 'inicial', etiqueta: '1 · Inicial', state: inicial },
  { clave: 'lecturaCompartida', etiqueta: '2 · Lectura compartida', state: lecturaCompartida },
  { clave: 'enCola', etiqueta: '3 · En cola', state: enCola },
  { clave: 'deadlockDetectado', etiqueta: '4 · Deadlock detectado', state: deadlockDetectado },
  { clave: 'victimaAbortada', etiqueta: '5 · Víctima abortada', state: victimaAbortada },
  { clave: 'victimaTresNodos', etiqueta: '6 · Víctima (3 nodos)', state: victimaTresNodos },
  { clave: 'zombieRechazado', etiqueta: '7 · Escritura zombie', state: zombieRechazado },
]
