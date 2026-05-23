import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
    try {
        // Release any expired reservations first (lazy cleanup)
        await db.reservation.updateMany({
            where: {
                status: 'pending',
                expiresAt: { lt: new Date() },
            },
            data: { status: 'released' },
        })

        // Recalculate reservedUnits after cleanup
        const expiredReservations = await db.reservation.findMany({
            where: {
                status: 'released',
                expiresAt: { lt: new Date() },
            },
        })

        for (const r of expiredReservations) {
            await db.inventory.updateMany({
                where: {
                    productId: r.productId,
                    warehouseId: r.warehouseId,
                },
                data: {
                    reservedUnits: { decrement: r.units },
                },
            })
        }

        const products = await db.product.findMany({
            include: {
                inventories: {
                    include: { warehouse: true },
                },
            },
        })

        const result = products.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            stock: p.inventories.map((inv) => ({
                warehouseId: inv.warehouseId,
                warehouseName: inv.warehouse.name,
                location: inv.warehouse.location,
                available: inv.totalUnits - inv.reservedUnits,
                reserved: inv.reservedUnits,
            })),
        }))

        return NextResponse.json(result)
    } catch (err) {
        console.error(err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}