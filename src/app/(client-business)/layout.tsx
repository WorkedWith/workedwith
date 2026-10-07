import { AppHeader } from '@/components/app-header'

export default function GroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  )
}
