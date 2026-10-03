'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  Image as ImageIcon,
  Star,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  AlertTriangle,
  Plus,
} from 'lucide-react';

interface HostListingGalleryProps {
  listingId: string;
  title: string;
  coverImage: string | null;
  images: string[];
}

export default function HostListingGallery({
  listingId,
  title,
  coverImage,
  images = [],
}: HostListingGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Compile combined photos: cover photo first (if exists), then remaining gallery images
  const allPhotos: string[] = [];
  if (coverImage && coverImage.trim()) {
    allPhotos.push(coverImage.trim());
  }
  images.forEach((img) => {
    if (img && img.trim() && !allPhotos.includes(img.trim())) {
      allPhotos.push(img.trim());
    }
  });

  const totalPhotos = allPhotos.length;

  const handleOpenLightbox = (index: number) => {
    setActivePhotoIndex(index);
    setLightboxOpen(true);
  };

  const handlePrev = useCallback(() => {
    setActivePhotoIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos);
  }, [totalPhotos]);

  const handleNext = useCallback(() => {
    setActivePhotoIndex((prev) => (prev + 1) % totalPhotos);
  }, [totalPhotos]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, handlePrev, handleNext]);

  // Empty state: No images at all
  if (totalPhotos === 0) {
    return (
      <div className="bg-white border border-[#CBD5E1] rounded-2xl p-8 shadow-sm text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#F4F7FC] border border-[#CBD5E1] text-[#94A3B8] flex items-center justify-center mx-auto mb-3">
          <Building2 className="w-8 h-8 text-[#CBD5E1]" />
        </div>
        <h3 className="text-base font-black text-[#000000]">No photos uploaded yet</h3>
        <p className="text-xs text-[#64748B] max-w-sm mx-auto mt-1 mb-4">
          Visuals are the most important part of attracting guests or buyers. Add photos to get your listing ready.
        </p>
        <Link
          href={`/host/listings/${listingId}/edit`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#33599E] hover:bg-[#234079] text-white text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" /> Add Photos
        </Link>
      </div>
    );
  }

  // Preview slice for secondary thumbnails (up to 4)
  const secondaryPhotos = allPhotos.slice(1, 5);
  const remainingCount = totalPhotos > 5 ? totalPhotos - 5 : 0;

  return (
    <>
      <div className="bg-white border border-[#CBD5E1] rounded-2xl overflow-hidden shadow-sm space-y-3 p-4 md:p-6">
        {/* Header toolbar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#33599E]" />
            <h2 className="text-sm font-black text-[#000000]">Listing Gallery</h2>
            <span className="text-xs font-semibold text-[#64748B] bg-[#F4F7FC] px-2.5 py-0.5 rounded-full border border-[#CBD5E1]">
              {totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleOpenLightbox(0)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#33599E] hover:text-[#234079] transition"
          >
            <Maximize2 className="w-3.5 h-3.5" /> View Fullscreen
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="space-y-3">
          {/* Main Hero Photo */}
          <div
            onClick={() => handleOpenLightbox(0)}
            className="group relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-xl overflow-hidden border border-[#CBD5E1] bg-[#F4F7FC] cursor-pointer"
          >
            {!brokenImages[allPhotos[0]] ? (
              <Image
                src={allPhotos[0]}
                alt={`${title} - Primary Cover`}
                fill
                className="object-cover group-hover:scale-[1.02] transition duration-500 ease-out"
                unoptimized
                onError={() =>
                  setBrokenImages((prev) => ({ ...prev, [allPhotos[0]]: true }))
                }
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-400 text-xs">
                <AlertTriangle className="w-6 h-6 text-amber-500 mb-1" />
                <span>Unable to load primary image</span>
              </div>
            )}

            {/* Cover Badge */}
            <div className="absolute top-3 left-3 bg-[#33599E]/90 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5 border border-white/20">
              <Star className="w-3 h-3 fill-current text-amber-300" />
              <span>Cover Photo</span>
            </div>

            {/* Hover expand hint */}
            <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-xs text-white text-xs font-semibold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5" /> Click to enlarge
            </div>
          </div>

          {/* Secondary Thumbnail Row (if more than 1 image) */}
          {secondaryPhotos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {secondaryPhotos.map((photoUrl, idx) => {
                const globalIndex = idx + 1;
                const isLastVisible = idx === secondaryPhotos.length - 1 && remainingCount > 0;
                const isBroken = brokenImages[photoUrl];

                return (
                  <div
                    key={`${photoUrl}-${idx}`}
                    onClick={() => handleOpenLightbox(globalIndex)}
                    className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-[#CBD5E1] bg-[#F4F7FC] cursor-pointer"
                  >
                    {!isBroken ? (
                      <Image
                        src={photoUrl}
                        alt={`${title} - Photo ${globalIndex + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition duration-300 ease-out"
                        unoptimized
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [photoUrl]: true }))
                        }
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-slate-400 text-[10px]">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mb-0.5" />
                        <span>Unavailable</span>
                      </div>
                    )}

                    {/* Photo index indicator */}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded">
                      #{globalIndex + 1}
                    </div>

                    {/* "+N More" overlay if more images exist */}
                    {isLastVisible && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white text-sm font-black p-2 text-center">
                        <span>+{remainingCount}</span>
                        <span className="text-[10px] font-medium opacity-80">more photos</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Fullscreen Lightbox Modal ── */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Top Bar */}
          <div className="absolute top-4 inset-x-4 md:inset-x-8 flex items-center justify-between text-white z-20">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-white/10 px-3 py-1 rounded-full backdrop-blur-xs">
                {activePhotoIndex + 1} / {totalPhotos}
              </span>
              {activePhotoIndex === 0 && coverImage && (
                <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-amber-500/40">
                  <Star className="w-3 h-3 fill-current" /> Cover Photo
                </span>
              )}
            </div>

            <button
              onClick={() => setLightboxOpen(false)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="Close fullscreen gallery"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Previous Button */}
          {totalPhotos > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition z-20"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Active Image Container */}
          <div
            className="relative max-w-5xl max-h-[82vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {!brokenImages[allPhotos[activePhotoIndex]] ? (
              <Image
                src={allPhotos[activePhotoIndex]}
                alt={`${title} - Photo ${activePhotoIndex + 1}`}
                width={1200}
                height={800}
                className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-xl shadow-2xl select-none"
                unoptimized
              />
            ) : (
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 text-center text-slate-300 max-w-md">
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                <p className="font-bold text-sm">Image failed to load</p>
                <p className="text-xs text-slate-400 mt-1 break-all">
                  {allPhotos[activePhotoIndex]}
                </p>
              </div>
            )}
          </div>

          {/* Next Button */}
          {totalPhotos > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition z-20"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </>
  );
}
