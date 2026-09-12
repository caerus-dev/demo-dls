import { randomUUID } from 'node:crypto'
import { Dls } from '@caerus-dev/sdk'
import { clienteDemo, comoWorker, conRegistro, NAMESPACE, type ClienteDemo, type TxDemo } from '@/lib/caerus/dls'
import { estadoInicial } from './estado-inicial'
import type { EscenarioDisponible, EventoStream } from './stream'
import type { Arista, DemoState, EventoLog, RecursoId, Worker } from './types'

type Modo = 'EXCLUSIVE' | 'SHARED_READ'

interface Paso {
  recurso: RecursoId
  modo: Modo
}

const ARCHIVO: RecursoId = 'file:reports_export'
const RED: RecursoId = 'network:cloud_uploader'
const VIDA_TRANSACCION_MS = 30000
const ESPERA_MAXIMA_MS = 30000
const PAUSA_VICTIMA_MS = 1800
const PAUSA_REINTENTO_MS = 1500

const TAREAS: Record<EscenarioDisponible, string[]> = {
  shared_read: ['Leer el reporte para el dashboard', 'Leer el reporte para auditoría', 'Leer el reporte para el backup'],
  tarea_simple: ['Reescribir el reporte exportado', 'Reescribir el reporte exportado', 'Reescribir el reporte exportado'],
  deadlock: ['Exportar el reporte y subirlo', 'Abrir la subida y verificar el reporte', 'Reindexar el reporte'],
}

const dormir = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms))

function recurso(s: DemoState, id: RecursoId) {
  const r = s.recursos.find((x) => x.id === id)
  if (!r) throw new Error(`Recurso desconocido: ${id}`)
  return r
}

function aristasDe(s: DemoState): Arista[] {
  const aristas: Arista[] = []
  for (const w of s.workers) {
    if (!w.espera) continue
    for (const holder of recurso(s, w.espera).holders) {
      if (holder === w.id) continue
      const enCiclo = Boolean(s.deadlock?.ciclo.includes(w.id) && s.deadlock.ciclo.includes(holder))
      aristas.push({ desde: w.id, hacia: holder, recurso: w.espera, enCiclo })
    }
  }
  return aristas
}

function soltarTodo(s: DemoState, id: string) {
  for (const r of s.recursos) {
    r.holders = r.holders.filter((h) => h !== id)
    r.cola = r.cola.filter((c) => c !== id)
    if (r.holders.length === 0) r.modo = undefined
  }
  const w = s.workers.find((x) => x.id === id)
  if (w) {
    w.tiene = []
    w.espera = undefined
  }
}

function participantesDelCiclo(s: DemoState, victima: string): string[] {
  const esperando = s.workers.filter((w) => w.espera)
  const retienen = esperando.filter((w) =>
    esperando.some((otro) => otro.id !== w.id && otro.espera !== undefined && w.tiene.includes(otro.espera)),
  )
  return Array.from(new Set([...retienen.map((w) => w.id), victima]))
}

class Tablero {
  private readonly state: DemoState
  private readonly enviar: (evento: EventoStream) => void

  constructor(
    escenario: EscenarioDisponible,
    nodos: 2 | 3,
    motor: DemoState['motor'],
    enviar: (evento: EventoStream) => void,
  ) {
    const base = estadoInicial(nodos, motor)
    base.workers.forEach((w, i) => {
      w.tarea = TAREAS[escenario][i] ?? w.tarea
    })
    this.state = { ...base, escenario, enCurso: true }
    this.enviar = enviar
  }

  ids(): string[] {
    return this.state.workers.map((w) => w.id)
  }

  worker(id: string): Worker {
    const w = this.state.workers.find((x) => x.id === id)
    if (!w) throw new Error(`Worker desconocido: ${id}`)
    return w
  }

  nombre(id: string): string {
    return this.worker(id).nombre
  }

