'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { DemoCallbacks, DemoState } from '@/lib/dls-demo/types'
import { ControlBar } from './ControlBar'
import type { Tiempo } from './Cronometro'
import { ESTADO_CONFIG } from './estado-config'
import { Narracion } from './Narracion'
import { ResourceBox } from './ResourceBox'
import { StatusHeader } from './StatusHeader'
import { WaitForGraph } from './WaitForGraph'
import { WorkerCard } from './WorkerCard'

function Titulo({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-widest text-muted-foreground">{children}</h2>
  )
}

function Leyenda() {
  return (
    <div className="mt-2.5 flex shrink-0 flex-wrap gap-1.5 rounded-xl border border-border bg-card/30 p-2.5 [@media(max-height:740px)]:hidden">
      {Object.values(ESTADO_CONFIG).map((c) => {
        const Icono = c.icono
        return (
          <span
            key={c.etiqueta}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ring-1',
              c.fondo,
              c.texto,
              c.borde,
            )}
          >
            <Icono className="size-3" aria-hidden />
            {c.etiqueta}
          </span>
        )
      })}
    </div>
  )
}

export function DlsDemo({
  state,
  callbacks,
  tiempo,
  panelLlamadas,
  cantidadLlamadas,
}: {
  state: DemoState
  callbacks: DemoCallbacks
  tiempo: Tiempo | null
  panelLlamadas: ReactNode
  cantidadLlamadas: number
}) {
  const inicio = state.momentos[0]?.t
  const foco = state.enCurso ? (state.momentos[state.momentos.length - 1]?.foco ?? []) : []

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground lg:h-dvh lg:min-h-0 lg:overflow-hidden">
      <StatusHeader motor={state.motor} escenario={state.escenario} tiempo={tiempo} />

      <main className="grid flex-1 grid-cols-1 gap-4 p-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)]">
        <section aria-label="Workers" className="flex min-h-0 flex-col">
          <Titulo>Workers</Titulo>
          <div className="min-h-0 space-y-2.5 overflow-y-auto p-1">
            {state.workers.map((w) => (
              <WorkerCard key={w.id} worker={w} enfocado={foco.includes(w.id)} />
            ))}
          </div>
          <Leyenda />
        </section>

        <section aria-label="Recursos" className="flex min-h-0 flex-col">
          <Titulo>Recursos</Titulo>
          <div className="space-y-2.5">
            {state.recursos.map((r) => (
              <ResourceBox key={r.id} recurso={r} workers={state.workers} />
            ))}
          </div>
          <div className="mt-2.5 flex min-h-0 flex-1 flex-col">
            <WaitForGraph workers={state.workers} aristas={state.aristas} deadlock={state.deadlock} />
          </div>
        </section>

        <section aria-label="Actividad" className="flex min-h-0 flex-col">
          <Titulo>Actividad</Titulo>
          <div className="flex min-h-0 flex-1 flex-col gap-2.5">
            <Narracion momentos={state.momentos} inicio={inicio} />
            <div className="flex min-h-[220px] flex-col overflow-hidden rounded-xl border border-border bg-card/40 lg:min-h-0 lg:flex-1">
              <div className="flex min-h-9 items-center justify-between border-b border-border px-3 py-1.5">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Llamadas al SDK</h3>
                <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">{cantidadLlamadas}</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">{panelLlamadas}</div>
            </div>
          </div>
        </section>
      </main>

      <ControlBar state={state} callbacks={callbacks} />
    </div>
  )
}
