import { Lock, Radar } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecursoId, Worker } from '@/lib/dls-demo/types'
import { ESTADO_CONFIG } from './estado-config'
import { abreviarTx } from './utils'

const CORTO: Record<RecursoId, string> = {
  'file:reports_export': 'reporte',
  'network:cloud_uploader': 'canal de subida',
}

function Chip({ id, tono }: { id: RecursoId; tono: 'tiene' | 'espera' }) {
  const Icono = tono === 'tiene' ? Lock : Radar
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium ring-1',
        tono === 'tiene'
          ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/30'
          : 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
      )}
    >
      <Icono className="size-3" aria-hidden />
      {CORTO[id]}
    </span>
  )
}

export function WorkerCard({ worker, enfocado = false }: { worker: Worker; enfocado?: boolean }) {
  const cfg = ESTADO_CONFIG[worker.estado]
  const Icono = cfg.icono

  return (
    <article
      className={cn(
        'rounded-xl border bg-card/60 px-3.5 py-2.5 transition-[border-color,box-shadow] duration-300',
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

      <div className="mt-2 flex min-h-6 flex-wrap items-center gap-1.5">
        {worker.tiene.map((r) => (
          <Chip key={r} id={r} tono="tiene" />
        ))}
        {worker.espera && (
          <>
            <span className="text-[0.6875rem] text-muted-foreground">espera</span>
            <Chip id={worker.espera} tono="espera" />
          </>
        )}
        {worker.tiene.length === 0 && !worker.espera && (
          <span className="text-[0.6875rem] text-zinc-600">sin locks</span>
        )}
        <span className="ml-auto flex items-center gap-2 font-mono text-[0.6875rem] text-muted-foreground">
          {worker.transaccionId && (
            <span>
              tx <span className="text-zinc-300">{abreviarTx(worker.transaccionId)}</span>
            </span>
          )}
          {worker.fencingToken != null && (
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-300 ring-1 ring-white/10">
              #{worker.fencingToken}
            </span>
          )}
        </span>
      </div>
    </article>
  )
}
