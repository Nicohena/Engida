import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Star, ShieldCheck, MapPin, Tag } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { formatETB } from "../lib/api";
import type { Property } from "../types";

interface PropertyCardProps {
  property: Property;
  dealTag?: string;
  originalPrice?: number;
  hideDecorations?: boolean;
  hideVerifiedBadge?: boolean;
  onFavoriteToggle?: (id: number, isFavorite: boolean) => void;
}

export function PropertyCard({ property, dealTag, originalPrice, hideDecorations = false, hideVerifiedBadge = false, onFavoriteToggle }: PropertyCardProps) {
  const [favorited, setFavorited] = useState(false);
  const cover =
    property.images?.[0]?.imageUrl ||
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80";
  const isVerified = property.trustScore >= 80;

  function handleHeartClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nextState = !favorited;
    setFavorited(nextState);
    if (onFavoriteToggle) {
      onFavoriteToggle(property.id, nextState);
    }
  }

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border border-slate-100 bg-white rounded-2xl flex flex-col h-full">
      <Link to={`/property/${property.id}`} className="block relative">
        <div className="relative h-52 w-full overflow-hidden bg-slate-100">
          <img
            src={cover}
            alt={property.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

          {/* Top Badges */}
          {!hideDecorations && (
            <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5 z-10">
              {isVerified && !hideVerifiedBadge && (
                <Badge variant="primary" className="bg-white/95 text-primary font-semibold shadow-sm backdrop-blur-md px-2.5 py-1 text-xs">
                  <ShieldCheck size={13} className="mr-1 text-primary inline-block" /> GUZO Verified
                </Badge>
              )}
              {dealTag && (
                <span className="inline-flex items-center rounded-full bg-accent text-slate-950 font-bold px-2.5 py-0.5 text-xs shadow-md">
                  <Tag size={11} className="mr-1 inline-block" /> {dealTag}
                </span>
              )}
            </div>
          )}

          {/* Favorite Button */}
          <button
            type="button"
            onClick={handleHeartClick}
            aria-label="Add to favorites"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-md transition-all hover:scale-110 hover:bg-white active:scale-95"
          >
            <Heart
              size={18}
              className={favorited ? "fill-red-500 text-red-500 transition-colors" : "text-slate-600 hover:text-red-500"}
            />
          </button>

          {/* Property Type Badge */}
          <span className="absolute bottom-3 left-3 rounded-lg bg-black/60 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white uppercase tracking-wider">
            {property.propertyType}
          </span>


        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link to={`/property/${property.id}`} className="flex-1">
              <h3 className="line-clamp-1 font-bold text-slate-900 group-hover:text-primary transition-colors text-base">
                {property.title}
              </h3>
            </Link>
            {!hideDecorations && (
              <div className="flex shrink-0 items-center gap-1 text-xs font-bold text-slate-800 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                <Star size={13} className="fill-accent text-accent" />
                {property.rating.toFixed(1)}
              </div>
            )}
          </div>

          <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <MapPin size={13} className="text-primary shrink-0" />
            <span className="truncate">{property.region ? `${property.region}, ` : ""}{property.city}</span>
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-end justify-between">
          {!hideDecorations && (
            <div>
              {originalPrice && originalPrice > property.price && (
                <span className="text-xs text-slate-400 line-through mr-1.5 font-medium">
                  {formatETB(originalPrice)}
                </span>
              )}
              <span className="text-lg font-extrabold text-primary">{formatETB(property.price)}</span>
              <span className="text-xs text-slate-500 font-medium"> /night</span>
            </div>
          )}

          <Link
            to={`/property/${property.id}`}
            className="text-xs font-bold text-primary hover:text-primary-dark transition-colors"
          >
            View details &rarr;
          </Link>
        </div>
      </div>
    </Card>
  );
}
