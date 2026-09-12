import { cn } from '@/lib/utils'
import type { EventoLog } from '@/lib/dls-demo/types'
import { segundosDesde } from './utils'

const NIVEL_COLOR: Record<EventoLog['nivel'], string> = {
  info: 'text-zinc-400',
  ok: 'text-emerald-400',
  aviso: 'text-amber-400',
  error: 'text-red-400',
}

export function EventLog({ log, inicio }: { log: EventoLog[]; inicio?: number }) {
  const ordenado = [...log].sort((a, b) => b.t - a.t)
  const base = inicio ?? ordenado.at(-1)?.t ?? 0

  return (
    <div className="flex min-h-[220px] flex-col overflow-hidden rounded-xl border border-border bg-card/40 lg:min-h-0 lg:flex-1">
      <div className="flex min-h-9 items-center justify-between border-b border-border px-3 py-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registro de eventos</h3>
        <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">{log.length}</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5 font-mono text-[0.78rem] leading-snug">
        {ordenado.length === 0 && <li className="px-1 py-2 text-zinc-500">Todavía no pasó nada.</li>}
        {ordenado.map((e, i) => (
          <li key={`${e.t}-${i}`} className="flex gap-2 px-1 py-[0.2rem]">
            <span className="w-12 shrink-0 text-right tabular-nums text-zinc-500">{segundosDesde(e.t, base)}</span>
            <span className={cn('min-w-0', NIVEL_COLOR[e.nivel])}>{e.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
