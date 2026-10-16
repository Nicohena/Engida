// Thin fetch wrapper for the GUZO (ENGIDA) backend.
// Vite's dev server proxies /api to the Express backend (see vite.config.ts).

const BASE_URL = "/api";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Properties
  getProperties: () => request<any[]>("/properties"),
  getProperty: (id: number | string) => request<any>(`/properties/${id}`),
  searchProperties: (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    return request<any[]>(`/properties/search?${qs}`);
  },
  getPropertyReviews: (id: number | string) => request<any[]>(`/properties/${id}/reviews`),

  // Bookings
  getBookings: () => request<any[]>("/bookings"),
  getBooking: (id: number | string) => request<any>(`/bookings/${id}`),
  createBooking: (data: any) => request<any>("/bookings", { method: "POST", body: JSON.stringify(data) }),
  cancelBooking: (id: number | string) => request<any>(`/bookings/${id}/cancel`, { method: "PUT" }),

  // Payments
  initiatePayment: (data: any) => request<any>("/payments/initiate", { method: "POST", body: JSON.stringify(data) }),
  verifyPayment: (paymentId: number) => request<any>("/payments/verify", { method: "POST", body: JSON.stringify({ paymentId }) }),

  // Reviews
  createReview: (data: any) => request<any>("/reviews", { method: "POST", body: JSON.stringify(data) }),

  // Messages
  getConversations: () => request<any[]>("/messages"),
  getThread: (bookingId: number | string) => request<any[]>(`/messages/${bookingId}`),
  sendMessage: (data: any) => request<any>("/messages/send", { method: "POST", body: JSON.stringify(data) }),

  // Profile
  getProfile: () => request<any>("/profile"),
  updateProfile: (data: any) => request<any>("/profile", { method: "PUT", body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () => request<any[]>("/notifications"),
  markNotificationRead: (id: number) => request<any>(`/notifications/${id}/read`, { method: "PUT" }),
  markAllNotificationsRead: () => request<any>("/notifications/read-all", { method: "PUT" }),

  // Favorites
  getFavorites: () => request<any[]>("/favorites"),
  toggleFavorite: (propertyId: number) => request<any>(`/favorites/${propertyId}`, { method: "POST" }),
};

export function formatETB(amount: number) {
  return `ETB ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
