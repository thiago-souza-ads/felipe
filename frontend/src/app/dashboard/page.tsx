'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/api'

interface Document {
  id: string; fileName: string; fileType: string; fileSize: number; status: string; createdAt: string
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    READY: 'bg-green-100 text-green-700', PROCESSING: 'bg-yellow-100 text-yellow-700', ERROR: 'bg-red-100 text-red-700'
  }
  const label: Record<string, string> = { READY: 'Pronto', PROCESSING: 'Processando', ERROR: 'Erro' }
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-700'}`}>{label[status] || status}</span>
}

export default function DashboardPage() {
  const router = useRouter()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function loadDocs() {
    try {
      const { documents } = await api.docs.list()
      setDocs(documents)
    } catch { router.push('/login') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadDocs() }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await api.docs.upload(file)
      await loadDocs()
    } catch (err) {
      alert('Erro no upload: ' + (err instanceof Error ? err.message : 'Erro'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Deletar "${name}"?`)) return
    await api.docs.delete(id)
    setDocs(d => d.filter(doc => doc.id !== id))
  }

  function handleLogout() {
    const rt = localStorage.getItem('refreshToken') || ''
    api.auth.logout(rt).catch(() => {})
    localStorage.clear()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">📄 Felipe</h1>
        <div className="flex gap-3">
          <button onClick={() => router.push('/dashboard/chat')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">💬 Chat com Docs</button>
          <button onClick={handleLogout} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Sair</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Meus Documentos</h2>
          <div>
            <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
              accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.xlsx,.xls" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
              {uploading ? '⏳ Enviando...' : '+ Upload'}
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-12">Carregando...</p>
        ) : docs.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-200">
            <p className="text-4xl mb-3">📁</p>
            <p className="text-gray-600 font-medium">Nenhum documento ainda</p>
            <p className="text-gray-400 text-sm mt-1">Faça upload de PDFs, DOCXs, TXTs e mais</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Tamanho</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-6 py-3" />
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{doc.fileName}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{formatSize(doc.fileSize)}</td>
                    <td className="px-6 py-4"><StatusBadge status={doc.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(doc.createdAt).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => handleDelete(doc.id, doc.fileName)} className="text-red-500 hover:text-red-700 text-sm">Deletar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
