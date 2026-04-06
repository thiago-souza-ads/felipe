'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const token = localStorage.getItem('accessToken')
    router.push(token ? '/dashboard' : '/login')
  }, [router])
  return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Carregando...</p></div>
}
