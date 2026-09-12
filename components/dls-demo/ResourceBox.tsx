import { Cloud, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Recurso, Worker } from '@/lib/dls-demo/types'
import { nombreCorto, nombreDeWorker } from './utils'

const ETIQUETA = 'text-[0.6875rem] font-medium uppercase tracking-wide text-muted-foreground'

function ModoBadge({ recurso }: { recurso: Recurso }) {
  if (recurso.holders.length === 0) {
    return (
      <span className="rounded-full bg-zinc-700/60 px-2 py-0.5 text-xs font-semibold text-zinc-300 ring-1 ring-white/10">
        Libre
      </span>
    )
  }
  const exclusivo = recurso.modo === 'EXCLUSIVE'
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 font-mono text-xs font-semibold ring-1',
        exclusivo
          ? 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/40'
          : 'bg-sky-500/10 text-sky-300 ring-sky-500/40',
      )}
    >
      {recurso.modo}
    </span>
  )
}

export function ResourceBox({ recurso, workers }: { recurso: Recurso; workers: Worker[] }) {
  const esRed = recurso.tipo === 'red'
  const Icono = esRed ? Cloud : FileText
  const activo = recurso.holders.length > 0

  return (
    <article className="rounded-xl border border-border bg-card/60 px-3.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'relative grid size-9 shrink-0 place-items-center rounded-lg ring-1',
              activo ? 'bg-emerald-500/10 ring-emerald-500/30' : 'bg-zinc-800 ring-white/10',
            )}
          >
            {esRed && activo && (
              <>
                <span className="dls-anim-wave absolute inset-0 rounded-lg ring-2 ring-emerald-400/40" />
                <span
                  className="dls-anim-wave absolute inset-0 rounded-lg ring-2 ring-emerald-400/30"
                  style={{ animationDelay: '0.8s' }}
                />
              </>
            )}
            <Icono className={cn('relative size-4', activo ? 'text-emerald-300' : 'text-zinc-400')} aria-hidden />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold leading-tight text-foreground">{recurso.etiqueta}</h3>
            <p className="truncate font-mono text-[0.6875rem] text-muted-foreground">{recurso.id}</p>
          </div>
        </div>
        <ModoBadge recurso={recurso} />
      </div>

      <div className="mt-2.5 grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5 text-xs">
        <span className={ETIQUETA}>Lo tiene</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {recurso.holders.length > 0 ? (
            recurso.holders.map((id) => (
              <span
                key={id}
                className="inline-flex items-center rounded-md bg-emerald-500/15 px-1.5 py-0.5 font-medium text-emerald-200 ring-1 ring-emerald-500/30"
              >
                {nombreCorto(nombreDeWorker(workers, id))}
              </span>
            ))
          ) : (
            <span className="text-zinc-500">nadie</span>
          )}
        </div>

        <span className={ETIQUETA}>Cola</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {recurso.cola.length > 0 ? (
            recurso.cola.map((id, i) => (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-200 ring-1 ring-amber-500/30"
              >
                <span className="font-mono text-amber-400/80">{i + 1}</span>
                {nombreCorto(nombreDeWorker(workers, id))}
              </span>
            ))
          ) : (
            <span className="text-zinc-500">vacía</span>
          )}
        </div>

        <span className={ETIQUETA}>Último token</span>
        <span className="font-mono text-zinc-300">
          {recurso.ultimoTokenAceptado != null ? `#${recurso.ultimoTokenAceptado}` : <span className="text-zinc-500">—</span>}
        </span>
      </div>
    </article>
  )
}
