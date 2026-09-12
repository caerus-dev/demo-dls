import { Server } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DemoState } from '@/lib/dls-demo/types'

export function StatusHeader({ motor }: { motor: DemoState['motor'] }) {
  const conectado = motor.conectado
  return (
    <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Server className="size-5 text-foreground" aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Caerus DLS</h1>
          <p className="text-xs text-muted-foreground">Distributed Lock Service · demo en vivo</p>
        </div>
      </div>

      <div
        className={cn(
          'flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm font-medium',
          conectado
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500/50 bg-red-500/10 text-red-300',
        )}
      >
        <span className="relative flex size-2.5">
          {conectado && (
            <span className="dls-anim-radar-ping absolute inline-flex size-2.5 rounded-full bg-emerald-400/70" />
          )}
          <span
            className={cn(
              'relative inline-flex size-2.5 rounded-full',
              conectado ? 'bg-emerald-400' : 'bg-red-400',
            )}
          />
        </span>
        {conectado ? (
          <>
            <span>Motor conectado</span>
            <span className="font-mono text-xs text-emerald-400/80">{motor.endpoint}</span>
          </>
        ) : (
          <span>Motor desconectado</span>
        )}
      </div>
    </header>
  )
}
