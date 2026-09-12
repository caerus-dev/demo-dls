import {
  Ban,
  CircleCheckBig,
  Clock,
  Hourglass,
  Lock,
  Radar,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react'
import type { WorkerEstado } from '@/lib/dls-demo/types'

export interface EstadoVisual {
  etiqueta: string
  icono: LucideIcon
  /** Clase de color de texto/borde (color literal, no token). */
  texto: string
  borde: string
  fondo: string
  /** Punto de color usado en la insignia. */
  punto: string
  /** Color hex para el nodo del grafo. */
  hex: string
  /** Clase de animación aplicada a la tarjeta (respeta reduced-motion). */
  anim: string
}

export const ESTADO_CONFIG: Record<WorkerEstado, EstadoVisual> = {
  IDLE: {
    etiqueta: 'En espera',
    icono: Clock,
    texto: 'text-zinc-400',
    borde: 'border-zinc-700',
    fondo: 'bg-zinc-500/10',
    punto: 'bg-zinc-500',
    hex: '#71717a',
    anim: '',
  },
  STARTING_TX: {
    etiqueta: 'Abriendo transacción',
    icono: Hourglass,
    texto: 'text-sky-400',
    borde: 'border-sky-500/60',
    fondo: 'bg-sky-500/10',
    punto: 'bg-sky-400',
    hex: '#38bdf8',
    anim: 'dls-anim-pulse-edge',
  },
  HOLDING: {
    etiqueta: 'Con lock',
    icono: Lock,
    texto: 'text-emerald-400',
    borde: 'border-emerald-500/60',
    fondo: 'bg-emerald-500/10',
    punto: 'bg-emerald-400',
    hex: '#34d399',
    anim: 'dls-anim-glow',
  },
  QUEUED: {
    etiqueta: 'En cola',
    icono: Radar,
    texto: 'text-amber-400',
    borde: 'border-amber-500/60',
    fondo: 'bg-amber-500/10',
    punto: 'bg-amber-400',
    hex: '#fbbf24',
    anim: 'dls-anim-radar-card',
  },
  DEADLOCK_ABORTED: {
    etiqueta: 'Víctima de deadlock',
    icono: ShieldAlert,
    texto: 'text-red-500',
    borde: 'border-red-500/70',
    fondo: 'bg-red-500/10',
    punto: 'bg-red-500',
    hex: '#ef4444',
    anim: 'dls-anim-shake',
  },
  COMMITTED: {
    etiqueta: 'Terminado',
    icono: CircleCheckBig,
    texto: 'text-teal-400',
    borde: 'border-teal-500/50',
    fondo: 'bg-teal-500/10',
    punto: 'bg-teal-400',
    hex: '#2dd4bf',
    anim: 'dls-anim-fade',
  },
  ZOMBIE_REJECTED: {
    etiqueta: 'Escritura rechazada',
    icono: Ban,
    texto: 'text-orange-500',
    borde: 'border-orange-500',
    fondo: 'bg-orange-500/10',
    punto: 'bg-orange-500',
    hex: '#f97316',
    anim: '',
  },
}
