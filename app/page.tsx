'use client'

import { useMemo, useState } from 'react'
import { DlsDemo } from '@/components/dls-demo/DlsDemo'
import {
  MOCK_STATES,
  deadlockDetectado,
  enCola,
  inicial,
  lecturaCompartida,
  victimaAbortada,
  victimaTresNodos,
  zombieRechazado,
} from '@/lib/dls-demo/mock-states'
import type { DemoState, Escenario } from '@/lib/dls-demo/types'

void MOCK_STATES

const SECUENCIAS: Record<string, DemoState[]> = {
  shared_read: [lecturaCompartida],
  tarea_simple: [enCola],
  deadlock2: [enCola, deadlockDetectado, victimaAbortada],
  deadlock3: [victimaTresNodos],
  zombie: [zombieRechazado],
}

const SDK_SNIPPETS: Record<Escenario, string> = {
  shared_read: `const tx = await dls.begin({ ttlMs: 30_000 })
await tx.acquire("file:reports_export", { mode: "SHARED_READ" })
// otro worker puede leer en paralelo
const data = await readReport()
await tx.commit()`,
  tarea_simple: `const tx = await dls.begin({ ttlMs: 30_000 })
await tx.acquire("file:reports_export", { mode: "EXCLUSIVE" })
// si otro lo tiene, esta llamada queda en cola
await rewriteReport(data)
await tx.commit()`,
  deadlock: `const tx = await dls.begin({ ttlMs: 30_000 })
await tx.acquire("file:reports_export", { mode: "EXCLUSIVE" })
// Beta ya tiene network y pide file -> ciclo
await tx.acquire("network:cloud_uploader", { mode: "EXCLUSIVE" })
// el servidor aborta a la víctima: throws DeadlockAborted`,
  zombie: `const tx = await dls.begin({ ttlMs: 30_000 })
const { fencingToken } = await tx.acquire("file:reports_export")
// el proceso se congela; el TTL expira y otro toma el lock
await storage.write(data, { fencingToken })
// rechazado: token #103 < último aceptado #105`,
}

export default function Page() {
  const [escenario, setEscenario] = useState<Escenario | null>(null)
  const [modo, setModo] = useState<'auto' | 'paso'>('auto')
  const [nodos, setNodos] = useState<2 | 3>(2)
  const [paso, setPaso] = useState(0)

  const secuencia = useMemo<DemoState[]>(() => {
    if (!escenario) return [inicial]
    if (escenario === 'deadlock') return nodos === 3 ? SECUENCIAS.deadlock3 : SECUENCIAS.deadlock2
    return SECUENCIAS[escenario]
  }, [escenario, nodos])

  const pasos = secuencia.length
  // En automático nos detenemos en el momento más informativo: si la secuencia
  // contiene un deadlock, mostramos el ciclo; si no, el estado final.
  const indiceAuto = useMemo(() => {
    const conCiclo = secuencia.findIndex((s) => s.deadlock)
    return conCiclo >= 0 ? conCiclo : pasos - 1
  }, [secuencia, pasos])
  const indice = modo === 'auto' ? indiceAuto : Math.min(paso, pasos - 1)
  const esperandoSiguientePaso = modo === 'paso' && escenario != null && paso < pasos - 1
  const enCurso = esperandoSiguientePaso

  const state: DemoState = useMemo(() => {
    const base = secuencia[indice]
    return {
      ...base,
      escenario,
      modo,
      nodos,
      enCurso,
      esperandoSiguientePaso,
    }
  }, [secuencia, indice, escenario, modo, nodos, enCurso, esperandoSiguientePaso])

  const panel = escenario ? (
    <pre className="overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300 ring-1 ring-white/10">
      <code>{SDK_SNIPPETS[escenario]}</code>
    </pre>
  ) : (
    <p className="text-sm text-muted-foreground">
      Elegí un escenario abajo para ver las llamadas equivalentes del SDK.
    </p>
  )

  return (
    <DlsDemo
      state={state}
      panelLlamadas={panel}
      callbacks={{
        onEscenario: (e) => {
          setEscenario(e)
          setPaso(0)
        },
        onModo: (m) => setModo(m),
        onNodos: (n) => {
          setNodos(n)
          setPaso(0)
        },
        onSiguientePaso: () => setPaso((p) => p + 1),
        onReiniciar: () => {
          setEscenario(null)
          setPaso(0)
        },
      }}
    />
  )
}
