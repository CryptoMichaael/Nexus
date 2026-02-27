import React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  return (
    <div className="flex h-screen flex-col">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-auto p-4 bg-gray-100">{children}</main>
      </div>
    </div>
  )
}
