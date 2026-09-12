import { endpointMotor } from '@/lib/caerus/dls'
import { correrEscenario } from '@/lib/dls-demo/escenarios'
import { ESCENARIOS_DISPONIBLES, type EscenarioDisponible, type EventoStream } from '@/lib/dls-demo/stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

function esDisponible(valor: unknown): valor is EscenarioDisponible {
  return typeof valor === 'string' && (ESCENARIOS_DISPONIBLES as readonly string[]).includes(valor)
}

export async function POST(req: Request) {
  const cuerpo = (await req.json().catch(() => null)) as { escenario?: unknown; nodos?: unknown } | null
  const escenario = cuerpo?.escenario
  const nodos: 2 | 3 = cuerpo?.nodos === 3 ? 3 : 2

  if (!esDisponible(escenario)) {
    return Response.json({ error: 'Ese escenario no está disponible' }, { status: 400 })
  }

  const codificador = new TextEncoder()
  let cerrado = false

  const flujo = new ReadableStream<Uint8Array>({
    async start(controlador) {
      const enviar = (evento: EventoStream) => {
        if (cerrado) return
        try {
          controlador.enqueue(codificador.encode(`${JSON.stringify(evento)}\n`))
        } catch {
          cerrado = true
        }
      }

      try {
        await correrEscenario(escenario, nodos, { conectado: true, endpoint: endpointMotor() }, enviar)
        enviar({ tipo: 'fin' })
      } catch (error) {
        enviar({ tipo: 'error', mensaje: error instanceof Error ? error.message : String(error) })
      } finally {
        if (!cerrado) {
          cerrado = true
          controlador.close()
        }
      }
    },
    cancel() {
      cerrado = true
    },
  })

  return new Response(flujo, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  })
}
