# GUZO (ENGIDA) — Guest Module

An Ethiopian accommodation & tourism marketplace (Airbnb-style), localized for Ethiopia and
priced in Ethiopian Birr (ETB). This repository contains **only the Guest Module** — discovery,
booking, payment, trips, messaging, profile, and notifications. Authentication (Register/Login)
is intentionally **not included**; it's owned by another team, and the whole app assumes an
already-authenticated guest, mocked here as `userId = 1`.

---

## 1. Tech Stack

| Layer        | Technology                                   |
|--------------|-----------------------------------------------|
| Frontend     | React + Vite + TypeScript, Tailwind CSS       |
| Backend      | Node.js + Express (TypeScript)                |
| Database     | PostgreSQL                                    |
| ORM          | Prisma                                        |
| Auth         | Mocked (assumes JWT exists — `userId = 1`)    |
| Maps         | Placeholder calendar/availability UI          |

---

## 2. Project Structure

```
guzo-engida/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # All 12 data models
│   │   └── seed.ts           # Seed script (users, properties, bookings, etc.)
│   ├── src/
│   │   ├── index.ts          # Express app entry point
│   │   ├── lib/prisma.ts     # Shared Prisma client
│   │   ├── middleware/mockAuth.ts
│   │   └── routes/
│   │       ├── properties.routes.ts
│   │       ├── bookings.routes.ts
│   │       ├── payments.routes.ts
│   │       ├── reviews.routes.ts
│   │       ├── messages.routes.ts
│   │       ├── profile.routes.ts
│   │       ├── notifications.routes.ts
│   │       └── favorites.routes.ts
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/             # Home, Search, PropertyDetails, Booking, Payment,
│   │   │                      # MyTrips, Messages, Profile, Notifications
│   │   ├── components/
│   │   │   ├── layout/         # Navbar, Footer
│   │   │   ├── ui/             # Button, Card, Badge, Input (shadcn-style primitives)
│   │   │   └── PropertyCard.tsx
│   │   ├── lib/api.ts          # Fetch wrapper for the backend REST API
│   │   ├── types/index.ts      # Shared TypeScript types
│   │   ├── App.tsx             # Routes
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.ts          # Proxies /api → backend on :4000
│   └── package.json
│
└── README.md
```

---

## 3. Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ running locally (or a connection string to a hosted instance, e.g. Supabase, Neon, Railway)

---

## 4. Backend Setup

```bash
cd backend
npm install
```

### 4.1 Configure the database

Copy the example environment file and set your PostgreSQL connection string:

```bash
cp .env.example .env
```

