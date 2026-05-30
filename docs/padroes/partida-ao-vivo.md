# Padrao — Partida ao Vivo (Client Component com Polling)

## Quando usar

Use este padrao para a tela de controle da partida em andamento:
cronometro, marcacao de gol, placar em tempo real.

## Dependencias

```bash
npm install swr
```

## Estrutura de arquivos

```
src/
  app/(game-day)/dias-de-jogo/[id]/partidas/[partidaId]/
    page.tsx                   ← Client Component ('use client')
  hooks/
    useCronometro.ts
    usePartidaAoVivo.ts
  components/partidas/
    Cronometro.tsx
    MarcarGolForm.tsx
    ListaGols.tsx
    PartidaStatus.tsx
```

## Hook — usePartidaAoVivo

```typescript
// src/hooks/usePartidaAoVivo.ts
'use client'

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function usePartidaAoVivo(diaId: number, partidaId: number) {
  const { data, error, mutate } = useSWR(
    `/api/dias-de-jogo/${diaId}/partidas/${partidaId}`,
    fetcher,
    { refreshInterval: 5000 }  // polling a cada 5 segundos
  )

  return {
    partida: data,
    isLoading: !data && !error,
    error,
    refresh: mutate,
  }
}
```

## Hook — useCronometro

```typescript
// src/hooks/useCronometro.ts
'use client'

import { useEffect, useState } from 'react'

const DURACAO_MS = 7 * 60 * 1000  // 7 minutos

export function useCronometro(inicioEm: Date | null) {
  const [agora, setAgora] = useState(Date.now())

  useEffect(() => {
    if (!inicioEm) return
    const interval = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [inicioEm])

  if (!inicioEm) {
    return { tempoDecorrido: 0, tempoFormatado: '07:00', esgotado: false, emAndamento: false }
  }

  const decorrido = agora - new Date(inicioEm).getTime()
  const restante = Math.max(0, DURACAO_MS - decorrido)
  const minutos = Math.floor(restante / 60000)
  const segundos = Math.floor((restante % 60000) / 1000)

  return {
    tempoDecorrido: decorrido,
    tempoFormatado: `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`,
    esgotado: decorrido >= DURACAO_MS,
    emAndamento: true,
  }
}
```

## Logica de Fim de Partida

A partida termina quando:
1. `cronometro.esgotado === true` (7 minutos decorridos), OU
2. Algum time atinge 2 gols (calculado a partir de `partida.gols`)

```typescript
// Calculo dos gols por time (client-side)
const golsTimeA = partida.gols.filter(g => g.timeId === partida.timeAId).length
const golsTimeB = partida.gols.filter(g => g.timeId === partida.timeBId).length
const alguemComDoisGols = golsTimeA >= 2 || golsTimeB >= 2

const deveEncerrar = cronometro.esgotado || alguemComDoisGols
```

## Marcacao de Gol — Otimista

```typescript
async function marcarGol(jogadorId: number, timeId: number, assistenciaId?: number) {
  const res = await fetch(`/api/dias-de-jogo/${diaId}/partidas/${partidaId}/gols`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jogadorId, timeId, assistenciaId }),
  })

  if (res.ok) {
    refresh()  // dispara revalidacao do SWR
  } else {
    toast.error('Erro ao registrar gol')
  }
}
```

## Finalizar Partida

```typescript
async function finalizarPartida(vencedorId: number | null) {
  const res = await fetch(`/api/dias-de-jogo/${diaId}/partidas/${partidaId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'FINALIZADA',
      vencedorId,          // null = empate
      fimEm: new Date().toISOString(),
    }),
  })

  if (res.ok) {
    router.push(`/dias-de-jogo/${diaId}`)
  }
}
```

## Regras

1. NUNCA confiar no cronometro do cliente como fonte de verdade — sempre usar `inicio_em` do banco.
2. Desabilitar marcacao de gol quando `deveEncerrar === true`.
3. Exibir confirmacao antes de finalizar partida.
4. Polling a cada 5s — suficiente para o caso de uso (nao e tempo real multiplos dispositivos).
5. Ao remover gol (edicao), sempre chamar `refresh()` do SWR para recarregar.
