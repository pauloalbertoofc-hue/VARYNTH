"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { perspectiveMatrix } from "@/lib/visual-core/rendering-3d";

type Scene = { rotationX: number; rotationY: number; zoom: number; color: string; material: "solid" | "checker" | "bands"; renderMode: "solid" | "wireframe" };
const STORAGE_KEY = "varynth_rendering_3d_v1";

const vertexSource = `#version 300 es
in vec3 position; uniform mat4 matrix; out vec3 surfacePosition; void main(){ surfacePosition=position; gl_Position=matrix*vec4(position,1.0); }`;
const fragmentSource = `#version 300 es
precision highp float; uniform vec3 color; uniform int materialMode; in vec3 surfacePosition; out vec4 outColor; void main(){ vec3 normal=normalize(cross(dFdx(surfacePosition),dFdy(surfacePosition))); vec3 light=normalize(vec3(-.45,.75,1.)); float diffuse=.28+.72*max(dot(normal,light),0.); float pattern=materialMode==1 ? mod(floor(gl_FragCoord.x/24.)+floor(gl_FragCoord.y/24.),2.) : materialMode==2 ? step(.5,fract(gl_FragCoord.y/36.)) : 0.; vec3 material=color*(pattern>.5 ? .45 : 1.); outColor=vec4(material*diffuse,1.0); }`;

const vertices = new Float32Array([
  -1,-1,-1, 1,-1,-1, 1,1,-1, -1,1,-1, -1,-1,1, 1,-1,1, 1,1,1, -1,1,1,
]);
const indices = new Uint16Array([0,1,2,0,2,3, 4,6,5,4,7,6, 0,4,5,0,5,1, 3,2,6,3,6,7, 1,5,6,1,6,2, 0,3,7,0,7,4]);

function shader(gl: WebGL2RenderingContext, type: number, source: string) {
  const value = gl.createShader(type); if (!value) throw new Error("shader allocation failed");
  gl.shaderSource(value, source); gl.compileShader(value);
  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value) ?? "shader compilation failed");
  return value;
}

export default function Rendering3DPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<Scene>({ rotationX: 25, rotationY: 35, zoom: 1, color: "#7dd3fc", material: "solid", renderMode: "solid" });
  const [diagnostic, setDiagnostic] = useState("Cena 3D local pronta para renderização.");

  useEffect(() => { try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Scene> | null; if (saved) setScene((current) => ({ ...current, ...saved })); } catch { /* draft inválido é ignorado */ } }, []);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scene)); const canvas = canvasRef.current; if (!canvas) return; const gl = canvas.getContext("webgl2");
    if (!gl) { setDiagnostic("WebGL2 indisponível neste dispositivo; a cena 3D requer um contexto compatível."); return; }
    try { const program = gl.createProgram(); if (!program) throw new Error("program allocation failed"); gl.attachShader(program, shader(gl, gl.VERTEX_SHADER, vertexSource)); gl.attachShader(program, shader(gl, gl.FRAGMENT_SHADER, fragmentSource)); gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
      const position = gl.createBuffer(), element = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, position); gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, element); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW); gl.useProgram(program); const attribute = gl.getAttribLocation(program, "position"); gl.enableVertexAttribArray(attribute); gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 0, 0); gl.uniformMatrix4fv(gl.getUniformLocation(program, "matrix"), false, perspectiveMatrix(scene, canvas.width / canvas.height)); const hex = scene.color.replace("#", ""); gl.uniform3f(gl.getUniformLocation(program, "color"), parseInt(hex.slice(0,2), 16)/255, parseInt(hex.slice(2,4), 16)/255, parseInt(hex.slice(4,6), 16)/255); gl.uniform1i(gl.getUniformLocation(program, "materialMode"), scene.material === "solid" ? 0 : scene.material === "checker" ? 1 : 2); gl.enable(gl.DEPTH_TEST); gl.viewport(0, 0, canvas.width, canvas.height); gl.clearColor(.02,.03,.06,1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.drawElements(scene.renderMode === "wireframe" ? gl.LINES : gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0); setDiagnostic(`WebGL2 ativo; malha, câmera perspectiva, ${scene.renderMode === "wireframe" ? "wireframe" : "material procedural e luz direcional"} renderizados localmente.`); gl.deleteBuffer(position); gl.deleteBuffer(element); gl.deleteProgram(program);
    } catch (error) { setDiagnostic(`Falha na renderização 3D: ${error instanceof Error ? error.message : "erro desconhecido"}`); }
  }, [scene]);
  const update = <K extends keyof Scene>(key: K, value: Scene[K]) => setScene((current) => ({ ...current, [key]: value }));
  const download = () => { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement("a"); link.download = "varynth-rendering-3d.png"; link.href = canvas.toDataURL("image/png"); link.click(); };
  return <PageLayout title="3D & Rendering Studio" subtitle="Cena WebGL2 local com câmera, material e exportação"><div className="mx-auto max-w-6xl space-y-4"><div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4"><label className="text-xs text-[var(--vly-text-secondary)]">Rotação X <input aria-label="Rotação X" type="range" min="-180" max="180" value={scene.rotationX} onChange={(event) => update("rotationX", Number(event.target.value))} /></label><label className="text-xs text-[var(--vly-text-secondary)]">Rotação Y <input aria-label="Rotação Y" type="range" min="-180" max="180" value={scene.rotationY} onChange={(event) => update("rotationY", Number(event.target.value))} /></label><label className="text-xs text-[var(--vly-text-secondary)]">Zoom <input aria-label="Zoom" type="range" min="0.6" max="1.5" step="0.05" value={scene.zoom} onChange={(event) => update("zoom", Number(event.target.value))} /></label><label className="text-xs text-[var(--vly-text-secondary)]">Material <select aria-label="Material procedural" value={scene.material} onChange={(event) => update("material", event.target.value as Scene["material"])} className="vly-field ml-2 rounded-lg px-2 py-1"><option value="solid">Sólido</option><option value="checker">Xadrez</option><option value="bands">Bandas</option></select></label><label className="text-xs text-[var(--vly-text-secondary)]">Renderização <select aria-label="Modo de renderização" value={scene.renderMode} onChange={(event) => update("renderMode", event.target.value as Scene["renderMode"])} className="vly-field ml-2 rounded-lg px-2 py-1"><option value="solid">Sólida</option><option value="wireframe">Wireframe</option></select></label><input aria-label="Cor do material" type="color" value={scene.color} onChange={(event) => update("color", event.target.value)} /><button onClick={download} className="vly-interactive inline-flex items-center rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"><Download size={14} className="mr-2" />Exportar PNG</button></div><div className="overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-black"><canvas ref={canvasRef} width={960} height={540} className="block h-auto w-full" aria-label="Cena 3D WebGL2" /></div><div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs text-emerald-200"><ShieldCheck size={16} className="mt-0.5 shrink-0" /><span>{diagnostic} A primeira etapa usa um cubo indexado, luz direcional, materiais procedurais e modo wireframe; iluminação física, importação de malhas e materiais PBR permanecem fora deste corte.</span></div></div></PageLayout>;
}
