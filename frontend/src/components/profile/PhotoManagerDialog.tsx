/**
 * PhotoManagerDialog — orchestrates the full photo management workflow:
 *   Menu → Upload / Edit / Replace / Delete
 *   → PhotoEditor (for upload + edit + replace)
 *   → Confirm delete
 *   → Upload to backend → update AvatarContext
 */
import { useRef, useState, useCallback } from "react";
import { Camera, Upload, Pencil, RefreshCw, Trash2, X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { PhotoEditor } from "./PhotoEditor";
import { useAvatar, resolveAvatarUrl } from "../../context/AvatarContext";
import { api } from "../../lib/api";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

type Stage =
  | "menu"          // action selection dialog
  | "editor"        // photo editor open
  | "confirm-delete" // delete confirmation dialog
  | null;           // closed

interface Props {
  firstName: string;
  lastName: string;
}

export function PhotoManagerDialog({ firstName, lastName }: Props) {
  const { avatarUrl, setAvatarUrl, initials } = useAvatar();
  const [stage, setStage] = useState<Stage>(null);
  const [editorSrc, setEditorSrc] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Open native file picker ───────────────────────────────────────────────
  function pickFile() {
    setFileError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can be re-selected
    if (!file) return;

    if (!ALLOWED.includes(file.type)) {
      setFileError("Unsupported file type. Please select a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setFileError("Image is too large. Maximum allowed size is 5 MB.");
      return;
    }

    // Validate it really is an image by trying to decode it
    const fr = new FileReader();
    fr.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        // Revoke previous objectUrl
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        setEditorSrc(url);
        setStage("editor");
      };
      img.onerror = () => setFileError("The selected file could not be loaded as an image. It may be corrupted.");
      img.src = ev.target?.result as string;
    };
    fr.readAsDataURL(file);
  }

  // ── Edit existing photo ───────────────────────────────────────────────────
  function handleEditExisting() {
    if (!avatarUrl) return;
    setEditorSrc(avatarUrl);
    setStage("editor");
  }

  // ── Save blob → backend ───────────────────────────────────────────────────
  const handleEditorSave = useCallback(async (blob: Blob) => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("avatar", blob, "avatar.png");

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Upload failed.");
      }
      const { avatarUrl: newUrl } = await res.json();
      setAvatarUrl(resolveAvatarUrl(newUrl));

      // Clean up object URL
      if (objectUrl) { URL.revokeObjectURL(objectUrl); setObjectUrl(null); }

      setStage(null);
      showToast("success", "Profile photo updated successfully.");
    } catch (err: any) {
      showToast("error", err.message || "Upload failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [objectUrl, setAvatarUrl]);

  // ── Cancel editor ─────────────────────────────────────────────────────────
  function handleEditorCancel() {
    if (objectUrl) { URL.revokeObjectURL(objectUrl); setObjectUrl(null); }
    setEditorSrc(null);
    setStage(null);
  }

  // ── Delete photo ─────────────────────────────────────────────────────────
  async function handleConfirmDelete() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed.");
      setAvatarUrl(null);
      setStage(null);
      showToast("success", "Profile photo removed.");
    } catch (err: any) {
      showToast("error", err.message || "Delete failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function close() {
    if (objectUrl) { URL.revokeObjectURL(objectUrl); setObjectUrl(null); }
    setStage(null);
    setEditorSrc(null);
    setFileError(null);
  }

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Guest";

  return (
    <>
      {/* ── Hidden file input ── */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Toast ── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold shadow-xl transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <ShieldAlert size={16} />
          )}
          {toast.msg}
        </div>
      )}

      {/* ── Avatar button (always visible on Profile page) ── */}
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => { setFileError(null); setStage("menu"); }}
          aria-label="Manage profile photo"
          className="group relative block"
        >
          <AvatarCircle url={avatarUrl} initials={initials} size={96} />
          {/* Camera overlay */}
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">
            <Camera size={22} className="text-white" />
          </span>
        </button>
      </div>

      {/* ── Backdrop ── */}
      {stage !== null && (
        <div
          className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm"
          onClick={stage === "menu" ? close : undefined}
        />
      )}

      {/* ── MENU dialog ── */}
      {stage === "menu" && (
        <div
          role="dialog"
          aria-modal
          aria-label="Profile photo options"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Profile photo</h2>
                <p className="text-xs text-slate-500 mt-0.5">{displayName}</p>
              </div>
              <button onClick={close} aria-label="Close" className="rounded-full p-1.5 hover:bg-slate-100">
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            {/* Current avatar preview */}
            <div className="mb-5 flex justify-center">
              <AvatarCircle url={avatarUrl} initials={initials} size={88} />
            </div>

            {/* Validation error */}
            {fileError && (
              <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-800">
                <ShieldAlert size={15} className="mt-0.5 shrink-0 text-red-500" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2">
              <MenuBtn icon={<Upload size={16} />} label="Upload photo" onClick={pickFile} />
              {avatarUrl && (
                <>
                  <MenuBtn icon={<Pencil size={16} />} label="Edit photo" onClick={handleEditExisting} />
                  <MenuBtn icon={<RefreshCw size={16} />} label="Replace photo" onClick={pickFile} />
                  <MenuBtn
                    icon={<Trash2 size={16} className="text-red-500" />}
                    label="Remove photo"
                    onClick={() => setStage("confirm-delete")}
                    danger
                  />
                </>
              )}
              <button
                type="button"
                onClick={close}
                className="mt-1 w-full rounded-2xl border border-slate-200 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDITOR modal ── */}
      {stage === "editor" && editorSrc && (
        <div
          role="dialog"
          aria-modal
          aria-label="Photo editor"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900">Edit photo</h2>
              <button onClick={handleEditorCancel} aria-label="Close editor" className="rounded-full p-1.5 hover:bg-slate-100">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <PhotoEditor
              src={editorSrc}
              onSave={handleEditorSave}
              onCancel={handleEditorCancel}
              saving={saving}
            />
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM dialog ── */}
      {stage === "confirm-delete" && (
        <div
          role="alertdialog"
          aria-modal
          aria-label="Remove profile photo?"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900">Remove profile photo?</h2>
                <p className="text-xs text-slate-500 mt-0.5">Your avatar will return to the default icon.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setStage("menu")}
                disabled={saving}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="flex-1 rounded-2xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? "Removing…" : "Remove photo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Shared AvatarCircle sub-component ────────────────────────────────────────
export function AvatarCircle({
  url,
  initials,
  size,
}: {
  url: string | null;
  initials: string;
  size: number;
}) {
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-bold text-primary ring-2 ring-primary/20"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35) }}
    >
      {url ? (
        <img
          src={url}
          alt="Profile photo"
          className="h-full w-full rounded-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function MenuBtn({
  icon,
  label,
  onClick,
  danger = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
        danger
          ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100"
          : "border-slate-100 text-slate-800 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
