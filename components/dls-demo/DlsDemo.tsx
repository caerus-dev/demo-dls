'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DemoCallbacks, DemoState } from '@/lib/dls-demo/types'
import { StatusHeader } from './StatusHeader'
import { WorkerCard } from './WorkerCard'
import { ResourceBox } from './ResourceBox'
import { WaitForGraph } from './WaitForGraph'
import { EventLog } from './EventLog'
import { ControlBar } from './ControlBar'

function ColumnaTitulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h2>
  )
}

export function DlsDemo({
  state,
  callbacks,
  panelLlamadas,
}: {
  state: DemoState
  callbacks: DemoCallbacks
  panelLlamadas?: React.ReactNode
}) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <StatusHeader motor={state.motor} />

      <main className="flex-1 p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section aria-label="Workers">
            <ColumnaTitulo>Workers</ColumnaTitulo>
            <div className="space-y-4">
              {state.workers.map((w) => (
                <WorkerCard key={w.id} worker={w} />
              ))}
            </div>
          </section>

          <section aria-label="Recursos">
            <ColumnaTitulo>Recursos</ColumnaTitulo>
            <div className="space-y-4">
              {state.recursos.map((r) => (
                <ResourceBox key={r.id} recurso={r} workers={state.workers} />
              ))}
            </div>
          </section>

          <section aria-label="Motor">
            <ColumnaTitulo>Motor</ColumnaTitulo>
            <div className="space-y-4">
              <WaitForGraph workers={state.workers} aristas={state.aristas} deadlock={state.deadlock} />
              <EventLog log={state.log} />
            </div>
          </section>
        </div>

        {panelLlamadas && (
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card/40">
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground"
            >
              <span>Llamadas al SDK</span>
              <ChevronDown className={cn('size-4 transition-transform', abierto && 'rotate-180')} aria-hidden />
            </button>
            {abierto && <div className="border-t border-border p-4">{panelLlamadas}</div>}
          </div>
        )}
      </main>

      <ControlBar state={state} callbacks={callbacks} />
    </div>
  )
}
