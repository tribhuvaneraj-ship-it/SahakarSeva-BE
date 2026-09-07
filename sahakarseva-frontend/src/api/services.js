import api from "./axios";

// NOTE: these paths mirror a typical SahakarSeva backend. If your Express
// routes are named differently, this is the only file you should need to edit.

export const authApi = {
  login: (email, password) => api.post("/auth/login", { email, password }),
  register: (payload) => api.post("/auth/register", payload),
  googleLogin: (idToken) => api.post("/auth/google", { idToken }),
  me: () => api.get("/auth/me"),
};

export const serviceApi = {
  // params: { q, category, lat, lng, radius }
  search: (params) => api.get("/services", { params }),
  categories: () => api.get("/services/categories"),
};

export const workerApi = {
  // params: { lat, lng, serviceId, radius }
  nearby: (params) => api.get("/users/nearby-workers", { params }),
  toggleAvailability: (available) => api.put("/users/worker-profile/availability", { isAvailable: available, isSharingLocation: available }),
  updateLocation: (lat, lng) => api.put("/users/me", { lat, lng }),
};

export const bookingApi = {
  create: (payload) => api.post("/bookings", payload),
  myBookings: () => api.get("/bookings"),
  workerJobs: () => api.get("/bookings"),
  detail: (id) => api.get(`/bookings/${id}`),
  accept: (id) => api.put(`/bookings/${id}/accept`),
  reject: (id) => api.put(`/bookings/${id}/reject`),
  updateStatus: (id, status) => api.put(`/bookings/${id}/status`, { status }),
  cancel: (id) => api.put(`/bookings/${id}/status`, { status: "cancelled" }),
};

export const userApi = {
  profile: () => api.get("/auth/me"),
  updateProfile: (payload) => api.put("/users/me", payload),
};

export const adminApi = {
  stats: () => api.get("/admin/stats"),
  users: (params) => api.get("/admin/users", { params }),
  bookings: (params) => api.get("/admin/bookings", { params }),
  verifyWorker: (id) => api.patch(`/admin/users/${id}/verify`),
  toggleBlock: (id, blocked) => api.patch(`/admin/users/${id}/block`, { blocked }),
};
