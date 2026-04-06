import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Felipe — Gestão Documental',
  description: 'Sistema de gestão de documentos com busca por linguagem natural'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  )
}
