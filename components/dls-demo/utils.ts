import type { RecursoId, Worker } from '@/lib/dls-demo/types'

/** Hora local del evento en formato HH:MM:SS.mmm a partir de un timestamp en ms. */
export function formatHora(t: number): string {
  const d = new Date(t)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

/** Abrevia un id de transacción a sus primeros 8 caracteres. */
export function abreviarTx(id: string): string {
  return id.slice(0, 8)
}

/** Nombre completo del worker según su id, o el id si no aparece. */
export function nombreDeWorker(workers: Worker[], id: string): string {
  return workers.find((w) => w.id === id)?.nombre ?? id
}

/** Nombre corto del worker (sin el prefijo "Worker "). */
export function nombreCorto(nombre: string): string {
  return nombre.replace(/^Worker\s+/i, '')
}

/** Segmento de namespace del recurso, útil como etiqueta corta ("file" / "network"). */
export function recursoCorto(id: RecursoId): string {
  return id.split(':')[0]
}
