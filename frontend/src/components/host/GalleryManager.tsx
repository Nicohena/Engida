'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { apiFetch } from '../../lib/api';
import type { ListingStatus } from '../../types/host';
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
  Shield,
  Clock,
  Loader2,
} from 'lucide-react';

interface MediaActionResponse {
  coverImage?: string;
  images?: string[];
  activeReview?: {
    proposedChanges?: {
      coverImage?: string;
      images?: string[];
    };
  } | null;
  moderationMessage?: string;
  isPendingReview?: boolean;
}

interface GalleryManagerProps {
  coverImage: string;
  images: string[];
  onCoverImageChange: (url: string) => void;
  onImagesChange: (urls: string[]) => void;
  propertyId?: string; // Optional: enables Cloudinary direct file uploads & server deletion if editing existing property
  coverError?: string;
  maxImages?: number;
  listingStatus?: ListingStatus;
  isPendingReview?: boolean;
}

const SAMPLE_PROPERTY_IMAGES = [
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
];

export default function GalleryManager({
  coverImage,
  images,
  onCoverImageChange,
  onImagesChange,
  propertyId,
  coverError,
  maxImages = 20,
  listingStatus,
  isPendingReview,
}: GalleryManagerProps) {
  // Direct URL Input State
  const [newUrl, setNewUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  // File Upload State (for Cloudinary)
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<{
    type: 'success' | 'error' | 'moderation';
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
  // URL Validation & Addition (Supports single or multiple URLs)
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

    const raw = newUrl.trim();
    if (!raw) {
      setUrlError('Please enter an image URL');
      return;
    }

    // Split tokens by comma, newline, or whitespace to support multiple URLs
    const tokens = raw.split(/[\n,\s]+/).map((t) => t.trim()).filter(Boolean);
    if (tokens.length === 0) {
      setUrlError('Please enter a valid image URL');
      return;
    }

    const validated: string[] = [];
    for (const token of tokens) {
      const error = validateUrl(token);
      if (error) {
        setUrlError(`${error}: "${token.length > 30 ? token.slice(0, 30) + '…' : token}"`);
        return;
      }
      if (images.includes(token) || (coverImage.trim() === token && !validated.includes(token))) {
        continue;
      }
      if (!validated.includes(token)) {
        validated.push(token);
      }
    }

    if (validated.length === 0) {
      setUrlError('All entered image URLs are already in your listing');
      return;
    }

    if (images.length + validated.length > maxImages) {
      setUrlError(
        `Limit of ${maxImages} gallery photos reached (can only add ${Math.max(0, maxImages - images.length)} more)`,
      );
      return;
    }

    const toAdd = [...validated];
    // If cover image is not set yet, use the first added URL as cover
    if (!coverImage.trim() && toAdd.length > 0) {
      const first = toAdd.shift()!;
      onCoverImageChange(first);
    }

    if (toAdd.length > 0) {
      onImagesChange([...images, ...toAdd]);
    }

    setNewUrl('');
  };

  // ─────────────────────────────────────────────────────────
  // Gallery Manipulation: Reorder, Remove, Set Cover
  // ─────────────────────────────────────────────────────────
  const handleRemoveImage = async (indexToRemove: number) => {
    const urlToRemove = images[indexToRemove];
    if (!urlToRemove) return;

    if (propertyId) {
      setDeletingIndex(indexToRemove);
      setUploadFeedback(null);
      try {
        const res = await apiFetch<MediaActionResponse>(`/properties/${propertyId}/images`, {
          method: 'DELETE',
          body: JSON.stringify({ imageUrl: urlToRemove }),
        });

        if (res?.isPendingReview) {
          const stagedImages =
            res.activeReview?.proposedChanges?.images ||
            images.filter((_, i) => i !== indexToRemove);
          onImagesChange(stagedImages);
          setUploadFeedback({
            type: 'moderation',
            message:
              res.moderationMessage ||
              'Photo removal staged for moderation review. Public listing remains unchanged until approved.',
          });
        } else if (Array.isArray(res?.images)) {
          onImagesChange(res.images);
          setUploadFeedback({
            type: 'success',
            message: 'Photo removed from gallery.',
          });
        } else {
          onImagesChange(images.filter((_, i) => i !== indexToRemove));
          setUploadFeedback({
            type: 'success',
            message: 'Photo removed.',
          });
        }
      } catch {
        // Fallback to local array removal if image was not stored on the server yet
        onImagesChange(images.filter((_, i) => i !== indexToRemove));
      } finally {
        setDeletingIndex(null);
      }
    } else {
      // Direct local removal for draft creation
      onImagesChange(images.filter((_, i) => i !== indexToRemove));
    }
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

    // If previous cover existed and isn't already in gallery, retain it in gallery
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

      const updated = await apiFetch<MediaActionResponse>(`/properties/${propertyId}/cover-image`, {
        method: 'POST',
        body: formData,
      });

      if (updated?.isPendingReview) {
        const stagedCover = updated.activeReview?.proposedChanges?.coverImage || updated.coverImage;
        if (stagedCover) {
          onCoverImageChange(stagedCover);
        }
        setUploadFeedback({
          type: 'moderation',
          message:
            updated.moderationMessage ||
            'Cover photo uploaded and staged for moderation review. Public listing remains unchanged until approved.',
        });
      } else if (updated?.coverImage) {
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

    if (files.length > 10) {
      setUploadFeedback({ type: 'error', message: 'Upload up to 10 photos at a time.' });
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
      return;
    }
    if (images.length + files.length > maxImages) {
      setUploadFeedback({
        type: 'error',
        message: `This listing can have up to ${maxImages} gallery photos. Remove ${
          images.length + files.length - maxImages
        } photo${images.length + files.length - maxImages === 1 ? '' : 's'} or upload fewer.`,
      });
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
      return;
    }

    setIsUploadingGallery(true);
    setUploadFeedback(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('files', file);
      });

      const updated = await apiFetch<MediaActionResponse>(`/properties/${propertyId}/images`, {
        method: 'POST',
        body: formData,
      });

      if (updated?.isPendingReview) {
        const stagedImages = updated.activeReview?.proposedChanges?.images || updated.images;
        if (Array.isArray(stagedImages)) {
          onImagesChange(stagedImages);
        }
        setUploadFeedback({
          type: 'moderation',
          message:
            updated.moderationMessage ||
            `${files.length} gallery photo${
              files.length > 1 ? 's' : ''
            } uploaded and staged for moderation review. Public listing remains unchanged until approved.`,
        });
      } else if (Array.isArray(updated?.images)) {
        onImagesChange(updated.images);
        setUploadFeedback({
          type: 'success',
          message: `${files.length} gallery photo${files.length > 1 ? 's' : ''} uploaded successfully!`,
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

  const isLiveListing = listingStatus === 'PUBLISHED' || listingStatus === 'PAUSED';

  return (
    <div className="space-y-6">
      {/* ── Live Listing Moderation Notice ── */}
      {isLiveListing && (
        <div className="p-3.5 rounded-xl bg-[#F8F5ED] border border-[#E5E0D5] flex items-start gap-3 text-xs text-[#252923]">
          <Shield className="w-4 h-4 text-[#234B36] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">
              {isPendingReview ? 'Media Changes Pending Review:' : 'Live Listing Moderation:'}
            </span>
            <p className="text-[#73776F] leading-relaxed">
              {isPendingReview
                ? 'You currently have media updates submitted for administrative approval. Additional changes will update your pending review proposal.'
                : 'Updates to cover and gallery images are staged for administrative review to protect guests. Your approved live photos remain online until new changes are approved.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Feedback Banner ── */}
      {uploadFeedback && (
        <div
          className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs font-semibold ${
            uploadFeedback.type === 'moderation'
              ? 'bg-[#F8F5ED] border-[#E5E0D5] text-[#252923]'
              : uploadFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {uploadFeedback.type === 'moderation' ? (
              <Clock className="w-4 h-4 text-[#234B36] shrink-0 animate-pulse" />
            ) : uploadFeedback.type === 'success' ? (
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
            aria-label="Dismiss feedback message"
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
            <label htmlFor="coverImage" className="block text-sm font-bold text-[#252923]">
              Cover Image
            </label>
            <p className="text-xs text-[#73776F]">
              Required before publishing. This is the main photo shown on search results and listing pages.
            </p>
            {!propertyId && (
              <p className="mt-1 text-xs text-[#73776F]">
                Enter a direct URL now, or save this draft first to enable Cloudinary file uploads.
              </p>
            )}
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E0D5] bg-white hover:bg-[#F8F5ED] text-xs font-bold text-[#234B36] transition disabled:opacity-50"
              >
                {isUploadingCover ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#234B36]" />
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
            placeholder="Paste a direct image URL (https://...)"
            className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#252923] placeholder:text-[#73776F] focus:outline-none focus:ring-2 transition ${
              coverError
                ? 'border-red-400 focus:ring-red-200'
                : 'border-[#E5E0D5] focus:ring-[#234B36]/20 focus:border-[#234B36]'
            }`}
          />
          {coverImage.trim() && (
            <button
              type="button"
              onClick={handleDemoteCoverToGallery}
              title="Move cover image to gallery"
              className="px-3 py-2 rounded-xl border border-[#E5E0D5] bg-white hover:bg-[#F8F5ED] text-xs font-semibold text-[#73776F] shrink-0"
            >
              Move to Gallery
            </button>
          )}
        </div>
        <div className="flex items-center justify-between text-xs">
          {coverError ? (
            <p className="text-xs text-red-600 font-semibold">{coverError}</p>
          ) : (
            <span />
          )}
          {!coverImage.trim() && (
            <button
              type="button"
              onClick={() => onCoverImageChange(SAMPLE_PROPERTY_IMAGES[0])}
              className="text-[#234B36] hover:underline font-semibold text-xs ml-auto"
            >
              Use sample cover photo
            </button>
          )}
        </div>

        {/* Cover Preview Card */}
        {coverImage.trim() && (
          <div className="relative w-full max-w-md aspect-[16/9] rounded-2xl overflow-hidden border border-[#E5E0D5] bg-[#F8F5ED] shadow-2xs group">
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
              <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-xs text-[#73776F]">
                <AlertTriangle className="w-6 h-6 text-amber-500 mb-1" />
                <span className="font-semibold text-[#252923]">Broken or inaccessible image URL</span>
                <span className="text-[11px] text-[#73776F] mt-0.5">Please check that the image link is public</span>
              </div>
            )}

            {/* Badge overlay */}
            <div className="absolute top-3 left-3 bg-[#234B36] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
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
      <div className="space-y-4 pt-4 border-t border-[#EEF3EF]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <label className="block text-sm font-bold text-[#252923]">
              Photo Gallery ({images.length} / {maxImages})
            </label>
            <p className="text-xs text-[#73776F]">
              Add interior, exterior, and neighborhood photos. You can paste multiple URLs or upload files.
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E0D5] bg-white hover:bg-[#F8F5ED] text-xs font-bold text-[#234B36] transition disabled:opacity-50"
              >
                {isUploadingGallery ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#234B36]" />
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
                placeholder="Paste an image URL, or multiple separated by comma or spaces"
                className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium text-[#252923] placeholder:text-[#73776F] focus:outline-none focus:ring-2 transition ${
                  urlError
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-[#E5E0D5] focus:ring-[#234B36]/20 focus:border-[#234B36]'
                }`}
              />
            </div>
            <button
              type="button"
              onClick={() => handleAddGalleryUrl()}
              disabled={!newUrl.trim() || images.length >= maxImages}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 shrink-0"
            >
              <Plus className="w-4 h-4" /> Add to Gallery
            </button>
          </div>
          {urlError && <p className="text-xs text-red-600 font-semibold">{urlError}</p>}
        </div>

        {/* Gallery Thumbnails Grid */}
        {images.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#F8F5ED] border-2 border-dashed border-[#E5E0D5] text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-[#EEF3EF] text-[#234B36] flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[#252923]">No gallery photos yet</p>
            <p className="text-xs text-[#73776F] max-w-sm mx-auto">
              {propertyId
                ? 'Add image URLs above or upload your property photos via Cloudinary.'
                : 'Add image URLs now, or save this draft and upload property photos from the listing editor.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const toAdd = SAMPLE_PROPERTY_IMAGES.slice(1).filter(
                    (url) => !images.includes(url) && url !== coverImage.trim(),
                  );
                  onImagesChange([...images, ...toAdd]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E0D5] bg-white hover:bg-[#F8F5ED] text-xs font-semibold text-[#234B36] transition shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" /> Insert Sample Gallery Photos
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((imgUrl, idx) => {
              const isBroken = brokenUrls[imgUrl];
              const isDeletingThis = deletingIndex === idx;

              return (
                <div
                  key={`${imgUrl}-${idx}`}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden border border-[#E5E0D5] bg-[#F8F5ED] shadow-2xs hover:shadow-sm transition"
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

                  {/* Deleting overlay */}
                  {isDeletingThis && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-1.5 z-10">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Removing…</span>
                    </div>
                  )}

                  {/* Action Toolbar on Hover / Focus */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 flex items-center justify-between gap-1 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {/* Reorder Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, idx - 1)}
                        disabled={idx === 0 || isDeletingThis}
                        title="Move photo earlier in gallery"
                        aria-label={`Move photo ${idx + 1} earlier`}
                        className="w-6 h-6 rounded bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, idx + 1)}
                        disabled={idx === images.length - 1 || isDeletingThis}
                        title="Move photo later in gallery"
                        aria-label={`Move photo ${idx + 1} later`}
                        className="w-6 h-6 rounded bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Promote to Cover & Remove */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handlePromoteToCover(idx)}
                        disabled={isDeletingThis}
                        title="Set this photo as Cover Photo"
                        className="px-1.5 py-1 rounded bg-amber-500/80 hover:bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <Star className="w-3 h-3 fill-current" /> Cover
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        disabled={isDeletingThis}
                        title="Remove photo from gallery"
                        aria-label={`Remove photo ${idx + 1}`}
                        className="w-6 h-6 rounded bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center transition disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
