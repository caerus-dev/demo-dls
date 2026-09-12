'use client'

import { Code, Loader2, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DemoCallbacks, DemoState, Escenario } from '@/lib/dls-demo/types'

const ESCENARIOS: { clave: Escenario; etiqueta: string; destacado?: boolean }[] = [
  { clave: 'shared_read', etiqueta: '1 · Lectura compartida' },
  { clave: 'tarea_simple', etiqueta: '2 · Tarea simple' },
  { clave: 'deadlock', etiqueta: '3 · Forzar deadlock', destacado: true },
]

function Segmento<T extends string | number>({
  opciones,
  valor,
  onChange,
  disabled,
}: {
  opciones: { valor: T; etiqueta: string }[]
  valor: T
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-border bg-card p-0.5',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      {opciones.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          onClick={() => onChange(o.valor)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            valor === o.valor ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}

export function ControlBar({
  state,
  callbacks,
  detalle,
}: {
  state: DemoState
  callbacks: DemoCallbacks
  detalle: boolean
}) {
  const { escenario, nodos, enCurso, motor } = state
  const sinMotor = !motor.conectado && !motor.verificando
  const bloqueado = enCurso || !motor.conectado || Boolean(motor.verificando)

  return (
    <div className="border-t border-border bg-background px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {sinMotor && (
            <span className="text-sm text-red-300">El motor no responde: no se pueden correr escenarios.</span>
          )}
          {ESCENARIOS.map((e) => {
            const activo = escenario === e.clave
            const corriendo = activo && enCurso
            return (
              <Button
                key={e.clave}
                size="lg"
                variant={e.destacado ? 'default' : 'outline'}
                disabled={bloqueado}
                onClick={() => callbacks.onEscenario(e.clave)}
                className={cn(
                  'gap-2',
                  e.destacado && 'bg-red-500 text-white hover:bg-red-500/90',
                  activo && 'ring-2 ring-offset-2 ring-offset-background',
                  activo && (e.destacado ? 'ring-red-400' : 'ring-primary'),
                  corriendo && 'disabled:opacity-100',
                )}
              >
                {corriendo && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {e.etiqueta}
              </Button>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            variant="outline"
            onClick={callbacks.onDetalle}
            aria-pressed={detalle}
            className={cn('gap-1.5', detalle && 'border-sky-500/60 bg-sky-500/10 text-sky-200')}
          >
            <Code className="size-4" aria-hidden />
            Detalle técnico
          </Button>

          <Segmento
            opciones={[
              { valor: 2, etiqueta: '2 nodos' },
              { valor: 3, etiqueta: '3 nodos' },
            ]}
            valor={nodos}
            onChange={(v) => callbacks.onNodos(v as 2 | 3)}
            disabled={enCurso}
          />

          <Button size="lg" variant="outline" onClick={callbacks.onReiniciar} className="gap-1.5">
            <RotateCcw className="size-4" aria-hidden />
            Reiniciar
          </Button>
        </div>
      </div>
    </div>
  )
}
