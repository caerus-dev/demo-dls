import { cn } from '@/lib/utils'
import type { Llamada } from '@/lib/dls-demo/stream'
import type { Worker } from '@/lib/dls-demo/types'
import { nombreCorto, segundosDesde } from './utils'

export type LlamadaConId = Llamada & { id: string }

export function PanelLlamadas({
  llamadas,
  workers,
  inicio,
}: {
  llamadas: LlamadaConId[]
  workers: Worker[]
  inicio?: number
}) {
  if (llamadas.length === 0) {
    return (
      <p className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        Cada llamada real que el servidor le hace a <code className="font-mono">@caerus-dev/sdk</code> aparece acá, con
        lo que contestó el motor.
      </p>
    )
  }

  const base = inicio ?? Math.min(...llamadas.map((l) => l.t))
  const nombre = (id?: string) => workers.find((w) => w.id === id)?.nombre
  const ordenadas = [...llamadas].sort((a, b) => b.t + b.ms - (a.t + a.ms))

  return (
    <ol className="divide-y divide-border/60 px-3">
      {ordenadas.map((l) => {
        const fallo = Boolean(l.error)
        const quien = nombre(l.worker)
        return (
          <li key={l.id} className="py-2">
            <div className="mb-0.5 flex items-center gap-2 text-[0.6875rem] text-muted-foreground">
              <span className="font-mono tabular-nums">{segundosDesde(l.t + l.ms, base)}</span>
              {quien && <span className="rounded bg-secondary/70 px-1.5 py-px">{nombreCorto(quien)}</span>}
              <span className="ml-auto font-mono tabular-nums">{l.ms} ms</span>
            </div>
            <code className="block break-words font-mono text-xs leading-snug text-foreground">{l.expresion}</code>
            <div
              className={cn(
                'mt-0.5 flex items-start gap-1.5 font-mono text-xs leading-snug',
                fallo ? 'text-red-400' : 'text-emerald-400',
              )}
            >
              <span aria-hidden>{fallo ? '✕' : '→'}</span>
              <span className="break-words">{fallo ? l.error : l.resultado}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
