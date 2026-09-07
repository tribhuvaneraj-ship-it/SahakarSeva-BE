# SahakarSeva — Backend (Node/Express/MongoDB/Socket.IO)

Cooperative Gig Services Platform — backend API powering Customer / Worker / Admin
roles, JWT + Google login, nearby-worker matching, bookings with accept/reject,
live GPS worker tracking over Socket.IO, chat, notifications, reviews and
Razorpay payments.

## 1. Folder structure

```
sahakarseva-backend/
├── server.js                  # entry point (Express + HTTP + Socket.IO)
├── package.json
├── .env.example                # copy to .env and fill in real values
├── config/
│   └── db.js                  # Mongoose connection
├── models/
│   ├── User.js
│   ├── WorkerProfile.js
│   ├── Service.js
│   ├── Booking.js
│   ├── Review.js
│   ├── Payment.js
│   ├── Message.js
│   ├── Notification.js
│   └── Location.js
├── middleware/
│   ├── auth.js                # protect / authorize(role)
│   ├── errorHandler.js
│   └── validate.js
├── controllers/
│   ├── authController.js      # register, login, google, me
│   ├── userController.js      # profile, worker profile, nearby-workers
│   ├── serviceController.js
│   ├── bookingController.js   # create/accept/reject/status
│   ├── reviewController.js
│   ├── paymentController.js   # Razorpay order + verify + cash
│   ├── chatController.js
│   └── notificationController.js
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── serviceRoutes.js
│   ├── bookingRoutes.js
│   ├── reviewRoutes.js
│   ├── paymentRoutes.js
│   ├── chatRoutes.js
│   └── notificationRoutes.js
├── sockets/
│   └── socketHandler.js       # JWT-authed Socket.IO: live tracking, chat, notifications
├── utils/
│   ├── generateToken.js
│   ├── geoUtils.js
│   └── sendResponse.js
└── seed/
    └── seedData.js            # sample services/users/workers/booking
```

Copy every file above into a matching path exactly as named — nothing else is required to boot the API (once `npm install` is run and `.env` is filled in).

## 2. Setup

```bash
cd sahakarseva-backend
npm install
cp .env.example .env
# edit .env: MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_MAPS_API_KEY, RAZORPAY_KEY_ID/SECRET

# make sure MongoDB is running locally, or point MONGO_URI at Atlas

npm run seed        # populate sample services, admin/customer/worker accounts, a booking
npm run dev          # nodemon, http://localhost:5000
```

Sample seeded logins (password `password123`, admin `admin123`):
- Admin: `admin@sahakarseva.com`
- Customer: `customer@sahakarseva.com`
- Workers: `suresh@sahakarseva.com`, `anita@sahakarseva.com`, `vikram@sahakarseva.com`, `priya@sahakarseva.com`, `ramesh@sahakarseva.com`

## 3. Environment variables (.env)

| Var | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` / `JWT_EXPIRE` | Auth token signing |
| `GOOGLE_CLIENT_ID` | Google Identity Services Web Client ID — frontend gets an idToken, backend verifies it in `POST /api/auth/google` |
| `GOOGLE_MAPS_API_KEY` | Used by the **frontend** for Maps JS/Directions/Geocoding (not called from backend) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment order creation + signature verification |
| `CLIENT_URL` | CORS + Socket.IO allowed origin |

## 4. REST API summary

Base URL: `/api`

**Auth**
- `POST /auth/register` `{name,email,password,phone,role}`
- `POST /auth/login` `{email,password}`
- `POST /auth/google` `{idToken, role}`
- `GET /auth/me` (Bearer token)

**Users**
- `PUT /users/me` — update profile / base location
- `GET /users/nearby-workers?serviceId=&lng=&lat=&radiusKm=`
- `GET/PUT /users/worker-profile` — worker's own profile (skills, rate, services)
- `PUT /users/worker-profile/availability` `{isAvailable,isSharingLocation}`

**Services**
- `GET /services?q=&category=`, `GET /services/:id`
- `POST/PUT/DELETE /services` (admin)

**Bookings**
- `POST /bookings` `{serviceId, workerId?, lng, lat, address, description}`
- `GET /bookings` (role-scoped) `?status=`
- `GET /bookings/nearby?lng=&lat=&radiusKm=` (worker job feed of open requests)
- `GET /bookings/:id`
- `PUT /bookings/:id/accept` / `PUT /bookings/:id/reject` (worker)
- `PUT /bookings/:id/status` `{status, reason?}` — on_the_way / arrived / in_progress / completed / cancelled

**Reviews**
- `POST /reviews` `{bookingId, rating, comment}`
- `GET /reviews/worker/:workerId`

**Payments**
- `POST /payments/create-order` `{bookingId}` → Razorpay order
- `POST /payments/verify` `{razorpay_order_id, razorpay_payment_id, razorpay_signature}`
- `POST /payments/cash` `{bookingId, amount}`

**Chat / Notifications**
- `GET /chat/:bookingId`, `POST /chat/:bookingId` (REST fallback; prefer Socket.IO)
- `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all`

## 5. Socket.IO (live tracking, chat, notifications)

Connect with a JWT:
```js
import { io } from 'socket.io-client';
const socket = io(import.meta.env.VITE_API_URL, { auth: { token: jwtToken } });
```

Events:
- `booking:join` / `booking:leave` `{bookingId}` — join the room both parties use for a specific job
- `worker:start_sharing` / `worker:stop_sharing` — worker toggles GPS sharing
- `worker:location_update` `{lng, lat, heading, speed, bookingId?}` — sent every few seconds from the browser's `navigator.geolocation.watchPosition`
- `tracking:worker_location` (received by customer in `booking:<id>` room) — live marker updates
- `customer:watch_nearby` / `tracking:nearby_worker_location` — for a live "workers near me" browse map
- `chat:send` `{bookingId, receiverId, text}` → broadcasts `chat:message`
- `chat:typing` `{bookingId, receiverId, isTyping}`
- `notification:new` — pushed automatically on booking/status events
- `booking:new_request`, `booking:accepted`, `booking:rejected`, `booking:updated`

## 6. Frontend integration notes (Google Maps + GPS)

- Use `navigator.geolocation.getCurrentPosition` / `watchPosition` on the worker's
  device; emit each fix via `worker:location_update` over the socket above.
- Render worker markers on Google Maps JS SDK (`@react-google-maps/api`) using
  `GOOGLE_MAPS_API_KEY`; update marker position on `tracking:worker_location`.
- Nearby-worker search/matching is server-side via MongoDB `2dsphere` geo
  queries (`GET /users/nearby-workers`), so the frontend just needs the
  customer's current lat/lng from the browser.

## 7. Security included

Helmet, CORS allow-list, `express-mongo-sanitize`, rate limiting, bcrypt
password hashing, JWT auth + role-based `authorize()` guards, express-validator
input validation, Razorpay HMAC signature verification, booking-party
authorization checks on every sensitive read/write.
