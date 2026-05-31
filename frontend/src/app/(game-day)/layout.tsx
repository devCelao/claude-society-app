import { NavSidebar } from '@/components/layout/NavSidebar'

export default function GameDayGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <NavSidebar>{children}</NavSidebar>
}
