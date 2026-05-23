'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type Reservation = {
    id: string
    productId: string
    warehouseId: string
    units: number
    status: string
    expiresAt: string
}

type Product = {
    id: string
    name: string
    price: number
    description: string
}

export default function CheckoutPage() {
    const { id } = useParams()
    const router = useRouter()

    const [reservation, setReservation] = useState<Reservation | null>(null)
    const [product, setProduct] = useState<Product | null>(null)
    const [timeLeft, setTimeLeft] = useState<number>(0)
    const [loading, setLoading] = useState(true)
    const [acting, setActing] = useState(false)

    useEffect(() => {
        async function load() {
            const res = await fetch('/api/products')
            const products: Product[] = await res.json()

            // Get reservation from localStorage
            const stored = localStorage.getItem(`reservation-${id}`)
            if (stored) {
                const r = JSON.parse(stored)
                setReservation(r)
                const p = products.find((p) => p.id === r.productId)
                if (p) setProduct(p)
            }
            setLoading(false)
        }
        load()
    }, [id])

    // Store reservation in localStorage when redirected here
    useEffect(() => {
        async function fetchReservation() {
            const res = await fetch(`/api/reservations/${id}`)
            if (res.ok) {
                const data = await res.json()
                localStorage.setItem(`reservation-${id}`, JSON.stringify(data))
                setReservation(data)
            }
        }
        fetchReservation()
    }, [id])

    // Countdown timer
    useEffect(() => {
        if (!reservation) return
        const interval = setInterval(() => {
            const left = Math.max(0, new Date(reservation.expiresAt).getTime() - Date.now())
            setTimeLeft(left)
        }, 1000)
        return () => clearInterval(interval)
    }, [reservation])

    async function handleConfirm() {
        setActing(true)
        try {
            const res = await fetch(`/api/reservations/${id}/confirm`, { method: 'POST' })
            const data = await res.json()

            if (res.status === 410) {
                toast.error('Reservation has expired')
                setReservation((r) => r ? { ...r, status: 'released' } : r)
                return
            }

            if (!res.ok) {
                toast.error(data.error || 'Something went wrong')
                return
            }

            setReservation(data)
            toast.success('Order confirmed!')
        } catch {
            toast.error('Something went wrong')
        } finally {
            setActing(false)
        }
    }

    async function handleCancel() {
        setActing(true)
        try {
            const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' })
            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Something went wrong')
                return
            }

            setReservation(data)
            toast.success('Reservation cancelled')
            setTimeout(() => router.push('/'), 1500)
        } catch {
            toast.error('Something went wrong')
        } finally {
            setActing(false)
        }
    }

    function formatTime(ms: number) {
        const total = Math.floor(ms / 1000)
        const mins = Math.floor(total / 60).toString().padStart(2, '0')
        const secs = (total % 60).toString().padStart(2, '0')
        return `${mins}:${secs}`
    }

    if (loading) {
        return (
            <main className="min-h-screen p-8">
                <p className="text-muted-foreground">Loading reservation...</p>
            </main>
        )
    }

    if (!reservation) {
        return (
            <main className="min-h-screen p-8">
                <p className="text-red-500">Reservation not found.</p>
                <Button className="mt-4" onClick={() => router.push('/')}>Back to store</Button>
            </main>
        )
    }

    const expired = timeLeft === 0 && reservation.status === 'pending'
    const confirmed = reservation.status === 'confirmed'
    const released = reservation.status === 'released'

    return (
        <main className="min-h-screen p-8 max-w-lg mx-auto">
            <h1 className="text-3xl font-bold mb-8">Checkout</h1>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle>{product?.name ?? 'Product'}</CardTitle>
                        <Badge
                            variant={
                                confirmed ? 'default' :
                                    released || expired ? 'destructive' : 'secondary'
                            }
                        >
                            {confirmed ? 'Confirmed' : released ? 'Cancelled' : expired ? 'Expired' : 'Pending'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Units</span>
                        <span>{reservation.units}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Price</span>
                        <span>₹{product?.price.toLocaleString()}</span>
                    </div>

                    {reservation.status === 'pending' && !expired && (
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-1">Expires in</p>
                            <p className={`text-4xl font-mono font-bold ${timeLeft < 60000 ? 'text-red-500' : ''}`}>
                                {formatTime(timeLeft)}
                            </p>
                        </div>
                    )}

                    {expired && (
                        <p className="text-red-500 text-center font-medium">Your reservation has expired.</p>
                    )}

                    {confirmed && (
                        <p className="text-green-600 text-center font-medium">Your order has been confirmed!</p>
                    )}

                    {released && (
                        <p className="text-muted-foreground text-center">Reservation was cancelled.</p>
                    )}

                    {reservation.status === 'pending' && !expired && (
                        <div className="flex gap-3 mt-2">
                            <Button className="flex-1" onClick={handleConfirm} disabled={acting}>
                                {acting ? 'Processing...' : 'Confirm Purchase'}
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={handleCancel} disabled={acting}>
                                Cancel
                            </Button>
                        </div>
                    )}

                    {(confirmed || released || expired) && (
                        <Button variant="outline" onClick={() => router.push('/')}>
                            Back to store
                        </Button>
                    )}
                </CardContent>
            </Card>
        </main>
    )
}