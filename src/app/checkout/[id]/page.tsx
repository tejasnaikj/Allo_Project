'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
        async function fetchReservation() {
            const res = await fetch(`/api/reservations/${id}`)
            if (res.ok) {
                const data = await res.json()
                setReservation(data)

                const productsRes = await fetch('/api/products')
                const products: Product[] = await productsRes.json()
                const p = Array.isArray(products) ? products.find((p) => p.id === data.productId) : null
                if (p) setProduct(p)
            }
            setLoading(false)
        }
        fetchReservation()
    }, [id])

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

    const expired = timeLeft === 0 && reservation?.status === 'pending'
    const confirmed = reservation?.status === 'confirmed'
    const released = reservation?.status === 'released'

    if (loading) {
        return (
            <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <p className="text-zinc-500 text-sm animate-pulse">Loading reservation...</p>
            </main>
        )
    }

    if (!reservation) {
        return (
            <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-400 mb-4">Reservation not found.</p>
                    <Button variant="outline" onClick={() => router.push('/')}>Back to store</Button>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <div className="border-b border-zinc-800 px-6 py-4">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <button onClick={() => router.push('/')} className="text-zinc-500 hover:text-white text-sm transition-colors">
                        ← Back
                    </button>
                    <h1 className="text-sm font-medium text-zinc-400">Checkout</h1>
                    <div className="w-12" />
                </div>
            </div>

            <div className="max-w-lg mx-auto px-6 py-10">
                {/* Product info */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold">{product?.name ?? 'Product'}</h2>
                    <p className="text-zinc-500 text-sm mt-1">{product?.description}</p>
                </div>

                {/* Main card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />

                    <div className="p-6">
                        {/* Status */}
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-sm text-zinc-400">Status</span>
                            <Badge
                                className={
                                    confirmed ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                        released || expired ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                            'bg-violet-500/20 text-violet-400 border-violet-500/30'
                                }
                                variant="outline"
                            >
                                {confirmed ? 'Confirmed' : released ? 'Cancelled' : expired ? 'Expired' : 'Reserved'}
                            </Badge>
                        </div>

                        {/* Details */}
                        <div className="flex flex-col gap-3 mb-6">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Units</span>
                                <span className="text-white">{reservation.units}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Price</span>
                                <span className="text-white font-semibold">₹{product?.price.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-500">Reservation ID</span>
                                <span className="text-zinc-400 font-mono text-xs">{reservation.id.slice(0, 16)}...</span>
                            </div>
                        </div>

                        {/* Timer */}
                        {reservation.status === 'pending' && !expired && (
                            <div className="bg-zinc-800/60 rounded-lg p-4 mb-6 text-center">
                                <p className="text-xs text-zinc-500 mb-1">Time remaining</p>
                                <p className={`text-4xl font-mono font-bold tracking-widest ${timeLeft < 60000 ? 'text-red-400' : 'text-white'}`}>
                                    {formatTime(timeLeft)}
                                </p>
                                <p className="text-xs text-zinc-600 mt-1">Hold expires after 10 minutes</p>
                            </div>
                        )}

                        {expired && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 text-center">
                                <p className="text-red-400 font-medium">Your reservation has expired</p>
                                <p className="text-xs text-zinc-500 mt-1">The item has been released back to stock</p>
                            </div>
                        )}

                        {confirmed && (
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 mb-6 text-center">
                                <p className="text-emerald-400 font-medium">Order confirmed!</p>
                                <p className="text-xs text-zinc-500 mt-1">Your purchase was successful</p>
                            </div>
                        )}

                        {released && (
                            <div className="bg-zinc-800/60 rounded-lg p-4 mb-6 text-center">
                                <p className="text-zinc-400 font-medium">Reservation cancelled</p>
                            </div>
                        )}

                        {/* Actions */}
                        {reservation.status === 'pending' && !expired && (
                            <div className="flex gap-3">
                                <Button
                                    className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
                                    onClick={handleConfirm}
                                    disabled={acting}
                                >
                                    {acting ? 'Processing...' : 'Confirm Purchase'}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 border-zinc-700 text-zinc-900 bg-white hover:bg-zinc-100"
                                    onClick={handleCancel}
                                    disabled={acting}
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}

                        {(confirmed || released || expired) && (
                            <Button
                                variant="outline"
                                className="w-full border-zinc-700 text-zinc-900 bg-white hover:bg-zinc-100"
                                onClick={() => router.push('/')}
                            >
                                Back to store
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </main>
    )
}