import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const reservation = await db.reservation.findUnique({ where: { id } })

        if (!reservation) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
        }

        if (reservation.status !== 'pending') {
            return NextResponse.json({ error: 'Reservation is no longer pending' }, { status: 400 })
        }

        await db.$transaction(async (tx) => {
            await tx.reservation.update({ where: { id }, data: { status: 'released' } })
            await tx.inventory.updateMany({
                where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
                data: { reservedUnits: { decrement: reservation.units } },
            })
        })

        const updated = await db.reservation.findUnique({ where: { id } })
        return NextResponse.json(updated)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}