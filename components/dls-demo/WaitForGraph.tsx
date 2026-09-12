import { TriangleAlert } from 'lucide-react'
import type { Arista, Deadlock, Worker } from '@/lib/dls-demo/types'
import { ESTADO_CONFIG } from './estado-config'
import { nombreCorto, nombreDeWorker, recursoCorto } from './utils'

const VB_W = 420
const VB_H = 320
const R = 34

interface Punto {
  x: number
  y: number
}

function posiciones(workers: Worker[]): Record<string, Punto> {
  const mapa: Record<string, Punto> = {}
  if (workers.length >= 3) {
    const tri: Punto[] = [
      { x: 210, y: 62 },
      { x: 96, y: 250 },
      { x: 324, y: 250 },
    ]
    workers.slice(0, 3).forEach((w, i) => {
      const p = tri[i]
      if (p) mapa[w.id] = p
    })
  } else {
    const linea: Punto[] = [
      { x: 104, y: 150 },
      { x: 316, y: 150 },
    ]
    workers.forEach((w, i) => (mapa[w.id] = linea[i] ?? { x: 210, y: 150 }))
  }
  return mapa
}

function haciaPunto(desde: Punto, hacia: Punto, dist: number): Punto {
  const dx = hacia.x - desde.x
  const dy = hacia.y - desde.y
  const len = Math.hypot(dx, dy) || 1
  return { x: desde.x + (dx / len) * dist, y: desde.y + (dy / len) * dist }
}

function AristaPath({ arista, pos, reverso }: { arista: Arista; pos: Record<string, Punto>; reverso: boolean }) {
  const p1 = pos[arista.desde]
  const p2 = pos[arista.hacia]
  if (!p1 || !p2) return null

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const bend = reverso ? 44 : 26
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  const ctrl = { x: mid.x + nx * bend, y: mid.y + ny * bend }

  const start = haciaPunto(p1, ctrl, R + 4)
  const end = haciaPunto(p2, ctrl, R + 11)

  const label = {
    x: 0.25 * p1.x + 0.5 * ctrl.x + 0.25 * p2.x,
    y: 0.25 * p1.y + 0.5 * ctrl.y + 0.25 * p2.y,
  }
  const texto = recursoCorto(arista.recurso)
  const color = arista.enCiclo ? '#ef4444' : '#fbbf24'

  return (
    <g className={arista.enCiclo ? 'dls-anim-cycle' : undefined}>
      <path
        d={`M ${start.x} ${start.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`}
        fill="none"
        stroke={color}
        strokeWidth={arista.enCiclo ? 3 : 2}
        strokeDasharray={arista.enCiclo ? undefined : '6 5'}
        strokeLinecap="round"
        markerEnd={arista.enCiclo ? 'url(#arrow-red)' : 'url(#arrow-amber)'}
      />
      <g transform={`translate(${label.x} ${label.y})`}>
        <rect
          x={-texto.length * 3.6 - 5}
          y={-9}
          width={texto.length * 7.2 + 10}
          height={18}
          rx={5}
          fill="#18181b"
          opacity={0.9}
        />
        <text textAnchor="middle" dominantBaseline="central" fontSize={11} fontFamily="monospace" fill={color}>
          {texto}
        </text>
      </g>
    </g>
  )
}

function Nodo({ worker, punto, esVictima }: { worker: Worker; punto: Punto; esVictima: boolean }) {
  const cfg = ESTADO_CONFIG[worker.estado]
  const color = esVictima ? '#ef4444' : cfg.hex
  return (
    <g opacity={esVictima ? 0.7 : 1}>
      <circle cx={punto.x} cy={punto.y} r={R} fill="#0c0c0f" stroke={color} strokeWidth={esVictima ? 3 : 2.5} />
      <circle cx={punto.x} cy={punto.y - 11} r={4} fill={color} />
      <text
        x={punto.x}
        y={punto.y + 9}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={600}
        fill="#e4e4e7"
      >
        {nombreCorto(worker.nombre)}
      </text>
    </g>
  )
}

export function WaitForGraph({
  workers,
  aristas,
  deadlock,
}: {
  workers: Worker[]
  aristas: Arista[]
  deadlock?: Deadlock
}) {
  const pos = posiciones(workers)

  return (
    <div className="flex min-h-[260px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card/40">
      <div className="flex min-h-9 items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grafo de espera</h3>
        {deadlock ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/15 px-2 py-0.5 text-xs text-red-200 ring-1 ring-red-500/50">
            <TriangleAlert className="size-3.5 shrink-0 text-red-400" aria-hidden />
            <span>
              Ciclo detectado · víctima <span className="font-semibold">{nombreDeWorker(workers, deadlock.victima)}</span>
            </span>
          </span>
        ) : (
          <span className="text-[0.6875rem] text-muted-foreground">
            {aristas.length === 0 ? 'Nadie espera a nadie' : 'Flecha: quién espera a quién'}
          </span>
        )}
      </div>

      <div className="relative min-h-0 flex-1">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Grafo de espera entre workers"
        >
          <defs>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
            </marker>
            <marker id="arrow-red" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
            </marker>
          </defs>

          {aristas.map((a, i) => {
            const reverso = aristas.some((b) => b.desde === a.hacia && b.hacia === a.desde)
            return <AristaPath key={`${a.desde}-${a.hacia}-${i}`} arista={a} pos={pos} reverso={reverso} />
          })}

          {workers.map((w) => {
            const punto = pos[w.id]
            if (!punto) return null
            return <Nodo key={w.id} worker={w} punto={punto} esVictima={deadlock?.victima === w.id} />
          })}
        </svg>
      </div>
    </div>
  )
}
