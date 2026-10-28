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
  Link2,
  FolderUp,
  RefreshCw,
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

interface CloudinaryUploadItem {
  publicId?: string;
  url?: string;
  secureUrl?: string;
}

interface MultiUploadResponse {
  images: CloudinaryUploadItem[];
  count: number;
}

interface GalleryManagerProps {
  coverImage: string;
  images: string[];
  onCoverImageChange: (url: string) => void;
  onImagesChange: (urls: string[]) => void;
  propertyId?: string; // Optional: when editing existing property, enables property-bound moderation and deletion
  coverError?: string;
  maxImages?: number;
  listingStatus?: ListingStatus;
  isPendingReview?: boolean;
}

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
  // Local File Upload States
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [isDraggingGallery, setIsDraggingGallery] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);

  // Direct URL Input States
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [coverUrlError, setCoverUrlError] = useState<string | null>(null);
  const [galleryUrlInput, setGalleryUrlInput] = useState('');
  const [galleryUrlError, setGalleryUrlError] = useState<string | null>(null);

  // Feedback Notification Banner
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'moderation';
    message: string;
  } | null>(null);

  // Broken image detector
  const [brokenUrls, setBrokenUrls] = useState<Record<string, boolean>>({});

  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  const markImageBroken = (url: string) => {
    setBrokenUrls((prev) => ({ ...prev, [url]: true }));
  };

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

  // ─────────────────────────────────────────────────────────
  // Local File Upload: Cover Photo
  // ─────────────────────────────────────────────────────────
  const processCoverFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({
        type: 'error',
        message: 'Unsupported file type. Please upload a valid image (JPEG, PNG, WEBP, AVIF).',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFeedback({
        type: 'error',
        message: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the 10MB limit.`,
      });
      return;
    }

    setIsUploadingCover(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      if (propertyId) {
        // Edit mode: upload to property-specific endpoint to support live moderation
        const updated = await apiFetch<MediaActionResponse>(`/properties/${propertyId}/cover-image`, {
          method: 'POST',
          body: formData,
        });

        if (updated?.isPendingReview) {
          const stagedCover = updated.activeReview?.proposedChanges?.coverImage || updated.coverImage;
          if (stagedCover) {
            onCoverImageChange(stagedCover);
          }
          setFeedback({
            type: 'moderation',
            message:
              updated.moderationMessage ||
              'Cover photo uploaded and staged for moderation review. Live listing remains unchanged until approved.',
          });
        } else if (updated?.coverImage) {
          onCoverImageChange(updated.coverImage);
          setFeedback({
            type: 'success',
            message: 'Cover photo uploaded and updated successfully!',
          });
        }
      } else {
        // Creation mode: upload to general authenticated Cloudinary upload route
        const res = await apiFetch<CloudinaryUploadItem>('/upload/image', {
          method: 'POST',
          body: formData,
        });

        const uploadedUrl = res.secureUrl || res.url;
        if (uploadedUrl) {
          onCoverImageChange(uploadedUrl);
          setFeedback({
            type: 'success',
            message: 'Cover photo uploaded successfully from your device!',
          });
        } else {
          throw new Error('Upload completed, but no image URL was returned.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cover photo upload failed.';
      setFeedback({
        type: 'error',
        message: `${msg} Please try again.`,
      });
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = '';
    }
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processCoverFile(file);
    }
  };

  const handleSetCoverByUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCoverUrlError(null);
    const raw = coverUrlInput.trim();
    if (!raw) {
      setCoverUrlError('Please enter an image URL');
      return;
    }
    const err = validateUrl(raw);
    if (err) {
      setCoverUrlError(err);
      return;
    }

    onCoverImageChange(raw);
    setCoverUrlInput('');
    setFeedback({
      type: 'success',
      message: 'Cover photo set via image URL!',
    });
  };

  // ─────────────────────────────────────────────────────────
  // Local File Upload: Gallery Photos (Multi-file)
  // ─────────────────────────────────────────────────────────
  const processGalleryFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (fileArray.length > 10) {
      setFeedback({
        type: 'error',
        message: 'You can upload a maximum of 10 photos at once. Please select fewer files.',
      });
      return;
    }

    if (images.length + fileArray.length > maxImages) {
      setFeedback({
        type: 'error',
        message: `Gallery photo limit is ${maxImages}. You can only add ${Math.max(
          0,
          maxImages - images.length,
        )} more photo${maxImages - images.length === 1 ? '' : 's'}.`,
      });
      return;
    }

    for (const f of fileArray) {
      if (!f.type.startsWith('image/')) {
        setFeedback({
          type: 'error',
          message: `"${f.name}" is not a valid image format.`,
        });
        return;
      }
      if (f.size > 10 * 1024 * 1024) {
        setFeedback({
          type: 'error',
          message: `"${f.name}" exceeds the 10MB maximum size limit.`,
        });
        return;
      }
    }

    setIsUploadingGallery(true);
    setFeedback(null);

    try {
      const formData = new FormData();
      fileArray.forEach((file) => {
        formData.append('files', file);
      });

      if (propertyId) {
        // Edit mode: upload to property-specific endpoint
        const updated = await apiFetch<MediaActionResponse>(`/properties/${propertyId}/images`, {
          method: 'POST',
          body: formData,
        });

        if (updated?.isPendingReview) {
          const stagedImages = updated.activeReview?.proposedChanges?.images || updated.images;
          if (Array.isArray(stagedImages)) {
            onImagesChange(stagedImages);
          }
          setFeedback({
            type: 'moderation',
            message:
              updated.moderationMessage ||
              `${fileArray.length} gallery photo${
                fileArray.length > 1 ? 's' : ''
              } staged for moderation review.`,
          });
        } else if (Array.isArray(updated?.images)) {
          onImagesChange(updated.images);
          setFeedback({
            type: 'success',
            message: `${fileArray.length} gallery photo${fileArray.length > 1 ? 's' : ''} uploaded successfully!`,
          });
        }
      } else {
        // Creation mode: upload to authenticated general Cloudinary endpoint
        const res = await apiFetch<MultiUploadResponse>('/upload/images', {
          method: 'POST',
          body: formData,
        });

        const newUrls = (res.images || [])
          .map((img) => img.secureUrl || img.url)
          .filter(Boolean) as string[];

        if (newUrls.length > 0) {
          // If no cover image exists yet, use the first uploaded photo as cover
          if (!coverImage.trim()) {
            const [first, ...rest] = newUrls;
            onCoverImageChange(first);
            if (rest.length > 0) {
              onImagesChange([...images, ...rest]);
            }
            setFeedback({
              type: 'success',
              message: `Uploaded ${newUrls.length} photos! The first photo was automatically set as your Cover Photo.`,
            });
          } else {
            onImagesChange([...images, ...newUrls]);
            setFeedback({
              type: 'success',
              message: `${newUrls.length} gallery photo${newUrls.length > 1 ? 's' : ''} uploaded successfully from your device!`,
            });
          }
        } else {
          throw new Error('Upload finished, but no photo URLs were returned.');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gallery photos upload failed.';
      setFeedback({
        type: 'error',
        message: `${msg} Please try again.`,
      });
    } finally {
      setIsUploadingGallery(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = '';
    }
  };

  const handleGalleryFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processGalleryFiles(files);
    }
  };

  const handleAddGalleryByUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setGalleryUrlError(null);
    const raw = galleryUrlInput.trim();
    if (!raw) {
      setGalleryUrlError('Please enter an image URL');
      return;
    }

    const tokens = raw.split(/[\n,\s]+/).map((t) => t.trim()).filter(Boolean);
    const validated: string[] = [];

    for (const token of tokens) {
      const err = validateUrl(token);
      if (err) {
        setGalleryUrlError(`${err}: "${token.length > 25 ? token.slice(0, 25) + '…' : token}"`);
        return;
      }
      if (!images.includes(token) && !validated.includes(token) && token !== coverImage.trim()) {
        validated.push(token);
      }
    }

    if (validated.length === 0) {
      setGalleryUrlError('Entered image URL is already in your gallery.');
      return;
    }

    if (images.length + validated.length > maxImages) {
      setGalleryUrlError(
        `Exceeds maximum of ${maxImages} gallery photos. You can only add ${Math.max(
          0,
          maxImages - images.length,
        )} more.`,
      );
      return;
    }

    if (!coverImage.trim() && validated.length > 0) {
      const [first, ...rest] = validated;
      onCoverImageChange(first);
      if (rest.length > 0) {
        onImagesChange([...images, ...rest]);
      }
      setFeedback({
        type: 'success',
        message: `Added ${validated.length} photo URL(s)! First URL set as Cover Photo.`,
      });
    } else {
      onImagesChange([...images, ...validated]);
      setFeedback({
        type: 'success',
        message: `Added ${validated.length} photo URL${validated.length > 1 ? 's' : ''} to gallery!`,
      });
    }

    setGalleryUrlInput('');
  };

  // ─────────────────────────────────────────────────────────
  // Gallery Manipulation: Reorder, Promote, Demote, Remove
  // ─────────────────────────────────────────────────────────
  const handleRemoveGalleryImage = async (indexToRemove: number) => {
    const urlToRemove = images[indexToRemove];
    if (!urlToRemove) return;

    if (propertyId) {
      setDeletingIndex(indexToRemove);
      setFeedback(null);
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
          setFeedback({
            type: 'moderation',
            message:
              res.moderationMessage ||
              'Photo removal staged for moderation review. Public listing remains unchanged until approved.',
          });
        } else if (Array.isArray(res?.images)) {
          onImagesChange(res.images);
          setFeedback({
            type: 'success',
            message: 'Photo removed from gallery.',
          });
        } else {
          onImagesChange(images.filter((_, i) => i !== indexToRemove));
          setFeedback({
            type: 'success',
            message: 'Photo removed.',
          });
        }
      } catch {
        onImagesChange(images.filter((_, i) => i !== indexToRemove));
      } finally {
        setDeletingIndex(null);
      }
    } else {
      // Local removal in listing creation mode
      onImagesChange(images.filter((_, i) => i !== indexToRemove));
    }
  };

  const handleMoveGalleryImage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= images.length) return;
    const reordered = [...images];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onImagesChange(reordered);
  };

  const handlePromoteToCover = (index: number) => {
    const newCover = images[index];
    const oldCover = coverImage.trim();

    const remainingGallery = images.filter((_, i) => i !== index);

    if (oldCover && !remainingGallery.includes(oldCover)) {
      onImagesChange([oldCover, ...remainingGallery]);
    } else {
      onImagesChange(remainingGallery);
    }

    onCoverImageChange(newCover);
    setFeedback({
      type: 'success',
      message: 'Photo promoted to Cover Photo.',
    });
  };

  const handleDemoteCoverToGallery = () => {
    if (!coverImage.trim()) return;
    if (!images.includes(coverImage.trim())) {
      onImagesChange([coverImage.trim(), ...images]);
    }
    onCoverImageChange('');
    setFeedback({
      type: 'success',
      message: 'Cover photo moved to gallery. Please select or upload a new cover photo.',
    });
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
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs font-semibold ${
            feedback.type === 'moderation'
              ? 'bg-[#F8F5ED] border-[#E5E0D5] text-[#252923]'
              : feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'moderation' ? (
              <Clock className="w-4 h-4 text-[#234B36] shrink-0 animate-pulse" />
            ) : feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-700"
            aria-label="Dismiss feedback message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          SECTION 1: Primary Cover Photo
      ═══════════════════════════════════════════════════ */}
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="cover-file-input" className="block text-sm font-bold text-[#252923]">
              Cover Photo <span className="text-red-500">*</span>
            </label>
            {coverImage.trim() && (
              <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                Cover Photo Set
              </span>
            )}
          </div>
          <p className="text-xs text-[#73776F] mt-0.5">
            The main visual that represents your property. Upload directly from your computer storage or paste a direct image URL.
          </p>
        </div>

        {/* Hidden File Input for Cover */}
        <input
          ref={coverFileInputRef}
          id="cover-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={handleCoverFileChange}
          className="hidden"
          disabled={isUploadingCover}
        />

        {/* State A: Cover Image is set -> Showcase Preview Card */}
        {coverImage.trim() ? (
          <div className="space-y-3">
            <div className="relative w-full aspect-[16/9] max-w-xl rounded-2xl overflow-hidden border border-[#E5E0D5] bg-[#F8F5ED] shadow-sm group">
              {!brokenUrls[coverImage.trim()] ? (
                <Image
                  src={coverImage.trim()}
                  alt="Listing cover photo preview"
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  unoptimized
                  onError={() => markImageBroken(coverImage.trim())}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center text-xs text-[#73776F]">
                  <AlertTriangle className="w-6 h-6 text-amber-500 mb-1" />
                  <span className="font-semibold text-[#252923]">Broken image URL</span>
                  <span className="text-[11px] text-[#73776F] mt-0.5">
                    The file link could not be loaded. Please upload a new photo.
                  </span>
                </div>
              )}

              {/* Uploading Overlay */}
              {isUploadingCover && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-white z-20">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                  <span className="text-xs font-semibold">Uploading new cover photo…</span>
                </div>
              )}

              {/* Cover Badge */}
              <div className="absolute top-3 left-3 bg-[#234B36] text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 z-10">
                <Star className="w-3 h-3 fill-current" /> Cover Photo
              </div>

              {/* Overlay Controls */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                <a
                  href={coverImage.trim()}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-black/60 hover:bg-black/80 text-white p-2 rounded-xl text-xs transition backdrop-blur-xs"
                  title="Open full image in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => onCoverImageChange('')}
                  className="bg-black/60 hover:bg-red-600 text-white p-2 rounded-xl text-xs transition backdrop-blur-xs"
                  title="Remove cover photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bottom Quick-Action Bar */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between gap-2 z-10 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-xs font-bold text-[#234B36] transition shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Replace from Device
                </button>
                <button
                  type="button"
                  onClick={handleDemoteCoverToGallery}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold text-white transition backdrop-blur-xs"
                >
                  Move to Gallery
                </button>
              </div>
            </div>

            {/* Replace / Change options */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl">
              <button
                type="button"
                onClick={() => coverFileInputRef.current?.click()}
                disabled={isUploadingCover}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E5E0D5] bg-white hover:bg-[#F8F5ED] text-xs font-bold text-[#234B36] transition disabled:opacity-50 shrink-0"
              >
                <FolderUp className="w-3.5 h-3.5" /> Choose from Device
              </button>

              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#73776F]">
                  <Link2 className="w-3.5 h-3.5" />
                </span>
                <input
                  type="url"
                  value={coverUrlInput}
                  onChange={(e) => {
                    setCoverUrlInput(e.target.value);
                    if (coverUrlError) setCoverUrlError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSetCoverByUrl();
                    }
                  }}
                  placeholder="Or paste new image URL..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#E5E0D5] bg-white text-xs font-medium text-[#252923] placeholder:text-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSetCoverByUrl()}
                disabled={!coverUrlInput.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-bold transition disabled:opacity-50 shrink-0"
              >
                Update URL
              </button>
            </div>
            {coverUrlError && <p className="text-xs text-red-600 font-semibold">{coverUrlError}</p>}
          </div>
        ) : (
          /* State B: No Cover Image -> Dual Choice: Drag & Drop Dropzone + Direct URL Bar */
          <div className="space-y-2.5 max-w-xl">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingCover(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingCover(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingCover(false);
                const file = e.dataTransfer.files?.[0];
                if (file) processCoverFile(file);
              }}
              onClick={() => {
                if (!isUploadingCover) coverFileInputRef.current?.click();
              }}
              className={`relative p-7 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center ${
                isDraggingCover
                  ? 'border-[#234B36] bg-[#EEF3EF] scale-[0.99]'
                  : coverError
                  ? 'border-red-300 bg-red-50/40 hover:bg-red-50/70'
                  : 'border-[#D1D9D4] bg-[#FDFCF7] hover:bg-[#F8F5ED] hover:border-[#234B36]'
              }`}
            >
              {isUploadingCover ? (
                <div className="flex flex-col items-center justify-center py-4 space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[#234B36]" />
                  <p className="text-sm font-bold text-[#252923]">Uploading cover photo…</p>
                  <p className="text-xs text-[#73776F]">Storing image securely</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-2.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#EEF3EF] text-[#234B36] flex items-center justify-center shadow-2xs">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#252923]">
                      <span className="text-[#234B36] underline underline-offset-2">Click to browse from local device</span>{' '}
                      or drag & drop
                    </p>
                    <p className="text-xs text-[#73776F]">
                      Supports JPG, PNG, WEBP, or AVIF (up to 10MB)
                    </p>
                  </div>
                  <button
                    type="button"
                    tabIndex={-1}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#234B36] text-white text-xs font-bold shadow-xs hover:bg-[#2D5E43] transition"
                  >
                    <FolderUp className="w-3.5 h-3.5" /> Upload from Computer
                  </button>
                </div>
              )}
            </div>

            {/* Direct URL Input alternative right below the dropzone */}
            <div className="p-3 rounded-xl bg-[#F8F5ED]/70 border border-[#E5E0D5] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#73776F]">
                <span className="flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-[#234B36]" /> Or enter cover photo URL:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={coverUrlInput}
                  onChange={(e) => {
                    setCoverUrlInput(e.target.value);
                    if (coverUrlError) setCoverUrlError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSetCoverByUrl();
                    }
                  }}
                  placeholder="https://example.com/cover-photo.jpg"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white text-xs font-medium text-[#252923] placeholder:text-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                />
                <button
                  type="button"
                  onClick={() => handleSetCoverByUrl()}
                  disabled={!coverUrlInput.trim()}
                  className="px-3.5 py-2 rounded-lg bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-bold transition disabled:opacity-50 shrink-0"
                >
                  Set Cover
                </button>
              </div>
              {coverUrlError && <p className="text-xs text-red-600 font-semibold">{coverUrlError}</p>}
            </div>
          </div>
        )}

        {coverError && <p className="text-xs text-red-600 font-semibold">{coverError}</p>}
      </div>

      {/* ═══════════════════════════════════════════════════
          SECTION 2: Gallery Photos (Multi-Upload or URL)
      ═══════════════════════════════════════════════════ */}
      <div className="space-y-4 pt-4 border-t border-[#EEF3EF]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <label htmlFor="gallery-file-input" className="block text-sm font-bold text-[#252923]">
                Photo Gallery
              </label>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EEF3EF] text-[#234B36]">
                {images.length} / {maxImages} photos
              </span>
            </div>
            <p className="text-xs text-[#73776F] mt-0.5">
              Upload photos of all bedrooms, bathrooms, and living spaces. You can upload files from your device or paste web URLs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => galleryFileInputRef.current?.click()}
            disabled={isUploadingGallery || images.length >= maxImages}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#234B36] hover:bg-[#2D5E43] active:bg-[#1A3828] text-white text-xs font-bold transition shadow-xs disabled:opacity-50 self-start sm:self-auto"
          >
            {isUploadingGallery ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading Photos…
              </>
            ) : (
              <>
                <FolderUp className="w-3.5 h-3.5" /> Upload from Computer
              </>
            )}
          </button>
        </div>

        {/* Hidden Multi-file Input */}
        <input
          ref={galleryFileInputRef}
          id="gallery-file-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={handleGalleryFilesChange}
          className="hidden"
          disabled={isUploadingGallery}
        />

        {/* Multi-Photo Drag & Drop Dropzone + URL input together */}
        {images.length < maxImages && (
          <div className="space-y-2.5">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingGallery(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingGallery(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingGallery(false);
                if (e.dataTransfer.files) {
                  processGalleryFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => {
                if (!isUploadingGallery) galleryFileInputRef.current?.click();
              }}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer text-center ${
                isDraggingGallery
                  ? 'border-[#234B36] bg-[#EEF3EF] scale-[0.99]'
                  : 'border-[#D1D9D4] bg-[#FDFCF7] hover:bg-[#F8F5ED] hover:border-[#234B36]'
              }`}
            >
              {isUploadingGallery ? (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <Loader2 className="w-7 h-7 animate-spin text-[#234B36]" />
                  <p className="text-sm font-bold text-[#252923]">Uploading gallery photos…</p>
                  <p className="text-xs text-[#73776F]">Adding images to your property gallery</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EEF3EF] text-[#234B36] flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="text-center sm:text-left">
                    <p className="text-xs sm:text-sm font-bold text-[#252923]">
                      <span className="text-[#234B36] underline underline-offset-2">Select photos from your device</span>{' '}
                      or drag & drop them here
                    </p>
                    <p className="text-[11px] text-[#73776F] mt-0.5">
                      Select multiple photos at once (up to 10 photos per upload, max 10MB each)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Direct URL input bar for gallery right below dropzone */}
            <div className="p-3 rounded-xl bg-[#F8F5ED]/70 border border-[#E5E0D5] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#73776F]">
                <span className="flex items-center gap-1">
                  <Link2 className="w-3.5 h-3.5 text-[#234B36]" /> Or enter image URL(s) to add to gallery:
                </span>
                <span className="text-[11px] font-normal text-[#73776F]">
                  (separated by commas or spaces)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={galleryUrlInput}
                  onChange={(e) => {
                    setGalleryUrlInput(e.target.value);
                    if (galleryUrlError) setGalleryUrlError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGalleryByUrl();
                    }
                  }}
                  placeholder="https://example.com/bedroom.jpg, https://example.com/salon.jpg"
                  className="w-full px-3 py-2 rounded-lg border border-[#E5E0D5] bg-white text-xs font-medium text-[#252923] placeholder:text-[#73776F] focus:outline-none focus:ring-2 focus:ring-[#234B36]/20 focus:border-[#234B36]"
                />
                <button
                  type="button"
                  onClick={() => handleAddGalleryByUrl()}
                  disabled={!galleryUrlInput.trim() || images.length >= maxImages}
                  className="px-3.5 py-2 rounded-lg bg-[#234B36] hover:bg-[#2D5E43] text-white text-xs font-bold transition disabled:opacity-50 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 inline mr-1" /> Add URL
                </button>
              </div>
              {galleryUrlError && <p className="text-xs text-red-600 font-semibold">{galleryUrlError}</p>}
            </div>
          </div>
        )}

        {/* Gallery Thumbnails Grid */}
        {images.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#F8F5ED]/50 border border-[#E5E0D5] text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#EEF3EF] text-[#234B36] flex items-center justify-center mx-auto">
              <ImageIcon className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-[#252923]">No additional gallery photos yet</p>
            <p className="text-xs text-[#73776F] max-w-sm mx-auto">
              Listings with at least 5 photos receive significantly more guest inquiries and bookings.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => galleryFileInputRef.current?.click()}
                disabled={isUploadingGallery}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[#E5E0D5] hover:bg-[#F8F5ED] text-xs font-bold text-[#234B36] transition shadow-2xs"
              >
                <FolderUp className="w-3.5 h-3.5" /> Browse Photos from Device
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

                  {/* Order Index Badge */}
                  <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                    #{idx + 1}
                  </div>

                  {/* Deleting Overlay */}
                  {isDeletingThis && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white text-xs font-bold gap-1.5 z-10">
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Removing…</span>
                    </div>
                  )}

                  {/* Hover Action Controls */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 flex items-center justify-between gap-1 opacity-95 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    {/* Reorder Left / Right */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveGalleryImage(idx, idx - 1)}
                        disabled={idx === 0 || isDeletingThis}
                        title="Move photo earlier"
                        aria-label={`Move photo ${idx + 1} earlier`}
                        className="w-6 h-6 rounded bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveGalleryImage(idx, idx + 1)}
                        disabled={idx === images.length - 1 || isDeletingThis}
                        title="Move photo later"
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
                        title="Make this photo the Cover Photo"
                        className="px-1.5 py-1 rounded bg-amber-500/90 hover:bg-amber-500 text-white text-[10px] font-bold flex items-center gap-1 transition"
                      >
                        <Star className="w-3 h-3 fill-current" /> Cover
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(idx)}
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
