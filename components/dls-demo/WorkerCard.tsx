import { cn } from '@/lib/utils'
import type { Worker } from '@/lib/dls-demo/types'
import { ESTADO_CONFIG } from './estado-config'
import { abreviarTx } from './utils'

const ETIQUETA = 'text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground'

function RecursoChip({ id, tono }: { id: string; tono: 'neutral' | 'espera' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[0.6875rem]',
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

export function WorkerCard({ worker, enfocado = false }: { worker: Worker; enfocado?: boolean }) {
  const cfg = ESTADO_CONFIG[worker.estado]
  const Icono = cfg.icono

  return (
    <article
      className={cn(
        'rounded-xl border bg-card/60 px-3.5 py-3 transition-[border-color,box-shadow] duration-300',
        cfg.borde,
        cfg.anim,
        enfocado && 'ring-2 ring-sky-400/80 ring-offset-2 ring-offset-background',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold leading-tight text-foreground">{worker.nombre}</h3>
          <p className="truncate text-xs text-muted-foreground">{worker.tarea}</p>
        </div>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ring-1',
            cfg.fondo,
            cfg.texto,
            cfg.borde,
          )}
        >
          <Icono className="size-3.5" aria-hidden />
          {cfg.etiqueta}
        </span>
      </div>

      <div className="mt-2.5 grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 text-xs">
        <span className={ETIQUETA}>Tiene</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {worker.tiene.length > 0 ? (
            worker.tiene.map((r) => <RecursoChip key={r} id={r} tono="neutral" />)
          ) : (
            <span className="text-zinc-500">—</span>
          )}
        </div>

        <span className={ETIQUETA}>Espera</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {worker.espera ? (
            <>
              <RecursoChip id={worker.espera} tono="espera" />
              {worker.estado === 'QUEUED' && <RadarPunto />}
            </>
          ) : (
            <span className="text-zinc-500">—</span>
          )}
        </div>
      </div>

      <div className="mt-2 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.6875rem] text-muted-foreground">
        {worker.transaccionId ? (
          <span>
            tx <span className="text-zinc-300">{abreviarTx(worker.transaccionId)}</span>
          </span>
        ) : (
          <span className="text-zinc-600">sin transacción</span>
        )}
        {worker.fencingToken != null && (
          <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-zinc-300 ring-1 ring-white/10">
            token #{worker.fencingToken}
          </span>
        )}
      </div>
    </article>
  )
}
