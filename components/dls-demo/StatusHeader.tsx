import { Server } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Escenario, Motor } from '@/lib/dls-demo/types'
import { Cronometro, type Tiempo } from './Cronometro'

const DESCRIPCION: Record<Escenario, { titulo: string; texto: string }> = {
  shared_read: {
    titulo: 'Lectura compartida',
    texto: 'Todos piden el reporte en SHARED_READ: el motor se lo da a todos a la vez y nadie espera.',
  },
  tarea_simple: {
    titulo: 'Tarea simple',
    texto:
      'Todos quieren reescribir el reporte en EXCLUSIVE: entra uno por vez, el resto espera en la cola y cada uno recibe un fencing token mayor.',
  },
  deadlock: {
    titulo: 'Forzar deadlock',
    texto:
      'Alpha toma el archivo y pide la red; Beta toma la red y pide el archivo. El motor detecta el ciclo y aborta a la transacción más joven.',
  },
}

function EstadoMotor({ motor }: { motor: Motor }) {
  const { conectado, verificando, endpoint } = motor
  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-2.5 rounded-full border px-3.5 py-1.5 text-sm font-medium',
        verificando
          ? 'border-zinc-600 bg-zinc-500/10 text-zinc-300'
          : conectado
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-red-500/50 bg-red-500/10 text-red-300',
      )}
    >
      <span className="relative flex size-2.5">
        {conectado && !verificando && (
          <span className="dls-anim-radar-ping absolute inline-flex size-2.5 rounded-full bg-emerald-400/70" />
        )}
        <span
          className={cn(
            'relative inline-flex size-2.5 rounded-full',
            verificando ? 'bg-zinc-400' : conectado ? 'bg-emerald-400' : 'bg-red-400',
          )}
        />
      </span>
      <span>{verificando ? 'Verificando motor…' : conectado ? 'Motor conectado' : 'Motor desconectado'}</span>
      {conectado && !verificando && (
        <span className="hidden font-mono text-xs text-emerald-400/80 xl:inline">{endpoint}</span>
      )}
    </div>
  )
}

export function StatusHeader({
  motor,
  escenario,
  tiempo,
}: {
  motor: Motor
  escenario: Escenario | null
  tiempo: Tiempo | null
}) {
  const desc = escenario ? DESCRIPCION[escenario] : null

  return (
    <header className="flex items-center gap-4 border-b border-border px-4 py-2.5">
      <div className="flex shrink-0 items-center gap-3">
        <div className="grid size-9 place-items-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
          <Server className="size-5 text-foreground" aria-hidden />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight tracking-tight text-foreground">Caerus DLS</h1>
          <p className="text-[0.6875rem] text-muted-foreground">Distributed Lock Service · en vivo</p>
        </div>
      </div>

      <div className="hidden min-w-0 flex-1 border-l border-border pl-4 md:block">
        {desc ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">{desc.titulo}</span>
              {tiempo && <Cronometro tiempo={tiempo} />}
            </div>
            <p className="line-clamp-2 text-xs text-muted-foreground">{desc.texto}</p>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Elegí un escenario abajo. Cada worker usa <code className="font-mono">@caerus-dev/sdk</code> contra el motor
            real de Caerus.
          </p>
        )}
      </div>

      <div className="ml-auto">
        <EstadoMotor motor={motor} />
      </div>
    </header>
  )
}
