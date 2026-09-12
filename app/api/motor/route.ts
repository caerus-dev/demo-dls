import { clienteDemo, endpointMotor, NAMESPACE } from '@/lib/caerus/dls'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const endpoint = endpointMotor()
  try {
    await clienteDemo().getLockStatus(NAMESPACE, 'sonda:motor')
    return Response.json({ conectado: true, endpoint })
  } catch (error) {
    return Response.json({
      conectado: false,
      endpoint,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
