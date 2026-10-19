import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

// GET /api/properties  (list, published only)
router.get("/", async (_req, res) => {
  const properties = await prisma.property.findMany({
    where: { published: true },
    include: { images: true, amenities: { include: { amenity: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(properties);
});

// GET /api/properties/search?city=&guests=&minPrice=&maxPrice=&propertyType=&amenities=wifi,pool&rating=4
router.get("/search", async (req, res) => {
  const { city, guests, minPrice, maxPrice, propertyType, amenities, rating, verifiedOnly, sort } =
    req.query as Record<string, string | undefined>;

  const where: any = { published: true };

  if (city) where.city = { equals: city, mode: "insensitive" };
  if (propertyType) where.propertyType = String(propertyType).toUpperCase();
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = Number(minPrice);
    if (maxPrice) where.price.lte = Number(maxPrice);
  }
  if (rating) where.rating = { gte: Number(rating) };
  if (verifiedOnly === "true") where.trustScore = { gte: 80 };
  if (amenities) {
    const list = String(amenities).split(",").filter(Boolean);
    if (list.length) {
      where.amenities = {
        some: { amenity: { name: { in: list, mode: "insensitive" } } },
      };
    }
  }

  let orderBy: any = { createdAt: "desc" };
  if (sort === "price_asc") orderBy = { price: "asc" };
  if (sort === "price_desc") orderBy = { price: "desc" };
  if (sort === "rating") orderBy = { rating: "desc" };

  const properties = await prisma.property.findMany({
    where,
    include: { images: true, amenities: { include: { amenity: true } } },
    orderBy,
  });

  // guests filter is informational only in this simplified schema
  const filtered = guests
    ? properties // property has no maxGuests field in the current schema; kept for API compatibility
    : properties;

  res.json(filtered);
});

// GET /api/properties/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      images: true,
      amenities: { include: { amenity: true } },
      availability: true,
      reviews: { include: { guest: true } },
      host: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    },
  });
  if (!property) return res.status(404).json({ error: "Property not found" });
  res.json(property);
});

export default router;
