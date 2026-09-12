import { AsyncLocalStorage } from 'node:async_hooks'
import { DEFAULT_ENDPOINT, Dls } from '@caerus-dev/sdk'
import type { Llamada } from '@/lib/dls-demo/stream'

interface Contexto {
  worker?: string
  registrar: (llamada: Llamada) => void
}

const almacen = new AsyncLocalStorage<Contexto>()

export const NAMESPACE = process.env.DLS_NAMESPACE?.trim() || 'task_processing'

export function endpointMotor(): string {
  return process.env.CAERUS_ENDPOINT?.trim() || DEFAULT_ENDPOINT
}

export function conRegistro<T>(registrar: (llamada: Llamada) => void, fn: () => Promise<T>): Promise<T> {
  return almacen.run({ registrar }, fn)
}

export function comoWorker<T>(worker: string, fn: () => Promise<T>): Promise<T> {
  const actual = almacen.getStore()
  return actual ? almacen.run({ ...actual, worker }, fn) : fn()
}

const globalDls = globalThis as unknown as { __dlsDemo?: Dls.DlsClient }

function clienteReal(): Dls.DlsClient {
  if (globalDls.__dlsDemo) return globalDls.__dlsDemo
  const apiKey = process.env.CAERUS_API_KEY?.trim()
  if (!apiKey) throw new Error('Falta CAERUS_API_KEY en las variables de entorno')
  const endpoint = process.env.CAERUS_ENDPOINT?.trim()
  const tls = process.env.CAERUS_TLS ? process.env.CAERUS_TLS === 'true' : true
  globalDls.__dlsDemo = new Dls.DlsClient({ apiKey, tls, ...(endpoint ? { endpoint } : {}) })
  return globalDls.__dlsDemo
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function valor(v: unknown): string {
  if (typeof v === 'function') return 'fn'
  if (typeof v === 'string') return UUID.test(v) ? `'${v.slice(0, 8)}…'` : `'${v}'`
  if (v === null || v === undefined) return String(v)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return `[${v.map(valor).join(', ')}]`
  if (typeof v === 'object') {
    const campos = Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== undefined)
      .map(([k, x]) => `${k}: ${valor(x)}`)
    return campos.length ? `{ ${campos.join(', ')} }` : '{}'
  }
  return String(v)
}

function argumentos(args: unknown[]): string {
  return args.filter((a) => a !== undefined).map(valor).join(', ')
}

function describirError(e: unknown): string {
  const err = e as { name?: string; message?: string; reason?: string }
  const nombre = err?.name ?? 'Error'
  return `${nombre}${err?.reason ? ` (${err.reason})` : ''}: ${err?.message ?? String(e)}`
}

async function medir<T>(expresion: string, fn: () => Promise<T>, resumen: (r: T) => string): Promise<T> {
  const ctx = almacen.getStore()
  const inicio = Date.now()
  try {
    const r = await fn()
    ctx?.registrar({ t: inicio, worker: ctx.worker, expresion, resultado: resumen(r), ms: Date.now() - inicio })
    return r
  } catch (e) {
    ctx?.registrar({ t: inicio, worker: ctx.worker, expresion, error: describirError(e), ms: Date.now() - inicio })
    throw e
  }
}

export interface TxDemo {
  readonly transactionId: string
  acquireLock(
    namespace: string,
    lockKey: string,
    mode: Dls.LockMode,
    options?: Dls.AcquireLockOptions,
  ): Promise<Dls.LockHolder>
}

export interface ClienteDemo {
  withTransaction<T>(callback: (tx: TxDemo) => Promise<T>, options?: Dls.TransactionOptions): Promise<T>
  getLockStatus(namespace: string, lockKey: string): Promise<Dls.LockStatusResponse>
}

export function clienteDemo(): ClienteDemo {
  const real = clienteReal()
  return {
    withTransaction<T>(callback: (tx: TxDemo) => Promise<T>, options?: Dls.TransactionOptions): Promise<T> {
      return medir(
        `dls.withTransaction(async (tx) => …${options ? `, ${valor(options)}` : ''})`,
        () =>
          real.withTransaction(
            (tx) =>
              callback({
                transactionId: tx.transactionId,
                acquireLock: (namespace, lockKey, mode, opciones) =>
                  medir(
                    `tx.acquireLock(${argumentos([namespace, lockKey, mode, opciones])})`,
                    () => tx.acquireLock(namespace, lockKey, mode, opciones),
                    (l) => `${l.status}${l.fencingToken !== undefined ? ` · fencing token #${l.fencingToken}` : ''}`,
                  ),
              }),
            options,
          ),
        () => 'transacción cerrada, locks liberados',
      )
    },
    getLockStatus: (namespace, lockKey) => real.getLockStatus(namespace, lockKey),
  }
}
