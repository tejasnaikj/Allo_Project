import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // Create warehouses
    const mumbai = await prisma.warehouse.create({
        data: { name: 'Mumbai Warehouse', location: 'Mumbai, India' },
    })

    const delhi = await prisma.warehouse.create({
        data: { name: 'Delhi Warehouse', location: 'Delhi, India' },
    })

    // Create products
    const iphone = await prisma.product.create({
        data: { name: 'iPhone 15', description: 'Apple iPhone 15 128GB', price: 79999 },
    })

    const macbook = await prisma.product.create({
        data: { name: 'MacBook Air M2', description: 'Apple MacBook Air M2 8GB 256GB', price: 114900 },
    })

    const airpods = await prisma.product.create({
        data: { name: 'AirPods Pro', description: 'Apple AirPods Pro 2nd Gen', price: 24900 },
    })

    // Create inventory
    await prisma.inventory.createMany({
        data: [
            { productId: iphone.id, warehouseId: mumbai.id, totalUnits: 10 },
            { productId: iphone.id, warehouseId: delhi.id, totalUnits: 5 },
            { productId: macbook.id, warehouseId: mumbai.id, totalUnits: 4 },
            { productId: macbook.id, warehouseId: delhi.id, totalUnits: 2 },
            { productId: airpods.id, warehouseId: mumbai.id, totalUnits: 20 },
            { productId: airpods.id, warehouseId: delhi.id, totalUnits: 8 },
        ],
    })

    console.log('Seeded successfully')
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())