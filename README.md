# Allo Inventory

Inventory reservation system for multi-warehouse retail. Prevents overselling by temporarily holding stock during checkout.

## Local Setup

1. Clone the repo and install dependencies:
```bash
git clone https://github.com/tejasnaikj/Allo_Project.git
cd Allo_Project
npm install
```

2. Create a `.env` file:
DATABASE_URL="your-supabase-connection-string"
REDIS_URL="your-upstash-redis-url"

3. Run migrations and seed:
```bash
npx prisma migrate dev
npm run seed
```

4. Start the dev server:
```bash
npm run dev
```

## How Expiry Works

Reservations expire after 10 minutes. I use lazy cleanup — on every `GET /api/products` request, expired pending reservations are released and `reservedUnits` is decremented. This means stock becomes available again the next time products are fetched. No background workers or cron jobs needed.

## Concurrency

The `POST /api/reservations` endpoint uses a Postgres `SELECT FOR UPDATE` inside a `db.$transaction` block. This locks the inventory row for the duration of the transaction — if two requests come in simultaneously for the last unit, one waits for the lock and sees 0 available stock, returning a 409.

## Trade-offs

- Lazy expiry means stock isn't freed instantly — only on the next product fetch. A cron job would be more precise but adds infra complexity.
- No idempotency keys implemented — retried requests could create duplicate reservations.
- No auth — any user can confirm or release any reservation by ID.
- Error messages could be more user-friendly on the frontend.