import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
    productId: z.string(),
    warehouseId: z.string(),
    units: z.number().int().positive(),
})

type InventoryRow = {
    id: string
    totalUnits: number
    reservedUnits: number
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { productId, warehouseId, units } = schema.parse(body)

        const reservation = await db.$transaction(async (tx) => {
            const inventory = await tx.$queryRaw`
        SELECT id, "totalUnits", "reservedUnits"
        FROM "Inventory"
        WHERE "productId" = ${productId}
        AND "warehouseId" = ${warehouseId}
        FOR UPDATE
      ` as InventoryRow[]

            if (!inventory.length) {
                throw new Error('INVENTORY_NOT_FOUND')
            }

            const inv = inventory[0]
            const available = inv.totalUnits - inv.reservedUnits

            if (available < units) {
                throw new Error('INSUFFICIENT_STOCK')
            }

            await tx.$executeRaw`
        UPDATE "Inventory"
        SET "reservedUnits" = "reservedUnits" + ${units}
        WHERE id = ${inv.id}
      `

            const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

            const newReservation = await tx.reservation.create({
                data: {
                    productId,
                    warehouseId,
                    units,
                    status: 'pending',
                    expiresAt,
                },
            })

            return newReservation
        })

        return NextResponse.json(reservation, { status: 201 })
    } catch (err: any) {
        if (err?.message === 'INSUFFICIENT_STOCK') {
            return NextResponse.json({ error: 'Not enough stock available' }, { status: 409 })
        }
        if (err?.message === 'INVENTORY_NOT_FOUND') {
            return NextResponse.json({ error: 'Inventory not found' }, { status: 404 })
        }
        if (err?.name === 'ZodError') {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
        }
        console.error(err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}