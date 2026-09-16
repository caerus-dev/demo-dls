import { cn } from '@/lib/utils'
import type { Llamada } from '@/lib/dls-demo/stream'
import type { Worker } from '@/lib/dls-demo/types'
import { nombreCorto, segundosDesde } from './utils'

function duracion(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}

export function PanelLlamadas({
  llamadas,
  workers,
  inicio,
}: {
  llamadas: Llamada[]
  workers: Worker[]
  inicio?: number
}) {
  if (llamadas.length === 0) {
    return (
      <p className="px-3 py-2 text-xs leading-relaxed text-muted-foreground">
        Cada llamada real que el servidor le hace a <code className="font-mono">@caerus-dev/sdk</code> aparece acá en el
        momento en que sale, y se completa cuando contesta el motor.
      </p>
    )
  }

  const base = inicio ?? Math.min(...llamadas.map((l) => l.t))
  const nombre = (id?: string) => {
    if (!id) return undefined
    const worker = workers.find((w) => w.id === id)
    if (worker) return nombreCorto(worker.nombre)
    const numero = /^e(\d+)$/.exec(id)?.[1]
    return numero ? `W${numero}` : undefined
  }
  const ordenadas = llamadas
    .map((l, k) => ({ l, k }))
    .sort((a, b) => b.l.t - a.l.t || a.k - b.k)
    .map((x) => x.l)
  const esperando = llamadas.filter((l) => l.pendiente).length

  return (
    <div>
      {esperando > 0 && (
        <p className="sticky top-0 z-10 border-b border-border bg-background/95 px-3 py-1 text-[0.6875rem] text-amber-300">
          {esperando} {esperando === 1 ? 'llamada esperando' : 'llamadas esperando'} respuesta del motor
        </p>
      )}
      <ol className="divide-y divide-border/60 px-3">
        {ordenadas.map((l) => {
          const fallo = Boolean(l.error)
          const quien = nombre(l.worker)
          return (
            <li key={l.id} className="py-2">
              <div className="mb-0.5 flex items-center gap-2 text-[0.6875rem] text-muted-foreground">
                <span className="font-mono tabular-nums">salió {segundosDesde(l.t, base)}</span>
                {quien && <span className="rounded bg-secondary/70 px-1.5 py-px">{quien}</span>}
                <span className={cn('ml-auto font-mono tabular-nums', l.pendiente && 'animate-pulse text-amber-300')}>
                  {l.pendiente ? 'esperando…' : `tardó ${duracion(l.ms)}`}
                </span>
              </div>
              <code className="block break-words font-mono text-xs leading-snug text-foreground">{l.expresion}</code>
              <div
                className={cn(
                  'mt-0.5 flex items-start gap-1.5 font-mono text-xs leading-snug',
                  l.pendiente ? 'text-amber-300/80' : fallo ? 'text-red-400' : 'text-emerald-400',
                )}
              >
                <span aria-hidden>{l.pendiente ? '…' : fallo ? '✕' : '→'}</span>
                <span className="break-words">
                  {l.pendiente ? 'esperando respuesta del motor' : fallo ? l.error : l.resultado}
                </span>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
