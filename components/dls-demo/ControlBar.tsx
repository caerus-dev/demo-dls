'use client'

import { Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DemoCallbacks, DemoState, Escenario } from '@/lib/dls-demo/types'

const ESCENARIOS: { clave: Escenario; etiqueta: string; destacado?: boolean }[] = [
  { clave: 'shared_read', etiqueta: '1 · Lectura compartida' },
  { clave: 'tarea_simple', etiqueta: '2 · Tarea simple' },
  { clave: 'deadlock', etiqueta: '3 · Forzar deadlock', destacado: true },
  { clave: 'zombie', etiqueta: '4 · Escritura zombie' },
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
            valor === o.valor
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  )
}

export function ControlBar({ state, callbacks }: { state: DemoState; callbacks: DemoCallbacks }) {
  const { escenario, modo, nodos, enCurso, esperandoSiguientePaso } = state

  return (
    <div className="sticky bottom-0 z-20 border-t border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {ESCENARIOS.map((e) => {
            const activo = escenario === e.clave
            return (
              <Button
                key={e.clave}
                size="lg"
                variant={e.destacado ? 'default' : 'outline'}
                disabled={enCurso}
                onClick={() => callbacks.onEscenario(e.clave)}
                className={cn(
                  e.destacado && 'bg-red-500 text-white hover:bg-red-500/90',
                  activo && 'ring-2 ring-offset-2 ring-offset-background',
                  activo && (e.destacado ? 'ring-red-400' : 'ring-primary'),
                )}
              >
                {e.etiqueta}
              </Button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Segmento
            opciones={[
              { valor: 'auto', etiqueta: 'Automático' },
              { valor: 'paso', etiqueta: 'Paso a paso' },
            ]}
            valor={modo}
            onChange={(v) => callbacks.onModo(v as 'auto' | 'paso')}
          />

          <Segmento
            opciones={[
              { valor: 2, etiqueta: '2 nodos' },
              { valor: 3, etiqueta: '3 nodos' },
            ]}
            valor={nodos}
            onChange={(v) => callbacks.onNodos(v as 2 | 3)}
            disabled={enCurso}
          />

          {modo === 'paso' && (
            <Button
              size="lg"
              disabled={!esperandoSiguientePaso}
              onClick={callbacks.onSiguientePaso}
              className={cn(
                'gap-1.5',
                esperandoSiguientePaso &&
                  'dls-anim-attn bg-sky-500 text-white hover:bg-sky-500/90',
              )}
            >
              <Play className="size-4" aria-hidden />
              Siguiente paso
            </Button>
          )}

          <Button size="lg" variant="outline" onClick={callbacks.onReiniciar} className="gap-1.5">
            <RotateCcw className="size-4" aria-hidden />
            Reiniciar
          </Button>
        </div>
      </div>
    </div>
  )
}
