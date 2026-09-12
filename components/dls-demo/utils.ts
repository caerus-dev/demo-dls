import type { RecursoId, Worker } from '@/lib/dls-demo/types'

export function segundosDesde(t: number, base: number): string {
  return `+${(Math.max(0, t - base) / 1000).toFixed(1)}s`
}

export function abreviarTx(id: string): string {
  return id.slice(0, 8)
}

export function nombreDeWorker(workers: Worker[], id: string): string {
  return workers.find((w) => w.id === id)?.nombre ?? id
}

export function nombreCorto(nombre: string): string {
  return nombre.replace(/^Worker\s+/i, '')
}

export function recursoCorto(id: RecursoId): string {
  return id.split(':')[0] ?? id
}
