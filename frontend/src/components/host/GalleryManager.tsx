'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { apiFetch } from '../../lib/api';
import type { Property } from '../../types';
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Star,
  Upload,
  AlertTriangle,
  X,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface GalleryManagerProps {
  coverImage: string;
  images: string[];
  onCoverImageChange: (url: string) => void;
  onImagesChange: (urls: string[]) => void;
  propertyId?: string; // Optional: enables Cloudinary direct file uploads if editing existing property
  coverError?: string;
  maxImages?: number;
}

export default function GalleryManager({
  coverImage,
  images,
  onCoverImageChange,
  onImagesChange,
  propertyId,
  coverError,
  maxImages = 20,
}: GalleryManagerProps) {
  // Direct URL Input State
  const [newUrl, setNewUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // File Upload State (for Cloudinary)
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Image load error trackers
  const [brokenUrls, setBrokenUrls] = useState<Record<string, boolean>>({});

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const markImageBroken = (url: string) => {
    setBrokenUrls((prev) => ({ ...prev, [url]: true }));
  };

  // ─────────────────────────────────────────────────────────
  // URL Validation & Addition
  // ─────────────────────────────────────────────────────────
  const validateUrl = (url: string): string | null => {
    const trimmed = url.trim();
    if (!trimmed) return 'Please enter an image URL';
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return 'URL must start with http:// or https://';
      }
    } catch {
      return 'Please enter a valid URL (e.g. https://...)';
    }
    return null;
  };

  const handleAddGalleryUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setUrlError(null);

    const trimmed = newUrl.trim();
    const error = validateUrl(trimmed);
    if (error) {
      setUrlError(error);
      return;
    }

    if (images.includes(trimmed)) {
      setUrlError('This image URL is already in your gallery');
      return;
    }

    if (coverImage === trimmed) {
      setUrlError('This image is already set as your cover image');
      return;
    }

    if (images.length >= maxImages) {
      setUrlError(`Maximum limit of ${maxImages} gallery photos reached`);
      return;
    }

    // If there is no cover image set yet, suggest or set as cover if user wants
    if (!coverImage.trim()) {
      onCoverImageChange(trimmed);
      setNewUrl('');
      return;
    }

    onImagesChange([...images, trimmed]);
    setNewUrl('');
  };

  // ─────────────────────────────────────────────────────────
  // Gallery Manipulation: Reorder, Remove, Set Cover
  // ─────────────────────────────────────────────────────────
  const handleRemoveImage = (indexToRemove: number) => {
    onImagesChange(images.filter((_, i) => i !== indexToRemove));
  };

  const handleMoveImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onImagesChange(reordered);
  };

  const handlePromoteToCover = (index: number) => {
    const newCover = images[index];
    const oldCover = coverImage.trim();

    // Remove selected image from gallery
    const remainingGallery = images.filter((_, i) => i !== index);

    // If previous cover existed and isn't already in gallery, push it into gallery
    if (oldCover && !remainingGallery.includes(oldCover)) {
      onImagesChange([oldCover, ...remainingGallery]);
    } else {
      onImagesChange(remainingGallery);
    }

    onCoverImageChange(newCover);
  };

  const handleDemoteCoverToGallery = () => {
    if (!coverImage.trim()) return;
    if (!images.includes(coverImage.trim())) {
      onImagesChange([coverImage.trim(), ...images]);
    }
    onCoverImageChange('');
  };

  // ─────────────────────────────────────────────────────────
  // Cloudinary File Uploads
  // ─────────────────────────────────────────────────────────
  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !propertyId) return;

    setIsUploadingCover(true);
    setUploadFeedback(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const updated = await apiFetch<Property>(`/properties/${propertyId}/cover-image`, {
        method: 'POST',
        body: formData,
      });

      if (updated.coverImage) {
        onCoverImageChange(updated.coverImage);
        setUploadFeedback({
          type: 'success',
          message: 'Cover image uploaded and updated successfully!',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cover photo upload failed.';
      setUploadFeedback({
        type: 'error',
        message: `${msg} You can still enter direct image URLs.`,
      });
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleGalleryFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !propertyId) return;

    setIsUploadingGallery(true);
    setUploadFeedback(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const updated = await apiFetch<Property>(`/properties/${propertyId}/images`, {
        method: 'POST',
        body: formData,
      });

      if (updated.images) {
        onImagesChange(updated.images);
        setUploadFeedback({
          type: 'success',
          message: `${files.length} gallery image${files.length > 1 ? 's' : ''} uploaded successfully!`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gallery photos upload failed.';
      setUploadFeedback({
        type: 'error',
        message: `${msg} You can still enter direct image URLs.`,
      });
    } finally {
      setIsUploadingGallery(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Feedback Banner ── */}
      {uploadFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs font-semibold ${
            uploadFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {uploadFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{uploadFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadFeedback(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          SUB-SECTION 1: Primary Cover Photo
      ═══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <label htmlFor="coverImage" className="block text-sm font-bold text-[#000000]">
              Cover Image <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-[#64748B]">
              The main hero photo displayed in search results and at the top of your listing.
            </p>
          </div>

          {/* Cloudinary File Upload Button for Cover (if in edit mode) */}
          {propertyId && (
            <div>
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFileUpload}
                className="hidden"
                id="cover-file-upload"
              />
              <button
                type="button"
                onClick={() => coverFileInputRef.current?.click()}
                disabled={isUploadingCover}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F4F7FC] text-xs font-bold text-[#33599E] transition disabled:opacity-50"
              >
                {isUploadingCover ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#33599E]/40 border-t-[#33599E] rounded-full animate-spin" />
                    Uploading Cover…
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> Upload File (Cloudinary)
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Cover Image Input */}
        <div className="flex gap-2">
          <input
            id="coverImage"
            name="coverImage"
            type="url"
            value={coverImage}
            onChange={(e) => onCoverImageChange(e.target.value)}
            placeholder="https://images.unsplash.com/photo-... or upload above"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#000000] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 transition ${
              coverError
                ? 'border-red-400 focus:ring-red-200'
                : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
            }`}
          />
          {coverImage.trim() && (
            <button
              type="button"
              onClick={handleDemoteCoverToGallery}
              title="Move to gallery"
              className="px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F4F7FC] text-xs font-semibold text-[#64748B] shrink-0"
            >
              Move to Gallery
            </button>
          )}
        </div>
        {coverError && <p className="text-xs text-red-600 font-semibold">{coverError}</p>}

        {/* Cover Preview Card */}
        {coverImage.trim() && (
          <div className="relative w-full max-w-md aspect-[16/9] rounded-2xl overflow-hidden border border-[#CBD5E1] bg-[#F4F7FC] shadow-2xs group">
            {!brokenUrls[coverImage.trim()] ? (
              <Image
                src={coverImage.trim()}
                alt="Cover photo preview"
                fill
                className="object-cover"
                unoptimized
                onError={() => markImageBroken(coverImage.trim())}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-xs text-[#94A3B8]">
                <AlertTriangle className="w-6 h-6 text-amber-500 mb-1" />
                <span className="font-semibold text-slate-700">Broken or inaccessible image URL</span>
                <span className="text-[11px] text-slate-500 mt-0.5">Please check that the image link is public</span>
              </div>
            )}

            {/* Badge overlay */}
            <div className="absolute top-3 left-3 bg-[#33599E] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" /> Cover Photo
            </div>

            <div className="absolute top-3 right-3 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition">
              <a
                href={coverImage.trim()}
                target="_blank"
                rel="noreferrer"
                className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-lg text-xs transition"
                title="Open image in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => onCoverImageChange('')}
                className="bg-black/60 hover:bg-red-600 text-white p-1.5 rounded-lg text-xs transition"
                title="Remove cover photo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          SUB-SECTION 2: Gallery Photos
      ═══════════════════════════════════════════════════ */}
      <div className="space-y-4 pt-4 border-t border-[#F1F5F9]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <label className="block text-sm font-bold text-[#000000]">
              Photo Gallery ({images.length} / {maxImages})
            </label>
            <p className="text-xs text-[#64748B]">
              Add additional interior, exterior, and neighborhood images. Reorder and promote any image to cover.
            </p>
          </div>

          {/* Cloudinary File Upload Button for Gallery (if in edit mode) */}
          {propertyId && (
            <div>
              <input
                ref={galleryFileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleGalleryFilesUpload}
                className="hidden"
                id="gallery-file-upload"
              />
              <button
                type="button"
                onClick={() => galleryFileInputRef.current?.click()}
                disabled={isUploadingGallery || images.length >= maxImages}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#CBD5E1] bg-white hover:bg-[#F4F7FC] text-xs font-bold text-[#33599E] transition disabled:opacity-50"
              >
                {isUploadingGallery ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-[#33599E]/40 border-t-[#33599E] rounded-full animate-spin" />
                    Uploading to Gallery…
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> Upload Photos (Cloudinary)
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Add Photo URL Input */}
        <div className="space-y-1.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="url"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value);
                  if (urlError) setUrlError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGalleryUrl();
                  }
                }}
                placeholder="Paste image URL (https://images.unsplash.com/...)"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#000000] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 transition ${
                  urlError
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#CBD5E1] focus:ring-[#33599E]/20 focus:border-[#33599E]'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={() => handleAddGalleryUrl()}
              disabled={!newUrl.trim() || images.length >= maxImages}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#33599E] hover:bg-[#234079] text-white text-xs font-bold transition disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add to Gallery
            </button>
          </div>
          {urlError && <p className="text-xs text-red-600 font-semibold">{urlError}</p>}
        </div>

        {/* Gallery Thumbnails Grid */}
        {images.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#F8FAFD] border-2 border-dashed border-[#CBD5E1] text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#E3EAF5] text-[#33599E] flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#000000]">No gallery photos yet</p>
            <p className="text-xs text-[#64748B] max-w-sm mx-auto">
              Add image URLs above or upload images to give prospective guests a complete view of your space.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((imgUrl, idx) => {
              const isBroken = brokenUrls[imgUrl];

              return (
                <div
                  key={`${imgUrl}-${idx}`}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-[#CBD5E1] bg-[#F4F7FC] shadow-2xs hover:shadow-sm transition"
                >
                  {/* Image Thumbnail */}
                  {!isBroken ? (
                    <Image
                      src={imgUrl}
                      alt={`Gallery photo ${idx + 1}`}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-300 ease-out"
                      unoptimized
                      onError={() => markImageBroken(imgUrl)}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-xs text-[#94A3B8]">
                      <AlertTriangle className="w-5 h-5 text-amber-500 mb-1" />
                      <span className="text-[11px] leading-tight">Image load failed</span>
                    </div>
                  )}

                  {/* Top Badge: Photo Number */}
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    #{idx + 1}
                  </div>

                  {/* Action Toolbar on Hover / Focus */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 flex items-center justify-between gap-1 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, idx - 1)}
                        disabled={idx === 0}
                        title="Move photo left"
                        className="w-6 h-6 rounded bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, idx + 1)}
                        disabled={idx === images.length - 1}
                        title="Move photo right"
                        className="w-6 h-6 rounded bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Promote & Remove */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handlePromoteToCover(idx)}
                        title="Set as Cover Photo"
                        className="px-1.5 py-1 rounded bg-amber-500/80 hover:bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <Star className="w-3 h-3 fill-current" /> Cover
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        title="Remove photo"
                        className="w-6 h-6 rounded bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
