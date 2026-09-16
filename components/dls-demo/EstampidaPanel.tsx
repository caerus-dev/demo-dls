'use client'

import { memo, useEffect, useRef } from 'react'
import { Check, FileText, Lock, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Estampida } from '@/lib/dls-demo/types'

const TONO = {
  ambar: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  teal: 'border-teal-500/40 bg-teal-500/10 text-teal-200',
  verde: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  rojo: 'border-red-500/50 bg-red-500/10 text-red-200',
} as const

function Contador({
  etiqueta,
  valor,
  nota,
  tono,
}: {
  etiqueta: string
  valor: string | number
  nota?: string
  tono: keyof typeof TONO
}) {
  return (
    <div className={cn('rounded-xl border px-3 py-2', TONO[tono])}>
      <p className="text-[0.6875rem] font-semibold uppercase tracking-wide opacity-80">{etiqueta}</p>
      <p className="font-mono text-2xl font-bold tabular-nums leading-tight">{valor}</p>
      {nota && <p className="text-[0.6875rem] opacity-80">{nota}</p>}
    </div>
  )
}

const CASILLA: Record<Estampida['estados'][number], string> = {
  esperando: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  con_lock: 'border-emerald-400 bg-emerald-500/20 text-emerald-100 ring-2 ring-emerald-400 dls-anim-glow',
  terminado: 'border-teal-500/30 bg-teal-500/5 text-teal-300/80',
  fallo: 'border-red-500/60 bg-red-500/15 text-red-200',
}

function Reporte({ lineas, escribiendo }: { lineas: Estampida['lineas']; escribiendo?: number }) {
  const lista = useRef<HTMLOListElement>(null)
  const crecientes = lineas.every((l, k) => k === 0 || l.token > (lineas[k - 1]?.token ?? 0))

  useEffect(() => {
    const el = lista.current
    if (el) el.scrollTop = el.scrollHeight
  }, [lineas.length])

  return (
    <div className="flex min-h-[16rem] flex-col overflow-hidden rounded-xl border border-border bg-card/40 lg:min-h-0">
      <div className="flex min-h-9 items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <FileText className="size-3.5" aria-hidden />
          Reporte de ventas
        </h3>
        {lineas.length > 1 ? (
          <span className={cn('inline-flex items-center gap-1 text-xs', crecientes ? 'text-emerald-300' : 'text-red-300')}>
            {crecientes ? <Check className="size-3.5" aria-hidden /> : <TriangleAlert className="size-3.5" aria-hidden />}
            {crecientes ? 'tokens siempre crecientes' : 'los tokens no crecen'}
          </span>
        ) : (
          <span className="text-[0.6875rem] text-muted-foreground">valida el fencing token</span>
        )}
      </div>
      <ol
        ref={lista}
        className="min-h-0 flex-1 overflow-y-auto bg-zinc-950/60 px-2.5 py-2 font-serif text-[0.84rem] leading-relaxed text-zinc-200"
      >
        {lineas.length === 0 && (
          <li className="px-1 font-sans text-xs text-muted-foreground">
            Vacío. Cada worker escribe acá su renglón mientras tiene el lock, con su fencing token.
          </li>
        )}
        {lineas.map((l, k) => {
          const ultima = k === lineas.length - 1
          const activa = ultima && escribiendo === l.worker
          return (
            <li
              key={`${l.worker}-${l.token}`}
              className={cn('flex items-baseline gap-2 rounded px-1', activa && 'bg-emerald-500/10 text-emerald-50')}
            >
              <span className="w-8 shrink-0 font-mono text-[0.6875rem] text-zinc-500">W{l.worker}</span>
              <span className="min-w-0 flex-1 truncate">
                {l.texto}
                {activa && <span className="dls-cursor" aria-hidden />}
              </span>
              <span className="shrink-0 font-mono text-[0.6875rem] text-zinc-500">#{l.token}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

export const EstampidaPanel = memo(function EstampidaPanel({ estampida }: { estampida: Estampida }) {
  const { total, estados, tokens, lineas, maxALaVez, fallos } = estampida
  const terminados = estados.filter((e) => e === 'terminado').length
  const esperando = estados.filter((e) => e === 'esperando').length
  const conLock = estados.indexOf('con_lock')
  const tokenDe = new Map(tokens.map((x) => [x.worker, x.token]))
  const renglon = conLock >= 0 ? lineas.find((l) => l.worker === conLock + 1) : undefined
  const ultimoEnSoltar = tokens[tokens.length - 1]?.worker

  return (
    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
      <div className="flex min-h-0 flex-col gap-3">
        <div className="grid grid-cols-2 gap-2">
          <Contador etiqueta="Esperando" valor={esperando} tono="ambar" />
          <Contador etiqueta="Terminados" valor={`${terminados}/${total}`} tono="teal" />
          <Contador
            etiqueta="Con el lock a la vez"
            valor={`máx. ${maxALaVez}`}
            nota={maxALaVez <= 1 ? 'nunca dos a la vez' : 'se superpusieron'}
            tono={maxALaVez <= 1 ? 'verde' : 'rojo'}
          />
          <Contador etiqueta="Errores" valor={fallos} tono={fallos === 0 ? 'verde' : 'rojo'} />
        </div>

        <div className="flex min-h-[4rem] items-center gap-3 rounded-xl border border-border bg-card/60 px-3 py-2">
          {conLock >= 0 ? (
            <>
              <span className="dls-anim-glow grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-500/15 font-mono text-xl font-bold text-emerald-100 ring-2 ring-emerald-400">
                {conLock + 1}
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-semibold text-foreground">
                  <Lock className="size-4 text-emerald-300" aria-hidden />
                  Worker {conLock + 1} tiene el lock
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  escribe {renglon ? `“${renglon.texto}”` : 'su renglón'} con el token{' '}
                  <span className="font-mono text-emerald-300">#{tokenDe.get(conLock + 1)}</span>
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {terminados === total
                ? 'Todos escribieron: el reporte quedó libre.'
                : ultimoEnSoltar
                  ? `Worker ${ultimoEnSoltar} soltó el lock: entra el siguiente de la cola.`
                  : 'Los pedidos están llegando al motor.'}
            </p>
          )}
        </div>

        <div className="grid min-h-[12rem] flex-1 auto-rows-fr grid-cols-10 gap-1">
          {estados.map((estado, i) => (
            <div
              key={i}
              title={tokenDe.has(i + 1) ? `Worker ${i + 1} · token #${tokenDe.get(i + 1)}` : `Worker ${i + 1}`}
              className={cn('flex items-center justify-center rounded-md border', CASILLA[estado])}
            >
              <span className="font-mono text-[0.6875rem] font-semibold leading-none">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <Reporte lineas={lineas} escribiendo={conLock >= 0 ? conLock + 1 : undefined} />
    </div>
  )
})
