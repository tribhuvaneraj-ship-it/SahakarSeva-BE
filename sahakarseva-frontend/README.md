# SahakarSeva — frontend additions

This package contains the pieces you asked for on top of your existing
MERN backend and partial frontend:

- `src/components/BookingModal.jsx`
- `src/pages/CustomerDashboard.jsx`
- `src/pages/WorkerDashboard.jsx`
- `src/pages/AdminDashboard.jsx`
- `src/pages/BookingTracking.jsx`
- `src/pages/Profile.jsx`
- `src/App.jsx`
- Supporting files: `src/api/axios.js`, `src/api/services.js`,
  `src/context/AuthContext.jsx`, `src/context/SocketContext.jsx`,
  `src/components/ProtectedRoute.jsx`, `src/components/DashboardLayout.jsx`,
  `src/utils/loadGoogleMaps.js`, `src/styles/dashboard.css`

## 1. Where each file goes

Copy the `src/` folder contents into your existing frontend project,
matching paths exactly (e.g. `src/pages/CustomerDashboard.jsx`,
`src/components/BookingModal.jsx`). If you already have files with the
same names, back them up first and merge by hand.

## 2. Install the packages these files use

```bash
npm install react-router-dom axios socket.io-client
```

If you're on Create React App instead of Vite, see step 5 below —
`import.meta.env` is Vite-only.

## 3. Environment variables

Create a `.env` file in your frontend root:

```bash
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_js_api_key
```

- `VITE_API_URL` — your Express REST API base.
- `VITE_SOCKET_URL` — your Socket.IO server (usually the same host, no `/api`).
- `VITE_GOOGLE_MAPS_API_KEY` — optional. Without it, the app still works
  fully (GPS + typed address); it just skips the visual map picker and
  live tracking map. Enable the **Maps JavaScript API** and **Geocoding
  API** on the key in Google Cloud Console.

## 4. Assumptions baked into these files — please verify against your backend

I don't have your actual backend route/socket names, so I picked a
consistent, typical set. **`src/api/services.js` is the single file to
edit** if your routes differ — every page calls through it, nothing
else hardcodes a URL.

**REST endpoints assumed:**

| Purpose | Method & path |
|---|---|
| Login | `POST /auth/login` |
| Google login | `POST /auth/google` |
| Current user | `GET /auth/me` |
| Search services | `GET /services?q=&lat=&lng=` |
| Nearby workers | `GET /workers/nearby?lat=&lng=&serviceId=` |
| Toggle worker availability | `PATCH /workers/me/availability` |
| Update worker location | `PATCH /workers/me/location` |
| Create booking | `POST /bookings` |
| Customer's bookings | `GET /bookings/mine` |
| Worker's jobs | `GET /bookings/worker` |
| Booking detail | `GET /bookings/:id` |
| Accept / reject job | `PATCH /bookings/:id/accept` / `/reject` |
| Update job status | `PATCH /bookings/:id/status` `{ status }` |
| Profile get/update | `GET` / `PATCH /users/me` |
| Admin stats/users/bookings | `GET /admin/stats`, `/admin/users`, `/admin/bookings` |
| Verify / block worker | `PATCH /admin/users/:id/verify`, `/block` |

**Expected user object shape:** `{ _id, name, email, role, phone, address, skills[] }`
where `role` is one of `"customer" | "worker" | "admin"`.

**Expected booking object shape:** `{ _id, service, worker, customer, address, lat, lng, scheduledAt, notes, status }`
where `status` is one of `pending | accepted | in_progress | completed | rejected | cancelled`.

**Socket.IO events assumed** (auth via `{ auth: { token } }` on connect):

| Direction | Event | Payload |
|---|---|---|
| Worker → server | `worker:locationUpdate` | `{ lat, lng }` |
| Client → server | `booking:join` / `booking:leave` | `{ bookingId }` |
| Server → clients | `booking:new` | new job request pushed to a worker |
| Server → clients | `booking:statusChanged` | `{ bookingId, status }` |
| Server → clients | `booking:locationUpdate` | `{ bookingId, lat, lng }` |

If your backend uses different event/field names, update the `socket.on`
/ `socket.emit` calls in `WorkerDashboard.jsx` and `BookingTracking.jsx`.

## 5. Pages this code assumes you already built

`App.jsx` routes to `./pages/Login`, `./pages/Register`, and
`./pages/Home`, since you mentioned some frontend already exists. If
your files live somewhere else or are named differently, just fix
those three import lines at the top of `App.jsx`. After a successful
login/Google login in your `Login.jsx`, call:

```js
import { useAuth } from "../context/AuthContext";
const { login } = useAuth();
login(jwtToken, userObject);
```

then redirect based on `userObject.role` (`/customer`, `/worker`, or `/admin`).

## 6. Styling

All new components use plain CSS classes (prefixed `ss-`) defined in
`src/styles/dashboard.css`, which is imported once from `App.jsx`. No
Tailwind or CSS-in-JS required — if your project already uses Tailwind,
these classes will simply coexist with it. For the Devanagari brand
mark in the sidebar to render with its intended weight, add this to
your `index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

## 7. If you're on Create React App instead of Vite

Replace every `import.meta.env.VITE_X` with `process.env.REACT_APP_X`
in `src/api/axios.js`, `src/context/SocketContext.jsx`,
`src/utils/loadGoogleMaps.js`, and rename your `.env` variables from
`VITE_` to `REACT_APP_` prefixes.

## 8. Run it

```bash
npm run dev
```

Log in as a customer to search and book a service, as a worker to
toggle availability (grants GPS + accept/reject jobs), or as an admin
to see the platform overview.
