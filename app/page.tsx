'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Tiempo } from '@/components/dls-demo/Cronometro'
import { DlsDemo } from '@/components/dls-demo/DlsDemo'
import { PanelLlamadas, type LlamadaConId } from '@/components/dls-demo/PanelLlamadas'
import { estadoInicial } from '@/lib/dls-demo/estado-inicial'
import type { EventoStream } from '@/lib/dls-demo/stream'
import type { DemoState, Escenario, Momento, Motor } from '@/lib/dls-demo/types'

const MOTOR_INICIAL: Motor = { conectado: false, verificando: true, endpoint: '' }

function conAviso(s: DemoState, tono: Momento['tono'], titulo: string): DemoState {
  return { ...s, momentos: [...s.momentos, { t: Date.now(), tono, titulo, foco: [] }] }
}

export default function Page() {
  const [state, setState] = useState<DemoState>(() => estadoInicial(2, MOTOR_INICIAL))
  const [llamadas, setLlamadas] = useState<LlamadaConId[]>([])
  const [tiempo, setTiempo] = useState<Tiempo | null>(null)
  const control = useRef<AbortController | null>(null)
  const contador = useRef(0)

  useEffect(() => {
    let vigente = true
    fetch('/api/motor', { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ conectado: boolean; endpoint: string; error?: string }>)
      .then((m) => {
        if (!vigente) return
        setState((s) => {
          const base = { ...s, motor: { conectado: m.conectado, endpoint: m.endpoint } }
          return m.conectado ? base : conAviso(base, 'error', `No se pudo conectar con el motor: ${m.error ?? 'sin detalle'}`)
        })
      })
      .catch(() => {
        if (!vigente) return
        setState((s) =>
          conAviso({ ...s, motor: { conectado: false, endpoint: s.motor.endpoint } }, 'error', 'No se pudo consultar el estado del motor'),
        )
      })
    return () => {
      vigente = false
    }
  }, [])

  const procesar = useCallback((evento: EventoStream) => {
    if (evento.tipo === 'estado') {
      setState(evento.state)
    } else if (evento.tipo === 'llamada') {
      contador.current += 1
      const id = `l${contador.current}`
      setLlamadas((prev) => [{ ...evento.llamada, id }, ...prev].slice(0, 80))
    } else if (evento.tipo === 'error') {
      setState((prev) => conAviso({ ...prev, enCurso: false }, 'error', evento.mensaje))
    } else {
      setState((prev) => ({ ...prev, enCurso: false }))
    }
  }, [])

  const correr = useCallback(
    async (escenario: Escenario, nodos: 2 | 3) => {
      control.current?.abort()
      const ac = new AbortController()
      control.current = ac
      setLlamadas([])
      setTiempo({ desde: Date.now() })
      setState((prev) => ({ ...estadoInicial(nodos, prev.motor), escenario, enCurso: true }))

      try {
        const res = await fetch('/api/escenario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ escenario, nodos }),
          signal: ac.signal,
        })

        if (!res.ok || !res.body) {
          const cuerpo = (await res.json().catch(() => null)) as { error?: string } | null
          setState((prev) => conAviso({ ...prev, enCurso: false }, 'error', cuerpo?.error ?? `El servidor respondió ${res.status}`))
          return
        }

        const lector = res.body.getReader()
        const decodificador = new TextDecoder()
        let buffer = ''
        for (;;) {
          const { done, value } = await lector.read()
          if (done) break
          buffer += decodificador.decode(value, { stream: true })
          let corte = buffer.indexOf('\n')
          while (corte >= 0) {
            const linea = buffer.slice(0, corte).trim()
            buffer = buffer.slice(corte + 1)
            if (linea) procesar(JSON.parse(linea) as EventoStream)
            corte = buffer.indexOf('\n')
          }
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
        setState((prev) =>
          conAviso({ ...prev, enCurso: false }, 'error', `Se cortó la conexión con el servidor: ${(error as Error).message}`),
        )
      } finally {
        if (control.current === ac) {
          control.current = null
          setTiempo((t) => (t && t.hasta === undefined ? { ...t, hasta: Date.now() } : t))
          setState((prev) => (prev.enCurso ? { ...prev, enCurso: false } : prev))
        }
      }
    },
    [procesar],
  )

  const inicio = state.momentos[0]?.t

  return (
    <DlsDemo
      state={state}
      tiempo={tiempo}
      cantidadLlamadas={llamadas.length}
      panelLlamadas={<PanelLlamadas llamadas={llamadas} workers={state.workers} inicio={inicio} />}
      callbacks={{
        onEscenario: (escenario) => {
          if (!state.enCurso) void correr(escenario, state.nodos)
        },
        onNodos: (nodos) => {
          if (state.enCurso) return
          setLlamadas([])
          setTiempo(null)
          setState((s) => estadoInicial(nodos, s.motor))
        },
        onReiniciar: () => {
          control.current?.abort()
          control.current = null
          setLlamadas([])
          setTiempo(null)
          setState((s) => estadoInicial(s.nodos, s.motor))
        },
      }}
    />
  )
}
