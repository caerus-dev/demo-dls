import { cn } from '@/lib/utils'
import type { Worker } from '@/lib/dls-demo/types'
import { ESTADO_CONFIG } from './estado-config'
import { abreviarTx } from './utils'

function ttlColor(ratio: number): string {
  if (ratio > 0.5) return 'bg-emerald-400'
  if (ratio > 0.2) return 'bg-amber-400'
  return 'bg-red-500'
}

function RecursoChip({ id, tono }: { id: string; tono: 'neutral' | 'espera' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 font-mono text-xs',
        tono === 'espera'
          ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
          : 'bg-zinc-700/60 text-zinc-200 ring-1 ring-white/5',
      )}
    >
      {id}
    </span>
  )
}

function RadarPunto() {
  return (
    <span className="relative inline-flex size-3 items-center justify-center" aria-hidden>
      <span className="dls-anim-radar-ping absolute inline-flex size-3 rounded-full bg-amber-400/70" />
      <span className="relative inline-flex size-1.5 rounded-full bg-amber-400" />
    </span>
  )
}

export function WorkerCard({ worker }: { worker: Worker }) {
  const cfg = ESTADO_CONFIG[worker.estado]
  const Icono = cfg.icono
  const ratio =
    worker.ttlRestanteMs != null && worker.ttlTotalMs
      ? Math.max(0, Math.min(1, worker.ttlRestanteMs / worker.ttlTotalMs))
      : null

  return (
    <article
      className={cn(
        'rounded-xl border bg-card/60 p-4 backdrop-blur-sm transition-colors',
        cfg.borde,
        cfg.anim,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-foreground">{worker.nombre}</h3>
          <p className="truncate text-sm text-muted-foreground">{worker.tarea}</p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1',
            cfg.fondo,
            cfg.texto,
            cfg.borde,
          )}
        >
          <Icono className="size-3.5" aria-hidden />
          {cfg.etiqueta}
        </span>
      </div>

      {worker.transaccionId && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          tx <span className="text-zinc-300">{abreviarTx(worker.transaccionId)}</span>
        </p>
      )}

      {ratio != null && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>TTL</span>
            <span className="font-mono">{Math.round((worker.ttlRestanteMs ?? 0) / 1000)}s</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-700/70">
            <div
              className={cn('h-full rounded-full transition-[width] duration-500', ttlColor(ratio))}
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tiene:</span>
          {worker.tiene.length > 0 ? (
            worker.tiene.map((r) => <RecursoChip key={r} id={r} tono="neutral" />)
          ) : (
            <span className="text-xs text-zinc-500">—</span>
          )}
        </div>

        {worker.espera && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Espera:</span>
            <RecursoChip id={worker.espera} tono="espera" />
            {worker.estado === 'QUEUED' && <RadarPunto />}
          </div>
        )}

        {worker.fencingToken != null && (
          <div>
            <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 font-mono text-xs text-zinc-300 ring-1 ring-white/10">
              token #{worker.fencingToken}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
