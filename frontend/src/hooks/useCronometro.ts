'use client'

import { useState, useEffect } from 'react'
import { formatarTempo } from '@/lib/utils'

const DURACAO_MS = 7 * 60 * 1000

interface UseCronometroReturn {
  tempoDecorrido: number
  tempoFormatado: string
  esgotado: boolean
  emAndamento: boolean
}

export function useCronometro(inicioEm: Date | null): UseCronometroReturn {
  const [agora, setAgora] = useState(Date.now())

  useEffect(() => {
    if (!inicioEm) return
    const interval = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [inicioEm])

  if (!inicioEm) {
    return { tempoDecorrido: 0, tempoFormatado: '00:00', esgotado: false, emAndamento: false }
  }

  const tempoDecorrido = agora - new Date(inicioEm).getTime()
  return {
    tempoDecorrido,
    tempoFormatado: formatarTempo(Math.min(tempoDecorrido, DURACAO_MS)),
    esgotado: tempoDecorrido >= DURACAO_MS,
    emAndamento: true,
  }
}
