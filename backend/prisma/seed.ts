import { PrismaClient, PropertyType, BookingStatus, PaymentStatus, PaymentMethod, NotificationType } from "@prisma/client";

const prisma = new PrismaClient();

const AMENITIES = [
  { name: "WiFi", icon: "wifi" },
  { name: "Parking", icon: "car" },
  { name: "Breakfast", icon: "coffee" },
  { name: "Pool", icon: "waves" },
  { name: "Kitchen", icon: "utensils" },
  { name: "Air Conditioning", icon: "wind" },
  { name: "TV", icon: "tv" },
  { name: "Hot Shower", icon: "shower-head" },
  { name: "Workspace", icon: "briefcase" },
  { name: "Balcony", icon: "door-open" },
];

const CITIES = [
  { city: "Addis Ababa", region: "Addis Ababa", lat: 9.03, lng: 38.74 },
  { city: "Bahir Dar", region: "Amhara", lat: 11.6, lng: 37.39 },
  { city: "Hawassa", region: "Sidama", lat: 7.05, lng: 38.47 },
  { city: "Lalibela", region: "Amhara", lat: 12.03, lng: 39.04 },
  { city: "Gondar", region: "Amhara", lat: 12.6, lng: 37.47 },
];

const PROPERTY_TYPES: PropertyType[] = ["HOTEL", "APARTMENT", "GUESTHOUSE", "LODGE", "RESORT"];

const PROPERTY_NAMES = [
  "Addis Skyline Hotel", "Entoto View Guesthouse", "Bole Comfort Apartments",
  "Blue Nile Falls Lodge", "Lake Tana Resort", "Bahir Dar Palace Hotel",
  "Hawassa Lakeside Villa", "Rift Valley Resort", "Sidama Coffee Lodge",
  "Lalibela Heritage Hotel", "Rock Church View Guesthouse", "Lalibela Cultural Lodge",
  "Gondar Castle Hotel", "Fasil Ghebbi Apartments", "Simien View Resort",
];

