'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Stock = {
  warehouseId: string
  warehouseName: string
  location: string
  available: number
  reserved: number
}

type Product = {
  id: string
  name: string
  description: string
  price: number
  stock: Stock[]
}

export default function Home() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [reserving, setReserving] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  async function handleReserve(productId: string, warehouseId: string) {
    setReserving(`${productId}-${warehouseId}`)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, warehouseId, units: 1 }),
      })

      const data = await res.json()

      if (res.status === 409) {
        toast.error('Not enough stock available')
        return
      }

      if (!res.ok) {
        toast.error('Something went wrong')
        return
      }

      router.push(`/checkout/${data.id}`)
    } catch {
      toast.error('Something went wrong')
    } finally {
      setReserving(null)
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Allo Store</h1>
            <p className="text-xs text-zinc-500">Multi-warehouse inventory</p>
          </div>
          <Badge variant="outline" className="text-zinc-400 border-zinc-700">
            {products.length} products
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-zinc-500 text-sm animate-pulse">Loading products...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product) => (
              <Card key={product.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                {/* Product color bar */}
                <div className="h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
                <CardContent className="p-5">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-white">{product.name}</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">{product.description}</p>
                    <p className="text-lg font-bold text-white mt-2">
                      ₹{product.price.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    {product.stock.map((s) => (
                      <div
                        key={s.warehouseId}
                        className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-3 py-2.5"
                      >
                        <div>
                          <p className="text-xs font-medium text-zinc-300">{s.warehouseName}</p>
                          <p className="text-xs text-zinc-500">{s.location}</p>
                          <p className={`text-xs font-semibold mt-0.5 ${s.available > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {s.available > 0 ? `${s.available} in stock` : 'Out of stock'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          disabled={s.available === 0 || reserving === `${product.id}-${s.warehouseId}`}
                          onClick={() => handleReserve(product.id, s.warehouseId)}
                          className="bg-violet-600 hover:bg-violet-500 text-white text-xs px-3 disabled:opacity-40"
                        >
                          {reserving === `${product.id}-${s.warehouseId}` ? 'Holding...' : 'Reserve'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}