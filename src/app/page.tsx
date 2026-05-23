'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <p className="text-muted-foreground">Loading products...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Allo Store</h1>
      <p className="text-muted-foreground mb-8">Select a product to reserve</p>

      <div className="flex flex-col gap-6">
        {products.map((product) => (
          <Card key={product.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{product.name}</CardTitle>
                <span className="text-lg font-semibold">₹{product.price.toLocaleString()}</span>
              </div>
              <p className="text-sm text-muted-foreground">{product.description}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {product.stock.map((s) => (
                  <div key={s.warehouseId} className="flex items-center justify-between border rounded-lg p-3">
                    <div>
                      <p className="font-medium">{s.warehouseName}</p>
                      <p className="text-sm text-muted-foreground">{s.location}</p>
                      <Badge variant={s.available > 0 ? 'default' : 'destructive'} className="mt-1">
                        {s.available > 0 ? `${s.available} available` : 'Out of stock'}
                      </Badge>
                    </div>
                    <Button
                      disabled={s.available === 0 || reserving === `${product.id}-${s.warehouseId}`}
                      onClick={() => handleReserve(product.id, s.warehouseId)}
                    >
                      {reserving === `${product.id}-${s.warehouseId}` ? 'Reserving...' : 'Reserve'}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  )
}