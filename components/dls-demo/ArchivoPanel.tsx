'use client'

import { useEffect, useRef, useState } from 'react'
import { Eye, FileText, PenLine, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Archivo, LineaArchivo, Worker } from '@/lib/dls-demo/types'
import { nombreCorto, nombreDeWorker } from './utils'

const BORDE: Record<string, string> = {
  w1: 'border-sky-400',
  w2: 'border-violet-400',
  w3: 'border-pink-400',
}

const CHIP: Record<string, string> = {
  w1: 'bg-sky-500/15 text-sky-200',
  w2: 'bg-violet-500/15 text-violet-200',
  w3: 'bg-pink-500/15 text-pink-200',
}

interface Bloque {
  worker: string
  token: number
  desde: number
  frases: string[]
}

function agrupar(lineas: LineaArchivo[]): Bloque[] {
  const bloques: Bloque[] = []
  lineas.forEach((l, i) => {
    const ultimo = bloques[bloques.length - 1]
    if (ultimo && ultimo.worker === l.worker && ultimo.token === l.token) {
      ultimo.frases.push(l.texto)
    } else {
      bloques.push({ worker: l.worker, token: l.token, desde: i, frases: [l.texto] })
    }
  })
  return bloques
}

function Tipeo({ texto, animar }: { texto: string; animar: boolean }) {
  const [visibles, setVisibles] = useState(animar ? 0 : texto.length)

  useEffect(() => {
    if (!animar) {
      setVisibles(texto.length)
      return
    }
    setVisibles(0)
    const id = setInterval(() => {
      setVisibles((v) => {
        if (v >= texto.length) {
          clearInterval(id)
          return v
        }
        return v + 2
      })
    }, 20)
    return () => clearInterval(id)
  }, [texto, animar])

  return <>{texto.slice(0, visibles)}</>
}

export function ArchivoPanel({
  archivo,
  workers,
  escribiendo,
  className,
}: {
  archivo: Archivo
  workers: Worker[]
  escribiendo?: string
  className?: string
}) {
  const cuerpo = useRef<HTMLDivElement>(null)
  const bloques = agrupar(archivo.lineas)
  const total = archivo.lineas.length
  const leyendo = archivo.lectores.length > 0

  useEffect(() => {
    const el = cuerpo.current
    if (el) el.scrollTop = el.scrollHeight
  }, [total])

  const nombre = (id: string) => nombreCorto(nombreDeWorker(workers, id))

  return (
    <div
      className={cn(
        'mt-2 flex min-h-[7rem] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card/40',
        className,
      )}
    >
      <div className="flex min-h-9 items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <FileText className="size-3.5" aria-hidden />
          El reporte
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

      {leyendo && (
        <div className="flex items-center gap-1.5 border-b border-border bg-sky-500/10 px-3 py-1 text-xs text-sky-200">
          <Eye className="size-3.5" aria-hidden />
          Leyendo ahora:
          {archivo.lectores.map((l) => (
            <span key={l} className={cn('rounded px-1.5 py-px font-medium', CHIP[l])}>
              {nombre(l)}
            </span>
          ))}
        </div>
      )}

      <div
        ref={cuerpo}
        className="min-h-0 flex-1 overflow-y-auto bg-zinc-950/60 px-3.5 py-2.5 font-serif text-[0.84rem] leading-relaxed text-zinc-200"
      >
        {archivo.previo.length === 0 && total === 0 && (
          <p className="font-sans text-xs text-muted-foreground">
            Documento vacío. Quien tome el reporte en EXCLUSIVE escribe acá su párrafo, con su fencing token.
          </p>
        )}

        {archivo.previo.map((p, i) => (
          <p
            key={`previo-${i}`}
            className={cn(
              'rounded px-1 transition-colors duration-500',
              i === 0 ? 'mb-1 text-[0.95rem] font-semibold text-zinc-50' : 'mb-1',
              leyendo && 'bg-sky-500/10',
            )}
          >
            {p}
          </p>
        ))}

        {bloques.map((b, bi) => {
          const ultimoBloque = bi === bloques.length - 1
          return (
            <div key={`${b.worker}-${b.token}-${b.desde}`} className={cn('mb-2.5 border-l-2 pl-2.5', BORDE[b.worker] ?? 'border-zinc-500')}>
              <div className="mb-0.5 flex items-center gap-1.5 font-sans text-[0.6875rem]">
                <span className={cn('rounded px-1.5 py-px font-medium', CHIP[b.worker] ?? 'bg-zinc-700 text-zinc-200')}>
                  {nombre(b.worker)}
                </span>
                <span className="font-mono text-zinc-500">token #{b.token}</span>
                {ultimoBloque && escribiendo === b.worker && (
                  <span className="inline-flex items-center gap-1 text-zinc-400">
                    <PenLine className="size-3" aria-hidden />
                    escribiendo
                  </span>
                )}
              </div>
              <p>
                {b.frases.map((f, fi) => (
                  <span key={fi}>
                    <Tipeo texto={f} animar={b.desde + fi === total - 1} />{' '}
                  </span>
                ))}
                {ultimoBloque && escribiendo === b.worker && <span className="dls-cursor" aria-hidden />}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
