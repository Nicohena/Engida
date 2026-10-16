/**
 * PhotoEditor — canvas-based circular crop editor.
 *
 * Features:
 *  - Drag to reposition image
 *  - Pinch / mouse-wheel zoom
 *  - Rotate-left / rotate-right buttons + fine-tune slider
 *  - Zoom slider
 *  - Reset adjustments
 *  - Returns a square PNG blob via onSave(blob)
 */
import {
  useRef,
  useState,
  useCallback,
  useEffect,
  MouseEvent,
  TouchEvent,
  WheelEvent,
} from "react";
import { RotateCcw, RotateCw, ZoomIn, ZoomOut, RefreshCcw } from "lucide-react";

const CANVAS_SIZE = 320; // output square in pixels
const DISPLAY = 300;     // visible circle diameter in the UI

interface Pos { x: number; y: number }

interface Props {
  src: string;            // object URL of the selected image
  onSave: (blob: Blob) => void;
  onCancel: () => void;
  saving: boolean;
}

export function PhotoEditor({ src, onSave, onCancel, saving }: Props) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [scale, setScale] = useState(1);
  const [rotate, setRotate] = useState(0); // degrees
  const [offset, setOffset] = useState<Pos>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mouse: Pos; offset: Pos }>({ mouse: { x: 0, y: 0 }, offset: { x: 0, y: 0 } });
  const lastDistRef = useRef<number | null>(null);

  // ── Load image & calculate initial scale to fill the circle ──────────────
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const initScale = CANVAS_SIZE / minDim;
      setScale(initScale);
      setOffset({ x: 0, y: 0 });
      setRotate(0);
    };
    img.src = src;
  }, [src]);

  // ── Redraw preview whenever state changes ─────────────────────────────────
  useEffect(() => {
    const canvas = previewRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const S = canvas.width; // CANVAS_SIZE
    ctx.clearRect(0, 0, S, S);

    ctx.save();
    ctx.translate(S / 2 + offset.x, S / 2 + offset.y);
    ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }, [scale, rotate, offset, src]);

  // ── Drag handlers (mouse) ─────────────────────────────────────────────────
  function onMouseDown(e: MouseEvent<HTMLCanvasElement>) {
    setDragging(true);
    dragStart.current = { mouse: { x: e.clientX, y: e.clientY }, offset: { ...offset } };
  }
  function onMouseMove(e: MouseEvent<HTMLCanvasElement>) {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.offset.x + (e.clientX - dragStart.current.mouse.x),
      y: dragStart.current.offset.y + (e.clientY - dragStart.current.mouse.y),
    });
  }
  function onMouseUp() { setDragging(false); }

  // ── Drag handlers (touch) ─────────────────────────────────────────────────
  function onTouchStart(e: TouchEvent<HTMLCanvasElement>) {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      setDragging(true);
      dragStart.current = { mouse: { x: t.clientX, y: t.clientY }, offset: { ...offset } };
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastDistRef.current = Math.hypot(dx, dy);
    }
  }
  function onTouchMove(e: TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (e.touches.length === 1 && dragging) {
      const t = e.touches[0];
      setOffset({
        x: dragStart.current.offset.x + (t.clientX - dragStart.current.mouse.x),
        y: dragStart.current.offset.y + (t.clientY - dragStart.current.mouse.y),
      });
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      if (lastDistRef.current !== null) {
        const delta = dist / lastDistRef.current;
        setScale((s) => Math.min(5, Math.max(0.2, s * delta)));
      }
      lastDistRef.current = dist;
    }
  }
  function onTouchEnd() { setDragging(false); lastDistRef.current = null; }

  // ── Scroll to zoom ────────────────────────────────────────────────────────
  function onWheel(e: WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setScale((s) => Math.min(5, Math.max(0.2, s + delta)));
  }

  function reset() {
    const img = imgRef.current;
    if (!img) return;
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    setScale(CANVAS_SIZE / minDim);
    setOffset({ x: 0, y: 0 });
    setRotate(0);
  }

  // ── Export the canvas as a Blob and hand back to parent ───────────────────
  const handleSave = useCallback(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) onSave(blob);
    }, "image/png");
  }, [onSave]);

  return (
    <div className="flex flex-col items-center gap-5 p-1">
      {/* ── Canvas with circular clip mask overlay ── */}
      <div
        className="relative select-none"
        style={{ width: DISPLAY, height: DISPLAY }}
      >
        {/* Hidden canvas renders at CANVAS_SIZE; we scale it visually */}
        <canvas
          ref={previewRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onWheel={onWheel as any}
          style={{
            width: DISPLAY,
            height: DISPLAY,
            cursor: dragging ? "grabbing" : "grab",
            borderRadius: "50%",
            overflow: "hidden",
            display: "block",
          }}
        />
        {/* Ring indicator */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-primary"
        />
      </div>

      <p className="text-xs text-slate-500 -mt-2 text-center">
        Drag to reposition · Scroll or pinch to zoom
      </p>

      {/* ── Controls ── */}
      <div className="w-full space-y-4 px-2">
        {/* Zoom */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setScale((s) => Math.max(0.2, s - 0.1))} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100" aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
          <input
            type="range"
            min={0.2}
            max={5}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-label="Zoom level"
          />
          <button type="button" onClick={() => setScale((s) => Math.min(5, s + 0.1))} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100" aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Rotate */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setRotate((r) => r - 90)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100" aria-label="Rotate left 90°">
            <RotateCcw size={16} />
          </button>
          <input
            type="range"
            min={-180}
            max={180}
            step={1}
            value={rotate}
            onChange={(e) => setRotate(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-label="Rotation degrees"
          />
          <button type="button" onClick={() => setRotate((r) => r + 90)} className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100" aria-label="Rotate right 90°">
            <RotateCw size={16} />
          </button>
        </div>

        {/* Reset */}
        <button
          type="button"
          onClick={reset}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCcw size={13} /> Reset adjustments
        </button>
      </div>

      {/* ── Action buttons ── */}
      <div className="flex w-full gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-2xl bg-primary py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-[#134E4A] disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save photo"}
        </button>
      </div>
    </div>
  );
}
