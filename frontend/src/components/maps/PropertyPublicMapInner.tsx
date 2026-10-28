'use client';

import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, ExternalLink, ShieldCheck, Compass } from 'lucide-react';

interface PropertyPublicMapInnerProps {
  latitude?: number | null;
  longitude?: number | null;
  title?: string;
  address?: string;
  city?: string;
  subCity?: string;
  neighborhood?: string;
  showExactPin?: boolean;
}

const DEFAULT_ADDIS_COORDS: [number, number] = [8.9982, 38.7844];

export default function PropertyPublicMapInner({
  latitude,
  longitude,
  title = 'Property Location',
  address,
  city = 'Addis Ababa',
  subCity,
  neighborhood,
  showExactPin = true,
}: PropertyPublicMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const hasValidCoords =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude !== 0 &&
    longitude !== 0;

  const lat = hasValidCoords ? (latitude as number) : DEFAULT_ADDIS_COORDS[0];
  const lng = hasValidCoords ? (longitude as number) : DEFAULT_ADDIS_COORDS[1];

  const locationSummary =
    [neighborhood, subCity, city].filter(Boolean).join(', ') || 'Addis Ababa, Ethiopia';

  // Custom luxury SVG Pin Marker
  const createCustomPinIcon = () => {
    return L.divIcon({
      className: 'custom-engida-public-pin',
      html: `
        <div style="position: relative; width: 44px; height: 50px; transform: translate(-22px, -50px);">
          <svg viewBox="0 0 384 512" width="44" height="50" style="filter: drop-shadow(0 6px 14px rgba(35,75,54,0.4));">
            <path fill="#234B36" stroke="#FFFFFF" stroke-width="22" d="M172.268 501.67C26.97 291.031 0 269.413 0 192 0 85.961 85.961 0 192 0s192 85.961 192 192c0 77.413-26.97 99.031-172.268 309.67-9.535 13.774-29.93 13.773-39.464 0z"/>
          </svg>
          <div style="position: absolute; top: 12px; left: 13px; width: 18px; height: 18px; background: #E6C687; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);">
            <div style="width: 8px; height: 8px; background: #234B36; border-radius: 50%;"></div>
          </div>
        </div>
      `,
      iconSize: [44, 50],
      iconAnchor: [22, 50],
    });
  };

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [lat, lng],
      zoom: showExactPin ? 15 : 14,
      zoomControl: false,
      scrollWheelZoom: false, // Prevent page scroll hijack
    });

    L.control.zoom({ position: 'topright' }).addTo(map);

    // CartoDB Voyager luxury clean tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    if (showExactPin) {
      const marker = L.marker([lat, lng], {
        icon: createCustomPinIcon(),
      }).addTo(map);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 2px;">
          <strong style="color: #234B36; font-size: 13px; display: block; margin-bottom: 2px;">${title}</strong>
          <span style="color: #73776F; font-size: 11px;">📍 ${locationSummary}</span>
        </div>
      `);
    } else {
      // General Area circle to preserve privacy
      L.circle([lat, lng], {
        color: '#234B36',
        fillColor: '#234B36',
        fillOpacity: 0.15,
        radius: 350,
        weight: 2,
      }).addTo(map);
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [lat, lng, showExactPin, title, locationSummary]);

  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const googleMapsViewUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className="space-y-4">
      {/* Location Header with 1-Click Google Maps Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#234B36]" />
            <h3 className="text-base font-bold text-[#252923]">{locationSummary}</h3>
          </div>
          {address && (
            <p className="text-xs text-[#73776F] mt-0.5 ml-6">
              {address}
            </p>
          )}
        </div>

        {/* 1-Click Google Maps Action Buttons */}
        <div className="flex items-center gap-2">
          <a
            href={googleMapsNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-bold transition shadow-sm cursor-pointer shrink-0"
            title="Open in Google Maps for turn-by-turn navigation"
          >
            <Navigation className="w-3.5 h-3.5 text-[#E6C687]" />
            <span>Navigate in Google Maps</span>
            <ExternalLink className="w-3 h-3 text-white/80" />
          </a>

          <a
            href={googleMapsViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E0D5] hover:bg-[#F8F5ED] text-[#252923] text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
            title="View area map and satellite view"
          >
            <span>View Map</span>
          </a>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className="relative rounded-2xl overflow-hidden border border-[#E5E0D5] shadow-sm">
        <div ref={mapContainerRef} className="w-full h-80 z-0" />

        {/* Verification & Privacy Badge */}
        <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-[#E5E0D5] shadow-md flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="text-[11px] font-bold text-[#252923]">
            {showExactPin ? 'Verified Property Location' : 'Approximate Neighborhood Area'}
          </span>
        </div>

        {/* Floating Proximity Strip */}
        <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/95 backdrop-blur-xs p-2.5 rounded-xl border border-[#E5E0D5] shadow-md flex items-center justify-between text-xs text-[#73776F]">
          <span className="flex items-center gap-1.5 font-medium text-[#252923]">
            <Compass className="w-3.5 h-3.5 text-[#234B36]" />
            Coordinates: {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
          </span>
          <span className="text-[11px] font-semibold text-[#234B36]">
            Tap map to explore neighborhood
          </span>
        </div>
      </div>
    </div>
  );
}
