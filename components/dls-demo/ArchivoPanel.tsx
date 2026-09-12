'use client'

import { useEffect, useRef } from 'react'
import { Eye, FileText, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Archivo, Worker } from '@/lib/dls-demo/types'
import { nombreCorto, nombreDeWorker } from './utils'

const COLOR: Record<string, string> = {
  w1: 'bg-sky-500/15 text-sky-200',
  w2: 'bg-violet-500/15 text-violet-200',
  w3: 'bg-pink-500/15 text-pink-200',
}

export function ArchivoPanel({ archivo, workers }: { archivo: Archivo; workers: Worker[] }) {
  const lista = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const el = lista.current
    if (el) el.scrollTop = el.scrollHeight
  }, [archivo.lineas.length])

  const nombre = (id: string) => nombreCorto(nombreDeWorker(workers, id))

  return (
    <div className="mt-2 flex min-h-[5.5rem] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card/40">
      <div className="flex min-h-9 items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <FileText className="size-3.5" aria-hidden />
          Contenido del reporte
        </h3>
        {archivo.ultimoToken !== undefined ? (
          <span className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-emerald-300">
            <ShieldCheck className="size-3.5" aria-hidden />
            acepta token ≥ #{archivo.ultimoToken}
          </span>
        ) : (
          <span className="text-[0.6875rem] text-muted-foreground">valida el fencing token</span>
        )}
      </div>

      {archivo.lectores.length > 0 && (
        <div className="flex items-center gap-1.5 border-b border-border bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
          <Eye className="size-3.5" aria-hidden />
          Leyendo ahora: {archivo.lectores.map(nombre).join(', ')}
        </div>
      )}

      <ol ref={lista} className="min-h-0 flex-1 overflow-y-auto px-3 py-1.5 font-mono text-xs leading-relaxed">
        {archivo.lineas.length === 0 ? (
          <li className="py-1 font-sans text-muted-foreground">
            Vacío. Quien tome el reporte en EXCLUSIVE escribe acá, línea por línea, con su fencing token.
          </li>
        ) : (
          archivo.lineas.map((l, i) => (
            <li
              key={i}
              className={cn('flex items-center gap-2', i === archivo.lineas.length - 1 && 'dls-anim-entrada')}
            >
              <span className="w-5 shrink-0 text-right text-zinc-600">{i + 1}</span>
              <span className={cn('rounded px-1.5 py-px font-sans font-medium', COLOR[l.worker] ?? 'bg-zinc-700 text-zinc-200')}>
                {nombre(l.worker)}
              </span>
              <span className="min-w-0 truncate text-zinc-200">{l.texto}</span>
              <span className="ml-auto shrink-0 text-zinc-500">#{l.token}</span>
            </li>
          ))
        )}
      </ol>
    </div>
  )
}
