'use client';

import React, { useState } from 'react';

interface PropertyHeroGalleryProps {
  coverImage: string | null;
  images: string[];
  title: string;
}

export default function PropertyHeroGallery({ coverImage, images, title }: PropertyHeroGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const allImages = coverImage ? [coverImage, ...images.filter(img => img !== coverImage)] : images;
  const heroImage = coverImage || images[0] || '';
  const totalPhotos = allImages.length;

  return (
    <>
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div
          className="relative overflow-hidden rounded-2xl shadow-sm group cursor-pointer border border-slate-200/80"
          onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
        >
          {/* Main Featured Image */}
          <div className="w-full aspect-[16/8] sm:aspect-[16/7] md:aspect-[21/9] bg-slate-100 overflow-hidden relative">
            {heroImage ? (
              <img
                alt={title}
                className="w-full h-full object-cover object-center group-hover:scale-[1.02] transition duration-500 ease-out"
                src={heroImage}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">
                No images available
              </div>
            )}

            {/* Top Left Verified Stay Badge (Engida Brand Style) */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="bg-white/95 backdrop-blur-md text-slate-900 text-xs font-bold px-3 py-1 rounded-full shadow-2xs flex items-center gap-1.5 border border-slate-200/60">
                <span className="w-2 h-2 rounded-full bg-[#2563eb]" />
                100% Verified Ethiopian Stay
              </span>
            </div>
          </div>

          {/* Gallery Overlay Badge */}
          {totalPhotos > 0 && (
            <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide flex items-center space-x-2 shadow-sm">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              <span>View All {totalPhotos} Photo{totalPhotos !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightboxOpen && allImages.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-6 right-6 text-white/80 hover:text-white text-3xl font-light z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center transition-colors"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close gallery"
          >
            ✕
          </button>

          {allImages.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl backdrop-blur-sm z-10 transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex - 1 + allImages.length) % allImages.length); }}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl backdrop-blur-sm z-10 transition-colors"
                onClick={(e) => { e.stopPropagation(); setLightboxIndex((lightboxIndex + 1) % allImages.length); }}
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}

          <img
            src={allImages[lightboxIndex]}
            alt={`${title} - Photo ${lightboxIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />

          <div className="absolute bottom-6 text-white/80 text-xs font-mono font-medium bg-black/50 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {allImages.length}
          </div>
        </div>
      )}
    </>
  );
}
