export type PropertyType = "HOTEL" | "APARTMENT" | "GUESTHOUSE" | "LODGE" | "RESORT";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED";
export type PaymentMethod = "TELEBIRR" | "CHAPA" | "CBE" | "DASHEN";

export interface PropertyImage {
  id: number;
  imageUrl: string;
}

export interface Amenity {
  id: number;
  name: string;
  icon: string;
}

export interface Property {
  id: number;
  title: string;
  description: string;
  city: string;
  region: string;
  address: string;
  latitude: number;
  longitude: number;
  price: number;
  rating: number;
  trustScore: number;
  propertyType: PropertyType;
  published: boolean;
  images: PropertyImage[];
  amenities: { amenity: Amenity }[];
  reviews?: Review[];
  host?: { id: number; firstName: string; lastName: string; avatar?: string };
}

export interface Review {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  guest?: { firstName: string; lastName: string; avatar?: string };
}

export interface Booking {
  id: number;
  propertyId: number;
  guestId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  totalPrice: number;
  status: BookingStatus;
  property?: Property;
  payment?: Payment | null;
  review?: Review | null;
}

export interface Payment {
  id: number;
  bookingId: number;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  status: PaymentStatus;
  paidAt?: string;
}

export interface Profile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatar?: string;
  language: string;
}

export interface Notification {
  id: number;
  title: string;
  body: string;
  type: "BOOKING_CONFIRMED" | "PAYMENT_SUCCESSFUL" | "HOST_REPLIED" | "BOOKING_CANCELLED" | "PROMOTION";
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  bookingId: number;
  propertyName: string;
  propertyImage: string | null;
  hostName: string;
  hostAvatar?: string;
  lastMessage: string;
  lastMessageTime: string;
}

export interface Message {
  id: number;
  bookingId: number;
  senderId: number;
  receiverId: number;
  message: string;
  isRead: boolean;
  sentAt: string;
}
