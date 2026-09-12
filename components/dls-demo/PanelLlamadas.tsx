import { cn } from '@/lib/utils'
import type { Llamada } from '@/lib/dls-demo/stream'
import type { Worker } from '@/lib/dls-demo/types'

export type LlamadaConId = Llamada & { id: string }

export function PanelLlamadas({ llamadas, workers }: { llamadas: LlamadaConId[]; workers: Worker[] }) {
  if (llamadas.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-muted-foreground">
        Elegí un escenario. Acá aparece cada llamada real que el servidor le hace a{' '}
        <code className="font-mono">@caerus-dev/sdk</code> y lo que contestó el motor.
      </p>
    )
  }

  const nombre = (id?: string) => workers.find((w) => w.id === id)?.nombre

  return (
    <ol className="max-h-96 divide-y divide-border/60 overflow-y-auto">
      {llamadas.map((l) => {
        const fallo = Boolean(l.error)
        const quien = nombre(l.worker)
        return (
          <li key={l.id} className="py-3">
            <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="tabular-nums">{new Date(l.t).toLocaleTimeString('es-AR', { hour12: false })}</span>
              {quien && <span className="rounded bg-secondary/70 px-1.5 py-0.5">{quien}</span>}
              <span className="ml-auto tabular-nums">{l.ms} ms</span>
            </div>
            <code className="block break-words font-mono text-[13px] leading-relaxed text-foreground">
              {l.expresion}
            </code>
            <div
              className={cn(
                'mt-1 flex items-start gap-1.5 font-mono text-[12px] leading-relaxed',
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
