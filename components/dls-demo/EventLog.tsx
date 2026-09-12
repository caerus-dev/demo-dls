import { cn } from '@/lib/utils'
import type { EventoLog } from '@/lib/dls-demo/types'
import { formatHora } from './utils'

const NIVEL_COLOR: Record<EventoLog['nivel'], string> = {
  info: 'text-zinc-400',
  ok: 'text-emerald-400',
  aviso: 'text-amber-400',
  error: 'text-red-400',
}

export function EventLog({ log }: { log: EventoLog[] }) {
  const ordenado = [...log].sort((a, b) => b.t - a.t)

  return (
    <div className="flex min-h-0 flex-col rounded-xl border border-border bg-card/40">
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Registro de eventos
        </h3>
      </div>
      <ul className="max-h-64 flex-1 overflow-y-auto p-2 font-mono text-[13px] leading-relaxed">
        {ordenado.length === 0 && <li className="px-1 py-2 text-zinc-500">Sin eventos.</li>}
        {ordenado.map((e, i) => (
          <li key={`${e.t}-${i}`} className="flex gap-2 px-1 py-0.5">
            <span className="shrink-0 text-zinc-600">{formatHora(e.t)}</span>
            <span className={cn('min-w-0', NIVEL_COLOR[e.nivel])}>{e.texto}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
