"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { imageService } from "@/lib/studio/image/image-service";
import { cubicBezierPath } from "@/lib/visual-core/vector-geometry";
import { renderVectorSvg } from "@/lib/visual-core/vector-renderer";
const bezierPath = cubicBezierPath;

type VectorType = "rect" | "circle" | "text" | "bezier";
type VectorObject = {
  id: string;
  type: VectorType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  color2?: string;
  gradient?: boolean;
  text?: string;
};
const STORAGE_KEY = "varynth_vector_document_v1";
const initial: VectorObject[] = [
  {
    id: "background",
    type: "rect",
    x: 0,
    y: 0,
    width: 1200,
    height: 700,
    color: "#111827",
  },
];
const escapeXml = (value: string) =>
  value.replace(
    /[<>&'\"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character] ?? character,
  );
const paint = (item: VectorObject) =>
  item.gradient && (item.type === "rect" || item.type === "circle")
    ? `url(#gradient-${item.id})`
    : item.color;

export default function VectorStudioPage() {
  const [objects, setObjects] = useState<VectorObject[]>(initial);
  const [selectedId, setSelectedId] = useState("background");
  const [type, setType] = useState<VectorType>("rect");
  const [color, setColor] = useState("#f2c14e");
  const [color2, setColor2] = useState("#7c3aed");
  const [useGradient, setUseGradient] = useState(false);
  const [text, setText] = useState("VARYNTH");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [, setHistoryVersion] = useState(0);
  const undoStack = useRef<VectorObject[][]>([]);
  const redoStack = useRef<VectorObject[][]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    objectX: number;
    objectY: number;
  } | null>(null);
  const previousObjects = useRef<VectorObject[]>(initial);
  const historyAction = useRef(false);
  const selected = objects.find((item) => item.id === selectedId) ?? objects[0];

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as {
          objects?: VectorObject[];
          savedAt?: string;
        };
        if (Array.isArray(draft.objects) && draft.objects.length) {
          previousObjects.current = draft.objects;
          setObjects(draft.objects);
        }
        setSavedAt(draft.savedAt ?? null);
      }
    } catch {
      /* rascunho inválido é ignorado */
    } finally {
      setHydrated(true);
    }
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    const timestamp = new Date().toISOString();
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ objects, savedAt: timestamp }),
      );
      setSavedAt(timestamp);
    } catch {
      /* armazenamento opcional */
    }
  }, [objects, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (historyAction.current) {
      historyAction.current = false;
      previousObjects.current = objects;
      return;
    }
    if (previousObjects.current !== objects) {
      undoStack.current = [
        ...undoStack.current.slice(-49),
        previousObjects.current,
      ];
      redoStack.current = [];
      previousObjects.current = objects;
      setHistoryVersion((version) => version + 1);
    }
  }, [objects, hydrated]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z")
        return;
      event.preventDefault();
      const stack = event.shiftKey ? redoStack.current : undoStack.current;
      const target = stack.pop();
      if (!target) return;
      const current = objects;
      (event.shiftKey ? undoStack.current : redoStack.current).push(current);
      historyAction.current = true;
      setObjects(target);
      setHistoryVersion((version) => version + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [objects]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "y")
        return;
      event.preventDefault();
      const target = redoStack.current.pop();
      if (!target) return;
      undoStack.current.push(objects);
      historyAction.current = true;
      setObjects(target);
      setHistoryVersion((version) => version + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [objects]);

  const update = (field: "x" | "y" | "width" | "height", value: number) =>
    setObjects((items) =>
      items.map((item) =>
        item.id === selectedId
          ? { ...item, [field]: Math.max(1, value) }
          : item,
      ),
    );
  const updatePaint = (
    field: "color" | "color2" | "gradient",
    value: string | boolean,
  ) =>
    setObjects((items) =>
      items.map((item) =>
        item.id === selectedId ? { ...item, [field]: value } : item,
      ),
    );
  const pointInSvg = (event: React.PointerEvent<SVGElement>) => {
    const svgElement = svgRef.current;
    if (!svgElement) return { x: 0, y: 0 };
    const bounds = svgElement.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 1200,
      y: ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 700,
    };
  };
  const startDrag = (
    event: React.PointerEvent<SVGElement>,
    item: VectorObject,
  ) => {
    event.stopPropagation();
    const point = pointInSvg(event);
    dragRef.current = {
      id: item.id,
      startX: point.x,
      startY: point.y,
      objectX: item.x,
      objectY: item.y,
    };
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
    setSelectedId(item.id);
  };
  const moveDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = pointInSvg(event);
    setObjects((items) =>
      items.map((item) =>
        item.id === drag.id
          ? {
              ...item,
              x: drag.objectX + point.x - drag.startX,
              y: drag.objectY + point.y - drag.startY,
            }
          : item,
      ),
    );
  };
  const endDrag = () => {
    dragRef.current = null;
  };
  const add = () => {
    const id = `vector-${Date.now()}`;
    const index = objects.length;
    const item: VectorObject = {
      id,
      type,
      x: 120 + (index % 4) * 180,
      y: 100 + (index % 3) * 150,
      width: type === "circle" ? 140 : 260,
      height: type === "circle" ? 140 : 120,
      color,
      color2,
      gradient: useGradient && (type === "rect" || type === "circle"),
      ...(type === "text" ? { text } : {}),
    };
    setObjects((items) => [...items, item]);
    setSelectedId(id);
  };
  const remove = () => {
    if (selectedId === "background") return;
    setObjects((items) => items.filter((item) => item.id !== selectedId));
    setSelectedId("background");
  };
  const svg = useMemo(() => {
    return renderVectorSvg(objects);
  }, [objects]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.download = "varynth-vector.svg";
    link.href = url;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  const saveDraft = () => {
    const timestamp = new Date().toISOString();
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ objects, savedAt: timestamp }),
    );
    setSavedAt(timestamp);
  };
  const clearDraft = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setObjects(initial);
    setSelectedId("background");
    setSavedAt(null);
  };
  const openInImageStudio = async () => {
    setIsSending(true);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const result = await imageService.importImage({
      name: `vector-${Date.now()}.svg`,
      mimeType: "image/svg+xml",
      sizeBytes: blob.size,
      data: blob,
      actor: "USER",
      captureMetadata: { source: "FILE_IMPORT", generated: false },
    });
    setIsSending(false);
    if (result.success && result.image)
      window.location.href = `/modules/studio?studio=IMAGE&id=${encodeURIComponent(result.image.artifact.id)}`;
  };
  const undo = () => {
    const target = undoStack.current.pop();
    if (!target) return;
    redoStack.current.push(objects);
    historyAction.current = true;
    setObjects(target);
    setHistoryVersion((version) => version + 1);
  };
  const redo = () => {
    const target = redoStack.current.pop();
    if (!target) return;
    undoStack.current.push(objects);
    historyAction.current = true;
    setObjects(target);
    setHistoryVersion((version) => version + 1);
  };

  return (
    <PageLayout
      title="Vector Studio"
      subtitle="Objetos SVG editáveis e exportação local"
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-3">
          <select
            aria-label="Tipo do objeto vetorial"
            value={type}
            onChange={(event) => setType(event.target.value as VectorType)}
            className="vly-field rounded-lg px-3 py-2 text-xs font-semibold"
          >
            <option value="rect">Retângulo</option>
            <option value="circle">Círculo</option>
            <option value="bezier">Curva Bézier</option>
            <option value="text">Texto</option>
          </select>
          <input
            aria-label="Cor do objeto vetorial"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
          />
          <input
            aria-label="Segunda cor do gradiente"
            type="color"
            value={color2}
            onChange={(event) => setColor2(event.target.value)}
            disabled={!useGradient || (type !== "rect" && type !== "circle")}
          />
          <label className="text-xs text-[var(--vly-text-secondary)]">
            <input
              type="checkbox"
              checked={useGradient}
              onChange={(event) => setUseGradient(event.target.checked)}
              disabled={type !== "rect" && type !== "circle"}
              className="mr-1"
            />
            Gradiente
          </label>
          <input
            aria-label="Texto vetorial"
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={type !== "text"}
            className="vly-field rounded-lg px-3 py-2 text-xs disabled:opacity-40"
          />
          <button
            onClick={add}
            className="vly-interactive inline-flex items-center rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"
          >
            <Plus size={14} className="mr-2" />
            Adicionar
          </button>
          <button
            aria-label="Desfazer"
            title="Desfazer (Ctrl/Cmd+Z)"
            onClick={undo}
            disabled={!undoStack.current.length}
            className="vly-interactive inline-flex items-center rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)] disabled:opacity-40"
          >
            <Undo2 size={14} className="mr-2" />
            Desfazer
          </button>
          <button
            aria-label="Refazer"
            title="Refazer (Ctrl/Cmd+Y)"
            onClick={redo}
            disabled={!redoStack.current.length}
            className="vly-interactive inline-flex items-center rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)] disabled:opacity-40"
          >
            <Redo2 size={14} className="mr-2" />
            Refazer
          </button>
          <button
            onClick={saveDraft}
            className="vly-interactive rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)]"
          >
            Salvar local
          </button>
          <button
            onClick={clearDraft}
            className="vly-interactive rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)]"
          >
            Limpar
          </button>
          <button
            onClick={download}
            className="vly-interactive inline-flex items-center rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)]"
          >
            <Download size={14} className="mr-2" />
            Exportar SVG
          </button>
          <button
            onClick={() => void openInImageStudio()}
            disabled={isSending}
            className="vly-interactive rounded-lg border border-[var(--vly-border-strong)] px-3 py-2 text-xs font-bold text-[var(--vly-text-primary)] disabled:opacity-50"
          >
            {isSending ? "Abrindo..." : "Abrir no Image Studio"}
          </button>
        </div>
        {savedAt && (
          <p className="text-[11px] text-[var(--vly-text-muted)]">
            Rascunho salvo em {new Date(savedAt).toLocaleString()}.
          </p>
        )}
        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-black">
            <svg
              ref={svgRef}
              viewBox="0 0 1200 700"
              className="block h-auto w-full"
              role="img"
              aria-label="Canvas vetorial"
              onPointerMove={moveDrag}
              onPointerUp={endDrag}
            >
              {objects.map((item) => {
                const selectedStyle =
                  selectedId === item.id
                    ? { stroke: "#ffffff", strokeWidth: 4 }
                    : {};
                return item.type === "rect" ? (
                  <rect
                    key={item.id}
                    onPointerDown={(event) => startDrag(event, item)}
                    x={item.x}
                    y={item.y}
                    width={item.width}
                    height={item.height}
                    fill={paint(item)}
                    {...selectedStyle}
                  />
                ) : item.type === "circle" ? (
                  <circle
                    key={item.id}
                    onPointerDown={(event) => startDrag(event, item)}
                    cx={item.x + item.width / 2}
                    cy={item.y + item.height / 2}
                    r={Math.min(item.width, item.height) / 2}
                    fill={paint(item)}
                    {...selectedStyle}
                  />
                ) : item.type === "bezier" ? (
                  <path
                    key={item.id}
                    onPointerDown={(event) => startDrag(event, item)}
                    d={bezierPath(item)}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    {...selectedStyle}
                  />
                ) : (
                  <text
                    key={item.id}
                    onPointerDown={(event) => startDrag(event, item)}
                    x={item.x}
                    y={item.y + item.height / 2}
                    fill={item.color}
                    fontFamily="sans-serif"
                    fontSize={Math.max(18, item.height / 2)}
                    {...selectedStyle}
                  >
                    {item.text}
                  </text>
                );
              })}
            </svg>
          </div>
          <aside className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
            <h2 className="text-sm font-bold text-[var(--vly-text-primary)]">
              Inspector
            </h2>
            <p className="mt-1 text-[11px] text-[var(--vly-text-muted)]">
              Selecionado: {selected.type}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["x", "y", "width", "height"] as const).map((field) => (
                <label
                  key={field}
                  className="text-[10px] text-[var(--vly-text-muted)]"
                >
                  {field}
                  <input
                    type="number"
                    value={Math.round(selected[field])}
                    onChange={(event) =>
                      update(field, Number(event.target.value))
                    }
                    className="vly-field mt-1 w-full rounded-lg px-2 py-1 text-xs"
                  />
                </label>
              ))}
            </div>
            {(selected.type === "rect" || selected.type === "circle") && (
              <div className="mt-3 space-y-2 border-t border-[var(--vly-border-subtle)] pt-3">
                <label className="flex items-center justify-between text-[10px] text-[var(--vly-text-muted)]">
                  Cor 1
                  <input
                    aria-label="Cor 1 do objeto selecionado"
                    type="color"
                    value={selected.color}
                    onChange={(event) =>
                      updatePaint("color", event.target.value)
                    }
                  />
                </label>
                <label className="flex items-center justify-between text-[10px] text-[var(--vly-text-muted)]">
                  Cor 2
                  <input
                    aria-label="Cor 2 do objeto selecionado"
                    type="color"
                    value={selected.color2 ?? selected.color}
                    onChange={(event) =>
                      updatePaint("color2", event.target.value)
                    }
                  />
                </label>
                <label className="flex items-center gap-2 text-[10px] text-[var(--vly-text-muted)]">
                  <input
                    aria-label="Gradiente do objeto selecionado"
                    type="checkbox"
                    checked={Boolean(selected.gradient)}
                    onChange={(event) =>
                      updatePaint("gradient", event.target.checked)
                    }
                  />
                  Usar gradiente
                </label>
              </div>
            )}
            <button
              onClick={remove}
              disabled={selectedId === "background"}
              className="vly-interactive mt-4 inline-flex items-center rounded-lg border border-red-400/40 px-3 py-2 text-xs font-bold text-red-200 disabled:opacity-40"
            >
              <Trash2 size={14} className="mr-2" />
              Remover selecionado
            </button>
          </aside>
        </div>
        <p className="text-xs text-[var(--vly-text-muted)]">
          Editor local-first com formas, texto, arraste direto no canvas e
          curvas Bézier parametrizadas; edição individual de nós e booleanos
          avançados ainda não estão disponíveis.
        </p>
      </div>
    </PageLayout>
  );
}
