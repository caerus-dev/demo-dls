import { cn } from '@/lib/utils'
import type { Momento } from '@/lib/dls-demo/types'
import { segundosDesde } from './utils'

const ACTUAL: Record<Momento['tono'], string> = {
  info: 'border-sky-500/40 bg-sky-500/10',
  ok: 'border-emerald-500/40 bg-emerald-500/10',
  aviso: 'border-amber-500/40 bg-amber-500/10',
  error: 'border-red-500/50 bg-red-500/10',
}

const TITULO: Record<Momento['tono'], string> = {
  info: 'text-sky-200',
  ok: 'text-emerald-200',
  aviso: 'text-amber-200',
  error: 'text-red-200',
}

export function Narracion({
  momentos,
  inicio,
  grande = false,
}: {
  momentos: Momento[]
  inicio?: number
  grande?: boolean
}) {
  const base = inicio ?? momentos[0]?.t ?? 0
  const lista = [...momentos].reverse()

  return (
    <div className="flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-border bg-card/40 lg:min-h-0 lg:flex-[1.6]">
      <div className="flex min-h-9 items-center justify-between border-b border-border px-3 py-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qué está pasando</h3>
        {momentos.length > 0 && (
          <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">paso {momentos.length}</span>
        )}
      </div>
      <ol className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2">
        {lista.length === 0 && (
          <li className="px-1.5 py-2 text-sm leading-relaxed text-muted-foreground">
            Elegí un escenario abajo. Acá se va contando, paso a paso, qué hace cada worker y qué le responde el motor.
            Cada recurso muestra además lo que dice el motor en vivo, y el reporte muestra quién escribió qué.
          </li>
        )}
        {lista.map((m, i) => {
          const numero = momentos.length - i
          const actual = i === 0
          return (
            <li
              key={numero}
              className={cn(
                'rounded-lg border px-3 py-2 transition-opacity',
                actual ? cn('dls-anim-entrada', ACTUAL[m.tono]) : 'border-transparent opacity-55',
              )}
            >
              <div className="flex items-baseline gap-2">
                <span className="w-5 shrink-0 font-mono text-[0.6875rem] tabular-nums text-muted-foreground">{numero}</span>
                <p
                  className={cn(
                    'min-w-0 font-semibold leading-snug',
                    actual ? cn(grande ? 'text-lg' : 'text-[0.95rem]', TITULO[m.tono]) : 'text-sm text-zinc-200',
                  )}
                >
                  {m.titulo}
                </p>
                <span className="ml-auto shrink-0 font-mono text-[0.6875rem] tabular-nums text-zinc-500">
                  {segundosDesde(m.t, base)}
                </span>
              </div>
              {m.detalle && (
                <p
                  className={cn(
                    'mt-0.5 pl-7 leading-relaxed text-muted-foreground',
                    actual && grande ? 'text-sm text-zinc-300' : 'text-xs',
                    !actual && 'line-clamp-1',
                  )}
                >
                  {m.detalle}
                </p>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
