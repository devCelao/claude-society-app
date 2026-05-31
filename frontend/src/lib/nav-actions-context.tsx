'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

type NavActionsCtx = {
  actions: ReactNode
  setActions: (a: ReactNode) => void
}

const NavActionsContext = createContext<NavActionsCtx>({
  actions: null,
  setActions: () => {},
})

export function NavActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<ReactNode>(null)
  const setActions = useCallback((a: ReactNode) => setActionsState(a), [])
  return (
    <NavActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </NavActionsContext.Provider>
  )
}

export function useNavActions() {
  return useContext(NavActionsContext)
}