Edit `.env`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/guzo_engida?schema=public"
PORT=4000
MOCK_GUEST_ID=1
```

If you don't have a `guzo_engida` database yet, create one:

```bash
# using psql
psql -U postgres -c "CREATE DATABASE guzo_engida;"
```

### 4.2 Run migrations and generate the Prisma client

```bash
npx prisma migrate dev --name init
npx prisma generate
```

This creates all 12 tables (User, Property, PropertyImage, Amenity, PropertyAmenity,
Availability, Booking, Payment, Review, Message, Notification, Favorite).

### 4.3 Seed the database

```bash
npm run seed
```

This populates:
- 10 guest users + 3 host users (mock guest = `userId 1`)
- 15 properties across Addis Ababa, Bahir Dar, Hawassa, Lalibela, and Gondar (with images, amenities, ratings, prices)
- ~50 availability records
- 8 bookings (mix of Confirmed / Completed / Cancelled / Pending)
- ~20 messages between guests and hosts
- 12 reviews
- Starter notifications for the mock guest

### 4.4 Start the API server

```bash
npm run dev
```

The API runs at **http://localhost:4000**. Check it's alive:

```bash
curl http://localhost:4000/api/health
# {"status":"ok"}
```

Other useful commands:
- `npx prisma studio` — visual database browser
- `npm run build && npm start` — production build

---

## 5. Frontend Setup

Open a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

The app runs at **http://localhost:5173**. Vite's dev server proxies any request to `/api/*`
straight through to the backend on port 4000 (see `vite.config.ts`), so no CORS configuration
is needed in development.

Open http://localhost:5173 in your browser — you'll land on the Home page as the mocked guest
(`userId = 1`), with no login step required.

---

## 6. API Reference

All endpoints are prefixed with `/api`. Guest identity is injected by the `mockAuth`
middleware (`req.userId`), reading from `MOCK_GUEST_ID` in `.env` — swap this middleware out
for real JWT verification once the auth team's work lands.

### Properties
| Method | Endpoint                      | Description                                   |
|--------|--------------------------------|------------------------------------------------|
| GET    | `/properties`                 | List all published properties                  |
| GET    | `/properties/search`          | Filter by `city, guests, minPrice, maxPrice, propertyType, amenities, rating, verifiedOnly, sort` |
| GET    | `/properties/:id`              | Full property details (images, amenities, reviews, availability) |
| GET    | `/properties/:id/reviews`      | Reviews for a property                          |

### Bookings
| Method | Endpoint                      | Description                                   |
|--------|--------------------------------|------------------------------------------------|
| POST   | `/bookings`                    | Create a booking (`propertyId, checkIn, checkOut, guests`) |
| GET    | `/bookings`                    | All bookings for the mocked guest               |
| GET    | `/bookings/:id`                 | Single booking                                  |
| PUT    | `/bookings/:id/cancel`          | Cancel a booking                                |

### Payments
| Method | Endpoint                      | Description                                   |
|--------|--------------------------------|------------------------------------------------|
| POST   | `/payments/initiate`           | Start a (simulated) payment                     |
| POST   | `/payments/verify`             | Simulate provider callback → confirms booking   |
| GET    | `/payments/:id`                 | Payment details                                 |

### Reviews / Messages / Profile / Notifications / Favorites
See `backend/src/routes/*.routes.ts` — each file is short and self-documenting.

---

## 7. Business Rules Implemented

- Only **published** properties are returned by any listing/search endpoint.
- A booking **cannot overlap** another `CONFIRMED` booking for the same property.
- Dates marked `available: false` in the `Availability` table **cannot be booked**.
- `totalPrice = nightlyPrice × nights + serviceFee` (service fee is a fixed ETB 350 in this build).
- A successful payment (`/payments/verify`) flips `Payment.status → SUCCESS` **and**
  `Booking.status → CONFIRMED` in the same transaction-like flow, and fires booking/payment notifications.
- Reviews can only be created for bookings with `status = COMPLETED`, and a booking can only be reviewed once (`Review.bookingId` is unique).
- Messages are always scoped to a `bookingId` (a "conversation" = one booking's message thread).
- All prices are displayed and stored as **ETB**.
- The **Verified** trust badge is shown only when `trustScore >= 80`.
- Favorites are stored per guest via the `Favorite` join table (`guestId + propertyId`).

---

## 8. Design System

| Token       | Value      |
|-------------|------------|
| Primary     | `#0F766E` (Emerald) |
| Accent      | `#D4A017` (Gold)    |
| Background  | `#F8FAFC` (Light Gray) |
| Radius      | Rounded-2xl cards, soft shadows |
| Font        | Inter |

Reusable primitives live in `frontend/src/components/ui/` (`Button`, `Card`, `Badge`, `Input`) —
styled to feel like shadcn/ui components without requiring the shadcn CLI, so the project has
zero extra setup steps. If you'd like to swap in real shadcn/ui components later, run
`npx shadcn-ui@latest init` inside `frontend/` and replace the primitives one at a time; the
Tailwind color tokens (`primary`, `accent`, `surface`) already match the design brief.

---

## 9. Pages Delivered

1. **Home** — hero + search widget, categories, 8 featured properties, recommended destinations
2. **Search** — sidebar filters (location, price, type, amenities, rating, trust), sortable results
3. **Property Details** — gallery, description, amenities, house rules, availability calendar, sticky price card
4. **Booking** — guest info, booking summary, price breakdown, cancellation policy checkbox
5. **Payment** — method selection (Telebirr / Chapa / CBE / Dashen), simulated loading → success screen
6. **My Trips** — Upcoming / Completed / Cancelled tabs, cancel action, leave-review modal
7. **Messages** — conversation list + chat window, scoped to bookings
8. **Profile** — avatar, editable personal info, notification & language/currency preferences
9. **Notifications** — typed notification center with read/unread state

**Register/Login are intentionally not built** — the app assumes the guest is already
authenticated (`userId = 1` everywhere on the backend).

---

## 10. Next Steps (Not in Scope Here)

- Swap `mockAuth` for real JWT verification once the auth team ships it.
- Replace the placeholder availability grid / map with a real calendar and Google Maps.
- Wire up a real payment provider (Telebirr/Chapa APIs) behind the existing `/payments/*` routes — the request/response shapes are already provider-agnostic.
- Add Amharic translations (the `language` field and UI structure are already in place for this).
