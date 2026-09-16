import type { DemoState } from './types'

export interface Llamada {
  id: string
  pendiente?: boolean
  t: number
  worker?: string
  expresion: string
  resultado?: string
  error?: string
  ms: number
}

export type EventoStream =
  | { tipo: 'estado'; state: DemoState }
  | { tipo: 'llamada'; llamada: Llamada }
  | { tipo: 'fin' }
  | { tipo: 'error'; mensaje: string }

export type EscenarioDisponible = 'shared_read' | 'tarea_simple' | 'deadlock' | 'estampida'

export const ESCENARIOS_DISPONIBLES: readonly EscenarioDisponible[] = ['shared_read', 'tarea_simple', 'deadlock', 'estampida']
