import { NavSidebar } from '@/components/layout/NavSidebar'

export default function JogadoresGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <NavSidebar>{children}</NavSidebar>
}
