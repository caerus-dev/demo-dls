'use client'

import { useEffect, useState } from 'react'

export interface Tiempo {
  desde: number
  hasta?: number
}

export function Cronometro({ tiempo }: { tiempo: Tiempo }) {
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    if (tiempo.hasta !== undefined) return
    const id = setInterval(() => setAhora(Date.now()), 100)
    return () => clearInterval(id)
  }, [tiempo.hasta])

  const fin = tiempo.hasta ?? ahora
  return (
    <span className="font-mono text-xs tabular-nums text-muted-foreground">
      {(Math.max(0, fin - tiempo.desde) / 1000).toFixed(1)} s
    </span>
  )
}