const IMAGE_POOL = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4",
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427",
];

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  console.log("Seeding GUZO (ENGIDA) database...");

  // Clean slate (order matters due to FKs)
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.review.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.propertyAmenity.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.property.deleteMany();
  await prisma.amenity.deleteMany();
  await prisma.user.deleteMany();

  // Amenities
  const amenities = await Promise.all(
    AMENITIES.map((a) => prisma.amenity.create({ data: a }))
  );

  // 10 users (guest accounts). User #1 is the "mock logged-in guest".
  const firstNames = ["Abebe", "Marta", "Kebede", "Selam", "Yonas", "Hana", "Dawit", "Ruth", "Solomon", "Tigist"];
  const lastNames = ["Bekele", "Alemu", "Girma", "Tesfaye", "Assefa", "Mekonnen", "Haile", "Wolde", "Tadesse", "Fikru"];

  const users = [];
  for (let i = 0; i < 10; i++) {
    const user = await prisma.user.create({
      data: {
        firstName: firstNames[i],
        lastName: lastNames[i],
        email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@example.com`,
        phone: `+2519${(10000000 + i * 1111).toString().slice(0, 8)}`,
        avatar: `https://i.pravatar.cc/150?img=${i + 1}`,
        language: "en",
        role: "GUEST",
      },
    });
    users.push(user);
  }
  // Also create a couple of "host" users the properties belong to
  const hosts = [];
  for (let i = 0; i < 3; i++) {
    const host = await prisma.user.create({
      data: {
        firstName: ["Yared", "Meron", "Getachew"][i],
        lastName: ["Tesfaye", "Alemayehu", "Worku"][i],
        email: `host${i + 1}@guzo-engida.com`,
        phone: `+2519${(20000000 + i * 2222).toString().slice(0, 8)}`,
        avatar: `https://i.pravatar.cc/150?img=${i + 20}`,
        language: "en",
        role: "HOST",
      },
    });
    hosts.push(host);
  }

  const mockGuest = users[0]; // userId = 1 (the mock logged-in guest)

  // 15 properties across the 5 cities
  const properties = [];
  for (let i = 0; i < 15; i++) {
    const cityInfo = CITIES[Math.floor(i / 3)];
    const rating = Math.round((3.8 + Math.random() * 1.2) * 10) / 10;
    const trustScore = 60 + Math.floor(Math.random() * 40);
    const price = 1500 + Math.floor(Math.random() * 8) * 500;

    const property = await prisma.property.create({
      data: {
        hostId: hosts[i % hosts.length].id,
        title: PROPERTY_NAMES[i],
        description:
          `${PROPERTY_NAMES[i]} offers a comfortable stay in ${cityInfo.city}, blending modern ` +
          `amenities with authentic Ethiopian hospitality. Perfect for business trips, family ` +
          `vacations, or a relaxing getaway, guests enjoy easy access to local attractions, ` +
          `great food, and warm service throughout their stay.`,
        city: cityInfo.city,
        region: cityInfo.region,
        address: `${PROPERTY_NAMES[i]} Rd, ${cityInfo.city}`,
        latitude: cityInfo.lat + (Math.random() - 0.5) * 0.05,
        longitude: cityInfo.lng + (Math.random() - 0.5) * 0.05,
        price,
        rating,
        trustScore,
        propertyType: pick(PROPERTY_TYPES, i),
        published: true,
      },
    });

    // 4 images per property
    await prisma.propertyImage.createMany({
      data: Array.from({ length: 4 }).map((_, imgIdx) => ({
        propertyId: property.id,
        imageUrl: `${pick(IMAGE_POOL, i + imgIdx)}?auto=format&fit=crop&w=1200&q=80&sig=${i}-${imgIdx}`,
      })),
    });

    // 4-6 random amenities per property
    const shuffled = [...amenities].sort(() => 0.5 - Math.random());
    const chosen = shuffled.slice(0, 4 + Math.floor(Math.random() * 3));
    await prisma.propertyAmenity.createMany({
      data: chosen.map((a) => ({ propertyId: property.id, amenityId: a.id })),
    });

    properties.push(property);
  }

  // 50 availability records: for each of the first ~10 properties, block a couple of near-term dates
  let availabilityCount = 0;
  for (const property of properties) {
    for (let d = 1; d <= 4; d++) {
      const isBlocked = d === 2; // block one day per property as "unavailable"
      await prisma.availability.create({
        data: {
          propertyId: property.id,
          date: daysFromNow(d),
          available: !isBlocked,
        },
      });
      availabilityCount++;
      if (availabilityCount >= 50) break;
    }
    if (availabilityCount >= 50) break;
  }

  // 8 bookings: mix of statuses, mostly for the mock guest so the UI has data to show
  const bookingStatuses: BookingStatus[] = [
    "CONFIRMED", "CONFIRMED", "COMPLETED", "COMPLETED", "COMPLETED", "CANCELLED", "PENDING", "CONFIRMED",
  ];
  const bookings = [];
  for (let i = 0; i < 8; i++) {
    const property = properties[i];
    const guest = i < 6 ? mockGuest : users[i % users.length];
    const checkIn = daysFromNow(i < 3 ? 10 + i : -(10 + i)); // past dates for completed stays
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 3);
    const nights = 3;
    const totalPrice = property.price * nights + 350;

    const booking = await prisma.booking.create({
      data: {
        guestId: guest.id,
        propertyId: property.id,
        checkIn,
        checkOut,
        guests: 2,
        nights,
        totalPrice,
        status: bookingStatuses[i],
        createdAt: daysFromNow(-(20 + i)),
      },
    });
    bookings.push(booking);

    if (booking.status !== "PENDING") {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          amount: totalPrice,
          method: pick<PaymentMethod>(["TELEBIRR", "CHAPA", "CBE", "DASHEN"], i),
          transactionId: `TXN-${1000 + i}`,
          status: booking.status === "CANCELLED" ? "FAILED" : "SUCCESS",
          paidAt: booking.status === "CANCELLED" ? null : daysFromNow(-(19 + i)),
        },
      });
    }
  }

  // 12 reviews (only for completed bookings)
  const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
  const sampleComments = [
    "Wonderful stay, the staff were incredibly welcoming and the room was spotless.",
    "Great location and beautiful views. Would definitely come back again.",
    "Comfortable beds, fast WiFi, and an amazing breakfast spread every morning.",
    "The host was very responsive and helped us plan our sightseeing.",
    "Good value for money, though the water pressure could be improved.",
    "Exceeded expectations — felt like a home away from home.",
  ];
  let reviewCount = 0;
  for (const booking of completedBookings) {
    for (let r = 0; r < 4 && reviewCount < 12; r++) {
      await prisma.review.create({
        data: {
          bookingId: reviewCount < completedBookings.length ? booking.id : booking.id, // one real link per booking below
          guestId: mockGuest.id,
          propertyId: booking.propertyId,
          rating: 4 + (reviewCount % 2 === 0 ? 1 : 0),
          comment: sampleComments[reviewCount % sampleComments.length],
        },
      }).catch(() => null); // bookingId is unique; skip dupes gracefully
      reviewCount++;
      break; // one review per completed booking (bookingId is @unique on Review)
    }
  }
  // Fill remaining reviews against random properties/guests with distinct bookings not required by schema demo data
  // (Review.bookingId is unique, so extra "seed-only" reviews reuse other completed bookings across guests)
  for (const property of properties.slice(0, 12 - reviewCount)) {
    const fakeBooking = await prisma.booking.create({
      data: {
        guestId: users[Math.floor(Math.random() * users.length)].id,
        propertyId: property.id,
        checkIn: daysFromNow(-30),
        checkOut: daysFromNow(-27),
        guests: 2,
        nights: 3,
        totalPrice: property.price * 3 + 350,
        status: "COMPLETED",
      },
    });
    await prisma.review.create({
      data: {
        bookingId: fakeBooking.id,
        guestId: fakeBooking.guestId,
        propertyId: property.id,
        rating: 3 + Math.floor(Math.random() * 3),
        comment: sampleComments[Math.floor(Math.random() * sampleComments.length)],
      },
    });
  }

  // 20 messages across a few bookings (mock guest <-> host)
  const confirmedOrCompleted = bookings.filter((b) => b.status !== "PENDING" && b.status !== "CANCELLED");
  let messageCount = 0;
  for (const booking of confirmedOrCompleted) {
    const property = properties.find((p) => p.id === booking.propertyId)!;
    const hostId = property.hostId;
    const exchanges = [
      { from: "guest", text: "Hi! Is early check-in possible on our arrival day?" },
      { from: "host", text: "Hello! Yes, we can arrange check-in from 12:00 PM for you." },
      { from: "guest", text: "That would be great, thank you so much!" },
      { from: "host", text: "You're welcome. Looking forward to hosting you." },
    ];
    for (const ex of exchanges) {
      if (messageCount >= 20) break;
      await prisma.message.create({
        data: {
          bookingId: booking.id,
          senderId: ex.from === "guest" ? booking.guestId : hostId,
          receiverId: ex.from === "guest" ? hostId : booking.guestId,
          message: ex.text,
          isRead: ex.from === "host" ? false : true,
        },
      });
      messageCount++;
    }
    if (messageCount >= 20) break;
  }

  // Notifications for the mock guest
  await prisma.notification.createMany({
    data: [
      { userId: mockGuest.id, title: "Booking confirmed", body: "Your booking at Addis Skyline Hotel is confirmed.", type: "BOOKING_CONFIRMED" as NotificationType, isRead: false },
      { userId: mockGuest.id, title: "Payment successful", body: "Your payment of ETB 9,950 was successful.", type: "PAYMENT_SUCCESSFUL" as NotificationType, isRead: false },
      { userId: mockGuest.id, title: "Host replied", body: "Yared replied to your message.", type: "HOST_REPLIED" as NotificationType, isRead: true },
      { userId: mockGuest.id, title: "Booking cancelled", body: "Your booking #6 was cancelled per your request.", type: "BOOKING_CANCELLED" as NotificationType, isRead: true },
      { userId: mockGuest.id, title: "Special offer", body: "Get 15% off lodges in Lalibela this month.", type: "PROMOTION" as NotificationType, isRead: false },
    ],
  });

  console.log("Seed complete:");
  console.log(`  Users: ${users.length + hosts.length}`);
  console.log(`  Properties: ${properties.length}`);
  console.log(`  Bookings: ${bookings.length}`);
  console.log(`  Messages: ${messageCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