  cambiar(mutar: (s: DemoState) => void, nivel?: EventoLog['nivel'], texto?: string) {
    mutar(this.state)
    if (nivel && texto) this.state.log.push({ t: Date.now(), nivel, texto })
    this.state.aristas = aristasDe(this.state)
    this.enviar({ tipo: 'estado', state: structuredClone(this.state) })
  }

  terminar() {
    this.cambiar((s) => {
      s.enCurso = false
    })
  }
}

async function tomar(t: Tablero, tx: TxDemo, id: string, paso: Paso, clave: string) {
  const nombre = t.nombre(id)
  t.cambiar(() => {}, 'info', `${nombre} pide ${paso.modo} sobre ${paso.recurso}`)

  try {
    const lock = await tx.acquireLock(NAMESPACE, clave, paso.modo, {
      idempotencyKey: randomUUID(),
      timeoutMs: ESPERA_MAXIMA_MS,
      onQueued: () =>
        t.cambiar(
          (s) => {
            const w = t.worker(id)
            w.estado = 'QUEUED'
            w.espera = paso.recurso
            const r = recurso(s, paso.recurso)
            if (!r.cola.includes(id)) r.cola.push(id)
          },
          'aviso',
          `${nombre} queda en la cola de ${paso.recurso}`,
        ),
    })

    t.cambiar(
      (s) => {
        const w = t.worker(id)
        w.estado = 'HOLDING'
        w.espera = undefined
        if (!w.tiene.includes(paso.recurso)) w.tiene.push(paso.recurso)
        w.fencingToken = lock.fencingToken
        const r = recurso(s, paso.recurso)
        r.cola = r.cola.filter((c) => c !== id)
        if (!r.holders.includes(id)) r.holders.push(id)
        r.modo = paso.modo
        if (lock.fencingToken !== undefined) {
          r.ultimoTokenAceptado = Math.max(r.ultimoTokenAceptado ?? 0, lock.fencingToken)
        }
      },
      'ok',
      `${nombre} obtiene ${paso.recurso}${lock.fencingToken !== undefined ? ` · fencing token #${lock.fencingToken}` : ''}`,
    )
  } catch (error) {
    if (error instanceof Dls.DeadlockAbortedError) {
      t.cambiar(
        (s) => {
          t.worker(id).estado = 'DEADLOCK_ABORTED'
          s.deadlock = { ciclo: participantesDelCiclo(s, id), victima: id }
        },
        'error',
        `El servidor detectó un ciclo de espera y abortó a ${nombre} (${error.reason ?? 'DEADLOCK_DETECTED'})`,
      )
      await dormir(PAUSA_VICTIMA_MS)
      t.cambiar(
        (s) => {
          t.worker(id).espera = undefined
          const r = recurso(s, paso.recurso)
          r.cola = r.cola.filter((c) => c !== id)
        },
        'info',
        `${nombre} suelta sus locks y el ciclo se rompe`,
      )
    }
    throw error
  }
}

async function trabajo(
  t: Tablero,
  cliente: ClienteDemo,
  id: string,
  pasos: Paso[],
  claves: Record<RecursoId, string>,
  pausaEntrePasosMs: number,
  duracionMs: number,
) {
  const nombre = t.nombre(id)
  try {
    await comoWorker(id, () =>
      cliente.withTransaction(
        async (tx) => {
          t.cambiar(
            () => {
              const w = t.worker(id)
              w.estado = 'STARTING_TX'
              w.transaccionId = tx.transactionId
              w.fencingToken = undefined
              w.tiene = []
              w.espera = undefined
            },
            'info',
            `${nombre} abre la transacción ${tx.transactionId.slice(0, 8)}`,
          )
          for (let i = 0; i < pasos.length; i++) {
            const paso = pasos[i]
            if (!paso) continue
            if (i > 0 && pausaEntrePasosMs > 0) await dormir(pausaEntrePasosMs)
            await tomar(t, tx, id, paso, claves[paso.recurso])
          }
          await dormir(duracionMs)
        },
        { timeoutMs: VIDA_TRANSACCION_MS },
      ),
    )
    t.cambiar(
      (s) => {
        soltarTodo(s, id)
        t.worker(id).estado = 'COMMITTED'
      },
      'ok',
      `${nombre} termina y la transacción suelta sus locks`,
    )
  } catch (error) {
    const esDeadlock = error instanceof Dls.DeadlockAbortedError
    t.cambiar(
      (s) => {
        soltarTodo(s, id)
        const w = t.worker(id)
        if (w.estado !== 'DEADLOCK_ABORTED') w.estado = 'IDLE'
      },
      esDeadlock ? undefined : 'error',
      esDeadlock ? undefined : `${nombre} falló: ${error instanceof Error ? error.message : String(error)}`,
    )
    throw error
  }
}

