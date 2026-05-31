import { NavSidebar } from '@/components/layout/NavSidebar'

export default function CiclosGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <NavSidebar>{children}</NavSidebar>
}
