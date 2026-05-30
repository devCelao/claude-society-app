'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function usePartidaAoVivo(diaId: string, partidaId: string) {
  return useSWR(
    `/api/dias-de-jogo/${diaId}/partidas/${partidaId}`,
    fetcher,
    { refreshInterval: 5000 }
  )
}