async function conReintento(
  t: Tablero,
  cliente: ClienteDemo,
  id: string,
  pasos: Paso[],
  claves: Record<RecursoId, string>,
  demoraMs: number,
  pausaEntrePasosMs: number,
  duracionMs: number,
) {
  await dormir(demoraMs)
  try {
    await trabajo(t, cliente, id, pasos, claves, pausaEntrePasosMs, duracionMs)
  } catch (error) {
    if (!(error instanceof Dls.DeadlockAbortedError)) throw error
    await dormir(PAUSA_REINTENTO_MS)
    t.cambiar(
      (s) => {
        s.deadlock = undefined
        t.worker(id).estado = 'IDLE'
      },
      'info',
      `${t.nombre(id)} reintenta con una transacción nueva`,
    )
    await trabajo(t, cliente, id, pasos, claves, pausaEntrePasosMs, duracionMs)
  }
}

export async function correrEscenario(
  escenario: EscenarioDisponible,
  nodos: 2 | 3,
  motor: DemoState['motor'],
  enviar: (evento: EventoStream) => void,
) {
  const t = new Tablero(escenario, nodos, motor, enviar)
  const cliente = clienteDemo()
  const sufijo = randomUUID().slice(0, 6)
  const claves: Record<RecursoId, string> = {
    'file:reports_export': `${ARCHIVO}:${sufijo}`,
    'network:cloud_uploader': `${RED}:${sufijo}`,
  }
  const ids = t.ids()

  t.cambiar(() => {}, 'info', `Namespace ${NAMESPACE}, claves de esta corrida con sufijo :${sufijo}`)

  const resultados = await conRegistro(
    (llamada) => enviar({ tipo: 'llamada', llamada }),
    async () => {
      if (escenario === 'shared_read') {
        return Promise.allSettled(
          ids.map(async (id, i) => {
            await dormir(i * 300)
            await trabajo(t, cliente, id, [{ recurso: ARCHIVO, modo: 'SHARED_READ' }], claves, 0, 2500)
          }),
        )
      }

      if (escenario === 'tarea_simple') {
        return Promise.allSettled(
          ids.map(async (id, i) => {
            await dormir(i * 500)
            await trabajo(t, cliente, id, [{ recurso: ARCHIVO, modo: 'EXCLUSIVE' }], claves, 0, 1800)
          }),
        )
      }

      const tareas = [
        conReintento(
          t,
          cliente,
          'w1',
          [
            { recurso: ARCHIVO, modo: 'EXCLUSIVE' },
            { recurso: RED, modo: 'EXCLUSIVE' },
          ],
          claves,
          0,
          1200,
          1500,
        ),
        conReintento(
          t,
          cliente,
          'w2',
          [
            { recurso: RED, modo: 'EXCLUSIVE' },
            { recurso: ARCHIVO, modo: 'EXCLUSIVE' },
          ],
          claves,
          600,
          1200,
          1500,
        ),
      ]
      if (nodos === 3) {
        tareas.push(conReintento(t, cliente, 'w3', [{ recurso: ARCHIVO, modo: 'EXCLUSIVE' }], claves, 1500, 0, 1200))
      }
      return Promise.allSettled(tareas)
    },
  )

  t.terminar()

  const fallo = resultados.find((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (fallo) throw fallo.reason
}
