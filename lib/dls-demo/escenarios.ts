import { randomUUID } from 'node:crypto'
import { Dls } from '@caerus-dev/sdk'
import { clienteDemo, comoWorker, conRegistro, NAMESPACE, type ClienteDemo, type TxDemo } from '@/lib/caerus/dls'
import { estadoInicial } from './estado-inicial'
import type { EscenarioDisponible, EventoStream } from './stream'
import type { Arista, DemoState, Momento, RecursoId, VistaMotor, Worker } from './types'

type Modo = 'EXCLUSIVE' | 'SHARED_READ'

interface Pedido {
  recurso: RecursoId
  modo: Modo
}

type NuevoMomento = Omit<Momento, 't'>
type Tokens = Partial<Record<RecursoId, number>>

const ARCHIVO: RecursoId = 'file:reports_export'
const RED: RecursoId = 'network:cloud_uploader'
const VIDA_TRANSACCION_MS = 30000
const ESPERA_MAXIMA_MS = 30000
const PAUSA_INTRO_MS = 3500
const PAUSA_VICTIMA_MS = 5000
const PAUSA_REINTENTO_MS = 3500
const INTERVALO_MOTOR_MS = 600
const INTERVALO_SUBIDA_MS = 300
const LINEAS_POR_ESCRITURA = 3

const TAREAS: Record<EscenarioDisponible, string[]> = {
  shared_read: ['Leer el reporte para el dashboard', 'Leer el reporte para auditoría', 'Leer el reporte para el backup'],
  tarea_simple: ['Reescribir el reporte exportado', 'Reescribir el reporte exportado', 'Reescribir el reporte exportado'],
  deadlock: ['Exportar el reporte y subirlo', 'Abrir la subida y verificar el reporte', 'Reindexar el reporte'],
}

const ESCRITURA: Record<EscenarioDisponible, string[][]> = {
  shared_read: [],
  tarea_simple: [
    ['Ventas totales del trimestre: $1.284.000.', 'Crecimiento del 12% contra el trimestre anterior.', 'La región Norte explica la mitad del aumento.'],
    ['Corrección: las ventas totales fueron $1.291.500.', 'Se sumaron tres facturas que llegaron tarde.', 'El crecimiento real es del 12,6%.'],
    ['Revisión final: cifras confirmadas por contabilidad.', 'Se agrega el detalle por sucursal en el anexo.', 'Reporte listo para enviar a dirección.'],
  ],
  deadlock: [
    ['Exportación iniciada: 3.412 filas.', 'Filas 1 a 3.412 escritas en reports_export.csv.', 'Archivo cerrado y listo para subir.'],
    ['Verificación de la subida: checksum 9f2c41e.', 'El archivo en la nube coincide con el local.', 'Verificación aprobada.'],
    ['Índice reconstruido para las 3.412 filas.', 'Búsquedas por fecha habilitadas.', 'Reindexado terminado.'],
  ],
}

const REPORTE_PUBLICADO = [
  'Reporte de ventas · tercer trimestre',
  'Ventas totales: $1.291.500, un 12,6% más que el trimestre anterior.',
  'La región Norte explica la mitad del crecimiento; Sur y Centro se mantienen estables.',
  'Próxima revisión: primera semana del mes.',
]

const NOMBRE_RECURSO: Record<RecursoId, string> = {
  'file:reports_export': 'el reporte',
  'network:cloud_uploader': 'el canal de subida',
}

const INTRO: Record<EscenarioDisponible, (nodos: number) => NuevoMomento> = {
  shared_read: (nodos) => ({
    titulo: 'Escenario 1 · Lectura compartida',
    detalle: `Los ${nodos} workers van a leer el mismo reporte con SHARED_READ, uno detrás del otro.`,
    tono: 'info',
    foco: [],
  }),
  tarea_simple: (nodos) => ({
    titulo: 'Escenario 2 · Tarea simple',
    detalle: `Los ${nodos} workers quieren reescribir el mismo reporte con EXCLUSIVE. Solo uno puede hacerlo a la vez.`,
    tono: 'info',
    foco: [],
  }),
  deadlock: (nodos) => ({
    titulo: 'Escenario 3 · Deadlock forzado',
    detalle: `Alpha va a tomar el reporte y después pedir el canal de subida; Beta hace lo mismo en el orden inverso.${
      nodos === 3 ? ' Gamma llega más tarde y solo quiere el reporte.' : ''
    }`,
    tono: 'info',
    foco: [],
  }),
}

