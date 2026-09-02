"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/layout/PageLayout";
import { useVarynthStore } from "@/lib/store/useVarynthStore";
import { artifactStore } from "@/lib/artifacts/artifact-store";
import { GraphNode, GraphEdge, GraphNodeType } from "@/lib/types";
import {
  Share2,
  Sparkles,
  Layers,
  Search,
  Filter,
  Maximize2,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  X,
  FolderKanban,
  BookOpen,
  Scale,
  GraduationCap,
  Trophy,
  Users,
  Code2,
  FlaskConical,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DependencyInspectorModal } from "@/components/studio/common/DependencyInspectorModal";
import { Artifact } from "@/lib/artifacts/types";

const TYPE_CONFIG: Record<GraphNodeType, { label: string; color: string; bg: string }> = {
  project: { label: "Projetos", color: "#38bdf8", bg: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
  artifact: { label: "Artefatos", color: "#ec4899", bg: "bg-pink-500/20 text-pink-300 border-pink-500/40" },
  vault: { label: "Vault", color: "#a855f7", bg: "bg-purple-500/20 text-purple-300 border-purple-500/40" },
  codex: { label: "Codex (Teses)", color: "#06b6d4", bg: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
  research: { label: "Evidências", color: "#10b981", bg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  opportunity: { label: "Editais", color: "#eab308", bg: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" },
  person: { label: "Pessoas", color: "#34d399", bg: "bg-teal-500/20 text-teal-300 border-teal-500/40" },
  lab: { label: "Labs", color: "#f59e0b", bg: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  forge: { label: "Forge (Código)", color: "#f97316", bg: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
};

export default function GraphPage() {
  const {
    projects,
    vaultItems,
    theses,
    evidences,
    opportunities,
    people,
    labItems,
    forgeFiles,
  } = useVarynthStore();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterType, setFilterType] = useState<string>("todos");
  const [search, setSearch] = useState("");
  const [inspectingArtifact, setInspectingArtifact] = useState<Artifact | null>(null);

  // Build Nodes and Edges from Store
  const { initialNodes, edges } = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edgeList: GraphEdge[] = [];

    // Projects
    projects.forEach((p, idx) => {
      nodes.push({
        id: `p-${p.id}`,
        label: p.title,
        type: "project",
        color: "#38bdf8",
        radius: 18,
        x: 400 + Math.cos(idx) * 180,
        y: 300 + Math.sin(idx) * 180,
        vx: 0,
        vy: 0,
        entityId: p.id,
        link: `/projects/${p.id}`,
        subtitle: `Workspace (${p.category})`,
        description: p.description,
        tags: p.tags,
      });
    });

    // Vault
    vaultItems.forEach((v, idx) => {
      const node: GraphNode = {
        id: `v-${v.id}`,
        label: v.title,
        type: "vault",
        color: "#a855f7",
        radius: 12,
        x: 400 + Math.cos(idx * 1.5 + 1) * 280,
        y: 300 + Math.sin(idx * 1.5 + 1) * 280,
        vx: 0,
        vy: 0,
        entityId: v.id,
        link: "/modules/vault",
        subtitle: `Vault [${v.type.toUpperCase()}] · ${v.author || v.category}`,
        description: v.notes,
        tags: v.tags,
      };
      nodes.push(node);

      if (v.relatedProjectIds) {
        v.relatedProjectIds.forEach((pId) => {
          edgeList.push({ source: node.id, target: `p-${pId}`, label: "conhecimento" });
        });
      }
    });

    // Theses
    theses.forEach((t, idx) => {
      const node: GraphNode = {
        id: `t-${t.id}`,
        label: t.title,
        type: "codex",
        color: "#06b6d4",
        radius: 15,
        x: 400 + Math.cos(idx * 2 + 2) * 220,
        y: 300 + Math.sin(idx * 2 + 2) * 220,
        vx: 0,
        vy: 0,
        entityId: t.id,
        link: "/modules/codex",
        subtitle: `Tese Arena (${t.area})`,
        description: t.question,
        tags: t.tags,
      };
      nodes.push(node);

      // Link thesis with IA project
      edgeList.push({ source: node.id, target: "p-proj-pesquisa-ia", label: "fundamentação" });
    });

    // Evidences
    evidences.forEach((e, idx) => {
      const node: GraphNode = {
        id: `e-${e.id}`,
        label: e.claim,
        type: "research",
        color: "#10b981",
        radius: 11,
        x: 400 + Math.cos(idx * 2.5 + 3) * 320,
        y: 300 + Math.sin(idx * 2.5 + 3) * 320,
        vx: 0,
        vy: 0,
        entityId: e.id,
        link: "/modules/research",
        subtitle: `Evidência [${e.strength.toUpperCase()}] · ${e.source}`,
        description: `"${e.quote}"`,
        tags: e.tags,
      };
      nodes.push(node);
      edgeList.push({ source: node.id, target: "p-proj-pesquisa-ia", label: "probatório" });
    });

    // Opportunities
    opportunities.forEach((o, idx) => {
      const node: GraphNode = {
        id: `o-${o.id}`,
        label: o.title,
        type: "opportunity",
        color: "#eab308",
        radius: 13,
        x: 400 + Math.cos(idx * 3 + 4) * 250,
        y: 300 + Math.sin(idx * 3 + 4) * 250,
        vx: 0,
        vy: 0,
        entityId: o.id,
        link: "/modules/opportunities",
        subtitle: `Edital (${o.institution})`,
        description: o.prizeOrGrant ? `Prêmio/Bolsa: ${o.prizeOrGrant}` : "Edital de fomento",
      };
      nodes.push(node);
      if (o.relatedProjectId) {
        edgeList.push({ source: node.id, target: `p-${o.relatedProjectId}`, label: "chamada" });
      }
    });

    // People
    people.forEach((p, idx) => {
      const node: GraphNode = {
        id: `pe-${p.id}`,
        label: p.name,
        type: "person",
        color: "#34d399",
        radius: 13,
        x: 400 + Math.cos(idx * 3.5 + 5) * 260,
        y: 300 + Math.sin(idx * 3.5 + 5) * 260,
        vx: 0,
        vy: 0,
        entityId: p.id,
        link: "/modules/people",
        subtitle: `${p.role} (${p.organization || "Equipe"})`,
        description: p.notes,
        tags: p.tags,
      };
      nodes.push(node);
      p.projectPermissions.forEach((perm) => {
        edgeList.push({ source: node.id, target: `p-${perm.projectId}`, label: "colaborador" });
      });
    });

    // Labs
    labItems.forEach((l, idx) => {
      const node: GraphNode = {
        id: `l-${l.id}`,
        label: l.title,
        type: "lab",
        color: "#f59e0b",
        radius: 12,
        x: 400 + Math.cos(idx * 4 + 1) * 310,
        y: 300 + Math.sin(idx * 4 + 1) * 310,
        vx: 0,
        vy: 0,
        entityId: l.id,
        link: "/modules/labs",
        subtitle: `Labs (${l.stage.toUpperCase()})`,
        description: l.description,
        tags: l.tags,
      };
      nodes.push(node);
      edgeList.push({ source: node.id, target: "p-proj-varynth", label: "incubação" });
    });

    // Forge Files
    forgeFiles.forEach((f, idx) => {
      const node: GraphNode = {
        id: `f-${f.id}`,
        label: f.name,
        type: "forge",
        color: "#f97316",
        radius: 11,
        x: 400 + Math.cos(idx * 4.5 + 2) * 290,
        y: 300 + Math.sin(idx * 4.5 + 2) * 290,
        vx: 0,
        vy: 0,
        entityId: f.id,
        link: "/modules/forge",
        subtitle: `Forge Script (${f.language.toUpperCase()})`,
      };
      nodes.push(node);
      if (f.projectId) {
        edgeList.push({ source: node.id, target: `p-${f.projectId}`, label: "código" });
      }
    });

    // Universal Artifacts & Relationships
    const artifacts = artifactStore.getAll();
    artifacts.forEach((art, idx) => {
      const node: GraphNode = {
        id: `art-${art.id}`,
        label: art.name,
        type: "artifact",
        color: "#ec4899",
        radius: 14,
        x: 400 + Math.cos(idx * 1.8 + 2.5) * 230,
        y: 300 + Math.sin(idx * 1.8 + 2.5) * 230,
        vx: 0,
        vy: 0,
        entityId: art.id,
        link: "/modules/technical-archive",
        subtitle: `Artefato [${art.type}] · v${art.currentVersionNumber || 1}.0`,
        description: art.description,
        tags: art.tags,
      };
      nodes.push(node);

      // Link to Project if associated
      if (art.projectId) {
        edgeList.push({ source: node.id, target: `p-${art.projectId}`, label: "pertence" });
      }

      // Link Relationships (SOURCE_OF, DERIVED_FROM, DEPENDS_ON, etc.)
      if (art.relationships && art.relationships.length > 0) {
        art.relationships.forEach((rel) => {
          edgeList.push({
            source: node.id,
            target: `art-${rel.targetArtifactId}`,
            label: rel.type.toLowerCase().replace("_", " "),
          });
        });
      }
    });

    return { initialNodes: nodes, edges: edgeList };
  }, [projects, vaultItems, theses, evidences, opportunities, people, labItems, forgeFiles]);

  const nodesRef = useRef<GraphNode[]>(initialNodes);
  const draggedNodeRef = useRef<GraphNode | null>(null);
  const isSleepingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number>(0);

  const wakePhysics = () => {
    isSleepingRef.current = false;
  };

  useEffect(() => {
    nodesRef.current = initialNodes;
    wakePhysics();
  }, [initialNodes, filterType, search]);

  // Canvas Physics & Render Loop with Sleep/Wake Battery Optimization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const nodes = nodesRef.current;
      const filteredNodes = nodes.filter((n) => {
        const matchesType = filterType === "todos" || n.type === filterType;
        const matchesSearch = !search || n.label.toLowerCase().includes(search.toLowerCase());
        return matchesType && matchesSearch;
      });

      const activeIds = new Set(filteredNodes.map((n) => n.id));

      // 1. Particle Physics (Forces) - Only calculate if active
      let totalKineticEnergy = 0;

      if (!isSleepingRef.current) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        for (let i = 0; i < filteredNodes.length; i++) {
          const nodeA = filteredNodes[i];
          if (nodeA === draggedNodeRef.current) continue;

          // Center gravity
          nodeA.vx += (centerX - nodeA.x) * 0.0004;
          nodeA.vy += (centerY - nodeA.y) * 0.0004;

          // Repulsion between nodes
          for (let j = i + 1; j < filteredNodes.length; j++) {
            const nodeB = filteredNodes[j];
            const dx = nodeB.x - nodeA.x;
            const dy = nodeB.y - nodeA.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            if (dist < 220) {
              const force = ((220 - dist) / dist) * 0.05;
              nodeA.vx -= dx * force;
              nodeA.vy -= dy * force;
              nodeB.vx += dx * force;
              nodeB.vy += dy * force;
            }
          }

          // Apply velocity with damping
          nodeA.vx *= 0.85;
          nodeA.vy *= 0.85;
          nodeA.x += nodeA.vx;
          nodeA.y += nodeA.vy;

          // Keep in bounds
          nodeA.x = Math.max(30, Math.min(canvas.width - 30, nodeA.x));
          nodeA.y = Math.max(30, Math.min(canvas.height - 30, nodeA.y));

          totalKineticEnergy += Math.abs(nodeA.vx) + Math.abs(nodeA.vy);
        }

        // Put physics to sleep if stable and not actively dragging
        if (totalKineticEnergy < 0.005 && !draggedNodeRef.current) {
          isSleepingRef.current = true;
        }
      }

      // 2. Draw Edges
      edges.forEach((edge) => {
        if (!activeIds.has(edge.source) || !activeIds.has(edge.target)) return;
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        if (sourceNode && targetNode) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.strokeStyle = "rgba(75, 85, 99, 0.25)";
          ctx.lineWidth = 1;
          ctx.stroke();

          // Draw glowing pulse on link
          const midX = (sourceNode.x + targetNode.x) / 2;
          const midY = (sourceNode.y + targetNode.y) / 2;
          ctx.fillStyle = "rgba(168, 85, 247, 0.4)";
          ctx.fillRect(midX - 1, midY - 1, 2, 2);
        }
      });

      // 3. Draw Nodes
      filteredNodes.forEach((node) => {
        const isHovered = selectedNode?.id === node.id;

        // Outer Glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + (isHovered ? 6 : 2), 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? node.color + "55" : node.color + "15";
        ctx.fill();

        // Node Circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = "#0f0f1a";
        ctx.fill();
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.strokeStyle = node.color;
        ctx.stroke();

        // Inner Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 0.35, 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();

        // Label
        ctx.font = "10px sans-serif";
        ctx.fillStyle = isHovered ? "#ffffff" : "#94a3b8";
        ctx.textAlign = "center";
        const shortLabel = node.label.length > 20 ? node.label.slice(0, 18) + "..." : node.label;
        ctx.fillText(shortLabel, node.x, node.y + node.radius + 12);
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [edges, filterType, search, selectedNode]);

  // Unified Pointer Handlers for Mouse, Touch, and Pen
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    wakePhysics();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);

    const hit = nodesRef.current.find((n) => {
      const dx = n.x - clickX;
      const dy = n.y - clickY;
      return Math.sqrt(dx * dx + dy * dy) <= n.radius + 8;
    });

    if (hit) {
      draggedNodeRef.current = hit;
      setSelectedNode(hit);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        // ignore capture error
      }
    } else {
      setSelectedNode(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggedNodeRef.current) return;
    wakePhysics();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    draggedNodeRef.current.x = mouseX;
    draggedNodeRef.current.y = mouseY;
    draggedNodeRef.current.vx = 0;
    draggedNodeRef.current.vy = 0;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current = null;
      wakePhysics();
    }
    try {
      if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
        canvasRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLCanvasElement>) => {
    draggedNodeRef.current = null;
    wakePhysics();
    try {
      if (canvasRef.current?.hasPointerCapture(e.pointerId)) {
        canvasRef.current.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
  };

  const handleResetLayout = () => {
    wakePhysics();
    nodesRef.current = initialNodes.map((n, idx) => ({
      ...n,
      x: 400 + Math.cos(idx) * 200,
      y: 300 + Math.sin(idx) * 200,
      vx: 0,
      vy: 0,
    }));
  };

  return (
    <PageLayout title="Graph Epistêmico" subtitle="Visualizador de rede de conexões do VARYNTH OS">
      <div className="space-y-4 max-w-7xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 glow-accent">
                <Share2 size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Rede Epistêmica do VARYNTH
                <Sparkles size={16} className="text-cyan-400" />
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Mapa visual de todas as relações entre Projetos, Teses da Argument Arena, Obras do Vault, Evidências e Editais.
            </p>
          </div>

          <button
            onClick={handleResetLayout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-[#0f0f1a] hover:bg-[#14141f] border border-[#1e1e30] transition-all"
            title="Repor física dos nós"
          >
            <RotateCcw size={13} />
            <span>Resetar Layout</span>
          </button>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 bg-[#0f0f1a] rounded-xl border border-[#1e1e30]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar nós na rede..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#0a0a0f] border border-[#1e1e30] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setFilterType("todos")}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap",
                filterType === "todos" ? "bg-cyan-600/30 text-cyan-300 border border-cyan-500/40" : "text-slate-400 hover:text-white"
              )}
            >
              Todos ({initialNodes.length})
            </button>
            {Object.entries(TYPE_CONFIG).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={cn(
                  "px-2 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap border",
                  filterType === key ? val.bg : "bg-transparent border-transparent text-slate-400 hover:text-white"
                )}
              >
                {val.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Visualizer Area */}
        <div className="relative h-[600px] rounded-2xl bg-[#08080d] border border-[#1e1e30] overflow-hidden clip-corner shadow-2xl">
          <canvas
            ref={canvasRef}
            width={1200}
            height={700}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            style={{ touchAction: "none" }}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />

          {/* Node Inspector Drawer */}
          {selectedNode && (
            <div className="absolute top-4 right-4 z-20 w-80 p-5 rounded-xl bg-[#0f0f1a]/95 backdrop-blur-md border border-[#2d2d4a] shadow-2xl space-y-3 clip-corner animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="text-[10px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider"
                  style={{ borderColor: selectedNode.color, color: selectedNode.color }}
                >
                  {TYPE_CONFIG[selectedNode.type]?.label || selectedNode.type}
                </span>

                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-slate-500 hover:text-slate-300"
                >
                  <X size={14} />
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">{selectedNode.label}</h3>
                {selectedNode.subtitle && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedNode.subtitle}</p>
                )}
              </div>

              {selectedNode.description && (
                <p className="text-xs text-slate-300 bg-[#0a0a0f] p-3 rounded-lg border border-[#1e1e30] leading-relaxed">
                  {selectedNode.description}
                </p>
              )}

              {selectedNode.tags && selectedNode.tags.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  {selectedNode.tags.map((t) => (
                    <span key={t} className="text-[9px] px-1.5 py-0.2 rounded bg-[#14141f] text-slate-400">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {selectedNode.type === "artifact" && (
                <button
                  onClick={() => {
                    const art = artifactStore.getById(selectedNode.entityId);
                    if (art) setInspectingArtifact(art);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 transition-all"
                >
                  <Sparkles size={13} />
                  <span>Inspecionar Dependências & Grafo</span>
                </button>
              )}

              {selectedNode.link && (
                <Link
                  href={selectedNode.link}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition-all glow-accent"
                >
                  <span>Abrir no VARYNTH</span>
                  <ArrowRight size={13} />
                </Link>
              )}
            </div>
          )}

          {inspectingArtifact && (
            <DependencyInspectorModal
              artifact={inspectingArtifact}
              onClose={() => setInspectingArtifact(null)}
              onUpdate={() => {
                const refreshed = artifactStore.getById(inspectingArtifact.id);
                if (refreshed) setInspectingArtifact(refreshed);
              }}
            />
          )}

          {/* Quick Helper Legend */}
          <div className="absolute bottom-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-[#0a0a0f]/80 border border-[#1e1e30] text-[10px] text-slate-500 flex items-center gap-3">
            <span>🖱️ Arraste nós para reorganizar</span>
            <span>🎯 Clique no nó para inspecionar</span>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

