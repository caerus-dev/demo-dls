import { TriangleAlert } from 'lucide-react'
import type { Arista, Deadlock, Worker } from '@/lib/dls-demo/types'
import { ESTADO_CONFIG } from './estado-config'
import { nombreCorto, nombreDeWorker, recursoCorto } from './utils'

const VB_W = 420
const VB_H = 340
const R = 34

interface Punto {
  x: number
  y: number
}

function posiciones(workers: Worker[]): Record<string, Punto> {
  const mapa: Record<string, Punto> = {}
  if (workers.length >= 3) {
    const tri: Punto[] = [
      { x: 210, y: 78 },
      { x: 104, y: 268 },
      { x: 316, y: 268 },
    ]
    workers.slice(0, 3).forEach((w, i) => (mapa[w.id] = tri[i]))
  } else {
    const linea: Punto[] = [
      { x: 112, y: 170 },
      { x: 308, y: 170 },
    ]
    workers.forEach((w, i) => (mapa[w.id] = linea[i] ?? { x: 210, y: 170 }))
  }
  return mapa
}

function haciaPunto(desde: Punto, hacia: Punto, dist: number): Punto {
  const dx = hacia.x - desde.x
  const dy = hacia.y - desde.y
  const len = Math.hypot(dx, dy) || 1
  return { x: desde.x + (dx / len) * dist, y: desde.y + (dy / len) * dist }
}

function AristaPath({
  arista,
  pos,
  reverso,
}: {
  arista: Arista
  pos: Record<string, Punto>
  reverso: boolean
}) {
  const p1 = pos[arista.desde]
  const p2 = pos[arista.hacia]
  if (!p1 || !p2) return null

  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const sign = reverso ? (arista.desde < arista.hacia ? 1 : -1) : 1
  const bend = reverso ? 44 : 26
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
  const ctrl = { x: mid.x + nx * bend * sign, y: mid.y + ny * bend * sign }

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
        <rect x={-texto.length * 3.6 - 5} y={-9} width={texto.length * 7.2 + 10} height={18} rx={5} fill="#18181b" opacity={0.9} />
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
  const sinAristas = aristas.length === 0

  return (
    <div className="relative rounded-xl border border-border bg-card/40 p-2">
      {deadlock && (
        <div className="absolute inset-x-2 top-2 z-10 flex items-center gap-2 rounded-lg border border-red-500/60 bg-red-500/15 px-3 py-2 text-sm text-red-200 shadow-lg">
          <TriangleAlert className="size-4 shrink-0 text-red-400" aria-hidden />
          <span className="leading-tight">
            <span className="font-semibold text-red-300">Ciclo detectado por el servidor</span> — víctima:{' '}
            <span className="font-semibold">{nombreDeWorker(workers, deadlock.victima)}</span>
          </span>
        </div>
      )}

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-auto w-full"
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

        {sinAristas && (
          <text x={VB_W / 2} y={VB_H - 18} textAnchor="middle" fontSize={13} fill="#71717a">
            Nadie espera a nadie
          </text>
        )}
      </svg>
    </div>
  )
}