const dormir = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms))

function lista(nombres: string[]): string {
  if (nombres.length <= 1) return nombres[0] ?? ''
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

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

function vistaMotor(estado: Dls.LockStatusResponse, duenioDe: (lockId: string) => string | undefined): VistaMotor {
  const modo = estado.currentMode === 'EXCLUSIVE' || estado.currentMode === 'SHARED_READ' ? estado.currentMode : undefined
  return {
    tomado: estado.isHeld,
    modo,
    holders: estado.activeHolders.map((h) => ({ worker: duenioDe(h.lockId), token: h.fencingToken })),
    enCola: estado.pendingQueueSize,
  }
}

class Tablero {
  private readonly state: DemoState
  private readonly enviar: (evento: EventoStream) => void
  private readonly escenario: EscenarioDisponible
  private readonly tokens = new Map<RecursoId, number[]>()
  private readonly locks = new Map<string, string>()
  private readonly subiendo = new Map<string, ReturnType<typeof setInterval>>()
  private readonly aperturas = new Map<string, number>()
  private firmaMotor = ''
  readonly victimas: string[] = []

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
    if (escenario === 'shared_read') this.state.archivo.previo = [...REPORTE_PUBLICADO]
    this.enviar = enviar
    this.escenario = escenario
  }

  ids(): string[] {
    return this.state.workers.map((w) => w.id)
  }

  worker(id: string): Worker {
    const w = this.state.workers.find((x) => x.id === id)
    if (!w) throw new Error(`Worker desconocido: ${id}`)
    return w
  }

  corto(id: string): string {
    return this.worker(id).nombre.replace(/^Worker\s+/i, '')
  }

  otrosHolders(r: RecursoId, id: string): string[] {
    return recurso(this.state, r).holders.filter((h) => h !== id)
  }

  modoDe(r: RecursoId) {
    return recurso(this.state, r).modo
  }

  ultimoToken(r: RecursoId) {
    return recurso(this.state, r).ultimoTokenAceptado
  }

  ocupado(id: string, pedido: Pedido): boolean {
    const otros = this.otrosHolders(pedido.recurso, id)
    return otros.length > 0 && (pedido.modo === 'EXCLUSIVE' || this.modoDe(pedido.recurso) === 'EXCLUSIVE')
  }

  esperaA(id: string): string[] {
    const w = this.worker(id)
    return w.espera ? this.otrosHolders(w.espera, id) : []
  }

  anotarToken(r: RecursoId, token: number) {
    this.tokens.set(r, [...(this.tokens.get(r) ?? []), token])
  }

  tokensDe(r: RecursoId): number[] {
    return this.tokens.get(r) ?? []
  }

  anotarLock(lockId: string, id: string) {
    this.locks.set(lockId, id)
  }

  anotarApertura(id: string) {
    this.aperturas.set(id, Date.now())
  }

  apertura(id: string): number {
    return this.aperturas.get(id) ?? 0
  }

  cambiar(mutar: (s: DemoState) => void, momento?: NuevoMomento | ((s: DemoState) => NuevoMomento)) {
    mutar(this.state)
    this.state.aristas = aristasDe(this.state)
    if (momento) {
      const m = typeof momento === 'function' ? momento(this.state) : momento
      this.state.momentos.push({ t: Date.now(), ...m })
    }
    this.enviar({ tipo: 'estado', state: structuredClone(this.state) })
  }

  contar(momento: NuevoMomento) {
    this.cambiar(() => {}, momento)
  }

  terminar(momento: NuevoMomento) {
    this.cambiar((s) => {
      s.enCurso = false
    }, momento)
  }

  escribir(id: string, token: number | undefined, indice: number) {
    const nombre = this.corto(id)
    const previo = this.state.archivo.ultimoToken
    if (token === undefined) throw new Error(`${nombre} no tiene fencing token para escribir el reporte`)
    if (previo !== undefined && token < previo) {
      throw new Error(`El reporte rechazó la escritura de ${nombre}: token #${token} menor que el último aceptado #${previo}`)
    }
    const texto = ESCRITURA[this.escenario][this.ids().indexOf(id)]?.[indice] ?? `Línea ${indice + 1} escrita.`
    this.cambiar(
      (s) => {
        s.archivo.lineas.push({ worker: id, token, texto })
        s.archivo.ultimoToken = token
      },
      indice === 0
        ? {
            titulo: `${nombre} escribe en el reporte con el token #${token}`,
            detalle: `El reporte acepta la escritura porque #${token} no es menor que el último token que vio${
              previo !== undefined ? ` (#${previo})` : ''
            }. Mientras dure el lock, nadie más escribe en el medio.`,
            tono: 'info',
            foco: [id],
            recursos: [ARCHIVO],
          }
        : undefined,
    )
  }

  leyendo(id: string, activo: boolean) {
    this.cambiar((s) => {
      s.archivo.lectores = activo
        ? Array.from(new Set([...s.archivo.lectores, id]))
        : s.archivo.lectores.filter((l) => l !== id)
    })
  }

  empezarSubida(id: string, estimadoMs: number) {
    this.terminarSubida(id, 'cortada')
    const paso = 100 / Math.max(1, estimadoMs / INTERVALO_SUBIDA_MS)
    this.cambiar((s) => {
      s.subidas.push({ worker: id, progreso: 0, estado: 'subiendo' })
    })
    this.subiendo.set(
      id,
      setInterval(() => {
        this.cambiar((s) => {
          const subida = s.subidas.findLast((x) => x.worker === id && x.estado === 'subiendo')
          if (subida) subida.progreso = Math.min(95, subida.progreso + paso)
        })
      }, INTERVALO_SUBIDA_MS),
    )
  }

  terminarSubida(id: string, estado: 'cortada' | 'completa'): number | undefined {
    const timer = this.subiendo.get(id)
    if (!timer) return undefined
    clearInterval(timer)
    this.subiendo.delete(id)
    const subida = this.state.subidas.findLast((x) => x.worker === id && x.estado === 'subiendo')
    const progreso = subida?.progreso
    this.cambiar((s) => {
      const actual = s.subidas.findLast((x) => x.worker === id && x.estado === 'subiendo')
      if (!actual) return
      actual.estado = estado
      if (estado === 'completa') actual.progreso = 100
    })
    return progreso
  }

  async consultarMotor(cliente: ClienteDemo, claves: Record<RecursoId, string>) {
    const recursos = Object.keys(claves) as RecursoId[]
    const vistas = await Promise.all(
      recursos.map(async (r) => {
        try {
          const estado = await cliente.getLockStatus(NAMESPACE, claves[r])
          return [r, vistaMotor(estado, (lockId) => this.locks.get(lockId))] as const
        } catch {
          return [r, undefined] as const
        }
      }),
    )
    const firma = JSON.stringify(vistas)
    if (firma === this.firmaMotor) return
    this.firmaMotor = firma
    this.cambiar((s) => {
      for (const [r, vista] of vistas) {
        if (vista) recurso(s, r).motor = vista
      }
    })
  }
}

function vigilarMotor(t: Tablero, cliente: ClienteDemo, claves: Record<RecursoId, string>) {
  let activo = true
  const ciclo = (async () => {
    while (activo) {
      await t.consultarMotor(cliente, claves)
      await dormir(INTERVALO_MOTOR_MS)
    }
  })()
  return async () => {
    activo = false
    await ciclo
    await t.consultarMotor(cliente, claves)
  }
}

async function tomar(t: Tablero, tx: TxDemo, id: string, pedido: Pedido, clave: string): Promise<number | undefined> {
  const nombre = t.corto(id)
  const que = NOMBRE_RECURSO[pedido.recurso]
  let espero = false

  try {
    const lock = await tx.acquireLock(NAMESPACE, clave, pedido.modo, {
      idempotencyKey: randomUUID(),
      timeoutMs: ESPERA_MAXIMA_MS,
      onQueued: () => {
        if (!t.ocupado(id, pedido)) return
        espero = true
        const duenios = t.otrosHolders(pedido.recurso, id)
        const modoActual = t.modoDe(pedido.recurso)
        t.cambiar(
          (s) => {
            const w = t.worker(id)
            w.estado = 'QUEUED'
            w.espera = pedido.recurso
            const r = recurso(s, pedido.recurso)
            if (!r.cola.includes(id)) r.cola.push(id)
          },
          (): NuevoMomento => {
            const mutuo = duenios.find((d) => t.esperaA(d).includes(id))
            if (mutuo) {
              return {
                titulo: `${nombre} queda esperando a ${t.corto(mutuo)}, que a su vez espera a ${nombre}`,
                detalle:
                  'Ninguno de los dos puede avanzar por su cuenta. Ahora le toca al motor: su detector revisa cada pocos segundos si hay ciclos de espera.',
                tono: 'aviso',
                foco: [id, mutuo],
                recursos: [pedido.recurso],
              }
            }
            return {
              titulo: `${nombre} pide ${que} y queda en la cola`,
              detalle: `Lo tiene ${lista(duenios.map((d) => t.corto(d)))} en ${modoActual}. ${
                pedido.modo === 'EXCLUSIVE'
                  ? 'Un lock EXCLUSIVE no se comparte'
                  : 'Una lectura no puede entrar mientras alguien escribe'
              }, así que el motor lo encola y le avisa con onQueued.`,
              tono: 'aviso',
              foco: [id, ...duenios],
              recursos: [pedido.recurso],
            }
          },
        )
      },
    })

    const token = lock.fencingToken
    t.anotarLock(lock.lockId, id)
    const otros = t.otrosHolders(pedido.recurso, id)
    const previo = t.ultimoToken(pedido.recurso)
    const compartido = pedido.modo === 'SHARED_READ' && otros.length > 0
    if (token !== undefined) t.anotarToken(pedido.recurso, token)

    t.cambiar(
      (s) => {
        const w = t.worker(id)
        w.estado = 'HOLDING'
        w.espera = undefined
        if (!w.tiene.includes(pedido.recurso)) w.tiene.push(pedido.recurso)
        w.fencingToken = token
        const r = recurso(s, pedido.recurso)
        r.cola = r.cola.filter((c) => c !== id)
        if (!r.holders.includes(id)) r.holders.push(id)
        r.modo = pedido.modo
        if (token !== undefined) r.ultimoTokenAceptado = Math.max(r.ultimoTokenAceptado ?? 0, token)
      },
      {
        titulo: espero
          ? `${nombre} sale de la cola y obtiene ${que}`
          : compartido
            ? `${nombre} también obtiene ${que}`
            : `${nombre} obtiene ${que}`,
        detalle: compartido
          ? `SHARED_READ convive con otras lecturas: ${lista([...otros.map((o) => t.corto(o)), nombre])} leen a la vez y nadie espera.`
          : espero && previo !== undefined && token !== undefined
            ? `Recibe el fencing token #${token}, mayor que el #${previo} del anterior. Si alguien con un token viejo intentara escribir tarde, el recurso lo rechazaría.`
            : `Lock ${pedido.modo}${token !== undefined ? ` con fencing token #${token}` : ''}: ${
                pedido.modo === 'EXCLUSIVE'
                  ? 'hasta que lo suelte, nadie más puede tomarlo'
                  : 'otras lecturas pueden sumarse, las escrituras esperan'
              }.`,
        tono: 'ok',
        foco: [id],
        recursos: [pedido.recurso],
      },
    )
    return token
  } catch (error) {
    if (error instanceof Dls.DeadlockAbortedError) {
      t.victimas.push(id)
      const tiene = t.worker(id).tiene.map((r) => NOMBRE_RECURSO[r])
      const cortada = t.terminarSubida(id, 'cortada')
      t.cambiar(
        (s) => {
          t.worker(id).estado = 'DEADLOCK_ABORTED'
          s.deadlock = { ciclo: participantesDelCiclo(s, id), victima: id }
          const r = recurso(s, pedido.recurso)
          r.cola = r.cola.filter((c) => c !== id)
        },
        (s): NuevoMomento => {
          const ciclo = s.deadlock?.ciclo ?? [id]
          const masVieja = ciclo
            .filter((c) => c !== id)
            .map((c) => ({ id: c, diferencia: t.apertura(id) - t.apertura(c) }))
            .filter((x) => x.diferencia > 0)
            .sort((a, b) => b.diferencia - a.diferencia)[0]
          const porque = masVieja
            ? `${nombre} abrió su transacción ${(masVieja.diferencia / 1000).toFixed(1).replace('.', ',')} s después que ${t.corto(masVieja.id)}: es la más joven del ciclo y el motor la elige como víctima.`
            : 'El motor elige como víctima a la transacción más joven del ciclo.'
          return {
            titulo: `El motor detectó el ciclo y abortó a ${nombre}`,
            detalle: `${porque} Recibe DeadlockAbortedError${tiene.length > 0 ? ` y va a soltar ${lista(tiene)}` : ''}.${
              cortada !== undefined ? ` Su subida queda cortada al ${Math.round(cortada)}%.` : ''
            }`,
            tono: 'error',
            foco: ciclo,
            recursos: [...t.worker(id).tiene, pedido.recurso],
          }
        },
      )
      await dormir(PAUSA_VICTIMA_MS)
      const suelta = [...t.worker(id).tiene]
      t.cambiar(
        () => {
          t.worker(id).espera = undefined
        },
        {
          titulo:
            suelta.length > 0
              ? `${nombre} suelta ${lista(suelta.map((r) => NOMBRE_RECURSO[r]))} y el ciclo se rompe`
              : `${nombre} sale del ciclo`,
          detalle: 'withTransaction revierte la transacción abortada y libera todos sus locks.',
          tono: 'info',
          foco: [id],
          recursos: suelta,
        },
      )
    }
    throw error
  }
}

async function usar(t: Tablero, id: string, pedidos: Pedido[], tokens: Tokens, duracionMs: number) {
  const archivo = pedidos.find((p) => p.recurso === ARCHIVO)
  if (!archivo) return dormir(duracionMs)

  if (archivo.modo === 'SHARED_READ') {
    t.leyendo(id, true)
    try {
      await dormir(duracionMs)
    } finally {
      t.leyendo(id, false)
    }
    return
  }

  const tramo = duracionMs / (LINEAS_POR_ESCRITURA + 1)
  for (let i = 0; i < LINEAS_POR_ESCRITURA; i++) {
    await dormir(tramo)
    t.escribir(id, tokens[ARCHIVO], i)
  }
  await dormir(tramo)
}

async function trabajo(
  t: Tablero,
  cliente: ClienteDemo,
  id: string,
  pedidos: Pedido[],
  claves: Record<RecursoId, string>,
  pausaEntrePedidosMs: number,
  duracionMs: number,
) {
  const nombre = t.corto(id)
  try {
    await comoWorker(id, () =>
      cliente.withTransaction(
        async (tx) => {
          t.anotarApertura(id)
          t.cambiar(() => {
            const w = t.worker(id)
            w.estado = 'STARTING_TX'
            w.transaccionId = tx.transactionId
            w.fencingToken = undefined
            w.tiene = []
            w.espera = undefined
          })
          const tokens: Tokens = {}
          for (let i = 0; i < pedidos.length; i++) {
            const pedido = pedidos[i]
            if (!pedido) continue
            if (i > 0 && pausaEntrePedidosMs > 0) await dormir(pausaEntrePedidosMs)
            tokens[pedido.recurso] = await tomar(t, tx, id, pedido, claves[pedido.recurso])
            if (pedido.recurso === RED) {
              t.empezarSubida(id, (pedidos.length - 1 - i) * pausaEntrePedidosMs + duracionMs)
            }
          }
          await usar(t, id, pedidos, tokens, duracionMs)
          t.terminarSubida(id, 'completa')
          const suelta = [...t.worker(id).tiene]
          t.contar({
            titulo: `${nombre} termina y suelta ${lista(suelta.map((r) => NOMBRE_RECURSO[r]))}`,
            detalle: 'Al salir del callback, withTransaction confirma la transacción y libera todos sus locks de una vez.',
            tono: 'ok',
            foco: [id],
            recursos: suelta,
          })
        },
        { timeoutMs: VIDA_TRANSACCION_MS },
      ),
    )
    t.cambiar((s) => {
      soltarTodo(s, id)
      t.worker(id).estado = 'COMMITTED'
    })
  } catch (error) {
    t.terminarSubida(id, 'cortada')
    const esDeadlock = error instanceof Dls.DeadlockAbortedError
    t.cambiar(
      (s) => {
        soltarTodo(s, id)
        const w = t.worker(id)
        if (w.estado !== 'DEADLOCK_ABORTED') w.estado = 'IDLE'
      },
      esDeadlock
        ? undefined
        : {
            titulo: `${nombre} falló`,
            detalle: error instanceof Error ? error.message : String(error),
            tono: 'error',
            foco: [id],
          },
    )
    throw error
  }
}

async function conReintento(
  t: Tablero,
  cliente: ClienteDemo,
  id: string,
  pedidos: Pedido[],
  claves: Record<RecursoId, string>,
  demoraMs: number,
  pausaEntrePedidosMs: number,
  duracionMs: number,
) {
  await dormir(demoraMs)
  try {
    await trabajo(t, cliente, id, pedidos, claves, pausaEntrePedidosMs, duracionMs)
  } catch (error) {
    if (!(error instanceof Dls.DeadlockAbortedError)) throw error
    await dormir(PAUSA_REINTENTO_MS)
    t.cambiar(
      (s) => {
        s.deadlock = undefined
        t.worker(id).estado = 'IDLE'
      },
      {
        titulo: `${t.corto(id)} reintenta con una transacción nueva`,
        detalle: 'Así se maneja un DeadlockAbortedError: se vuelve a empezar desde cero, con otra transacción.',
        tono: 'info',
        foco: [id],
      },
    )
    await trabajo(t, cliente, id, pedidos, claves, pausaEntrePedidosMs, duracionMs)
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

  t.contar(INTRO[escenario](ids.length))
  const detenerMotor = vigilarMotor(t, cliente, claves)

  let resultados: PromiseSettledResult<void>[]
  try {
    resultados = await conRegistro(
      (llamada) => enviar({ tipo: 'llamada', llamada }),
      async () => {
        await dormir(PAUSA_INTRO_MS)

        if (escenario === 'shared_read') {
          return Promise.allSettled(
            ids.map((id, i) =>
              conReintento(t, cliente, id, [{ recurso: ARCHIVO, modo: 'SHARED_READ' }], claves, i * 3000, 0, 9500 - i * 2200),
            ),
          )
        }

        if (escenario === 'tarea_simple') {
          return Promise.allSettled(
            ids.map((id, i) =>
              conReintento(t, cliente, id, [{ recurso: ARCHIVO, modo: 'EXCLUSIVE' }], claves, i === 0 ? 0 : 1500 + i * 2250, 0, 6500),
            ),
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
            7000,
            6000,
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
            3500,
            6000,
            4500,
          ),
        ]
        if (nodos === 3) {
          tareas.push(conReintento(t, cliente, 'w3', [{ recurso: ARCHIVO, modo: 'EXCLUSIVE' }], claves, 15500, 0, 4500))
        }
        return Promise.allSettled(tareas)
      },
    )
  } finally {
    await detenerMotor()
  }

  const fallo = resultados.find((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (fallo) {
    t.terminar({
      titulo: 'La corrida terminó con un error',
      detalle: fallo.reason instanceof Error ? fallo.reason.message : String(fallo.reason),
      tono: 'error',
      foco: [],
    })
    throw fallo.reason
  }

  const tokens = t.tokensDe(ARCHIVO).map((x) => `#${x}`)
  t.terminar(
    escenario === 'shared_read'
      ? {
          titulo: `Listo: ${ids.length} lecturas a la vez y nadie esperó`,
          detalle: 'SHARED_READ deja convivir lecturas: el motor solo hace esperar cuando alguien quiere escribir.',
          tono: 'ok',
          foco: [],
        }
      : escenario === 'tarea_simple'
        ? {
            titulo: `Listo: escribieron de a uno, con tokens ${tokens.join(' → ')}`,
            detalle:
              'En el reporte se ve: cada bloque de líneas es de un solo worker y los tokens nunca bajan. EXCLUSIVE garantiza un escritor por vez.',
            tono: 'ok',
            foco: [],
          }
        : {
            titulo: `Listo: el motor rompió el deadlock abortando a ${lista(t.victimas.map((v) => t.corto(v)))}`,
            detalle: 'La víctima soltó sus locks, el resto terminó, y la víctima reintentó con otra transacción y también terminó.',
            tono: 'ok',
            foco: [],
          },
  )
}
