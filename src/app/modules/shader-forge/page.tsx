"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, ShieldCheck } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";

const STORAGE_KEY = "varynth_shader_forge_v2";
const VERTEX_SOURCE = `#version 300 es
in vec2 position; out vec2 uv;
void main(){ uv=position*.5+.5; gl_Position=vec4(position,0.,1.); }`;
const FRAGMENT_SOURCE = `#version 300 es
precision highp float; in vec2 uv; out vec4 outColor;
uniform float uScale; uniform float uHue; uniform float uContrast; uniform float uTime; uniform float uPattern;
vec3 hueShift(vec3 c,float h){float a=h*6.2831853,s=sin(a),co=cos(a);mat3 r=mat3(.213+co*.787-s*.213,.715-co*.715-s*.715,.072-co*.072+s*.928,.213-co*.213+s*.143,.715+co*.285+s*.140,.072-co*.072-s*.283,.213-co*.213-s*.787,.715-co*.715+s*.715,.072+co*.928+s*.072);return clamp(r*c,0.,1.);}
void main(){vec2 p=(uv-.5)*vec2(1.7777778,1.);float s=max(uScale,.1);float w=sin(p.x*s*4.+cos(p.y*s*3.+uTime*.15))*.5+.5;float r=sin(length(p)*s*5.-uTime*.1)*.5+.5;float plasma=sin(p.x*s*2.+sin(p.y*s*4.))+sin(p.y*s*3.+cos(p.x*s*5.));float v=uPattern<.5?w:uPattern<1.5?r:plasma*.25+.5;v=clamp((v-.5)*uContrast+.5,0.,1.);outColor=vec4(hueShift(vec3(v,v*.7+.15,1.-v*.75),uHue),1.);}`;

type Pattern = "waves" | "rings" | "plasma";
type Parameters = { scale: number; hue: number; contrast: number; pattern: Pattern };

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Não foi possível criar o shader.");
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(shader) ?? "diagnóstico indisponível"; gl.deleteShader(shader); throw new Error(log); }
  return shader;
}

function renderFallback(canvas: HTMLCanvasElement, p: Parameters) {
  const context = canvas.getContext("2d"); if (!context) return;
  const image = context.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
    const wave = Math.sin(x / (p.scale * 4) + Math.cos(y / (p.scale * 3))) * .5 + .5;
    const ring = Math.sin(Math.hypot(x - canvas.width / 2, y - canvas.height / 2) / p.scale) * .5 + .5;
    const value = Math.max(0, Math.min(1, (wave * .65 + ring * .35 - .5) * p.contrast + .5));
    const i = (y * canvas.width + x) * 4; image.data[i] = value * 255; image.data[i + 1] = ((value + p.hue / 360) % 1) * 180; image.data[i + 2] = (1 - value) * 220 + 35; image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}

export default function ShaderForgePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [params, setParams] = useState<Parameters>({ scale: 7, hue: 42, contrast: 1.2, pattern: "waves" });
  const [diagnostic, setDiagnostic] = useState("WebGL2 ativo; uniforms locais conectados.");
  const render = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const gl = canvas.getContext("webgl2");
    if (!gl) { renderFallback(canvas, params); setDiagnostic("WebGL2 indisponível; fallback 2D determinístico ativo."); return; }
    try {
      const program = gl.createProgram(); if (!program) throw new Error("Não foi possível criar o programa WebGL2.");
      gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE)); gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE)); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Falha ao vincular o programa.");
      const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW); gl.useProgram(program);
      const position = gl.getAttribLocation(program, "position"); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(gl.getUniformLocation(program, "uScale"), params.scale); gl.uniform1f(gl.getUniformLocation(program, "uHue"), params.hue / 360); gl.uniform1f(gl.getUniformLocation(program, "uContrast"), params.contrast); gl.uniform1f(gl.getUniformLocation(program, "uTime"), 0); gl.uniform1f(gl.getUniformLocation(program, "uPattern"), params.pattern === "waves" ? 0 : params.pattern === "rings" ? 1 : 2); gl.viewport(0, 0, canvas.width, canvas.height); gl.drawArrays(gl.TRIANGLES, 0, 6);
      setDiagnostic("WebGL2 ativo; compilação e renderização concluídas."); gl.deleteProgram(program); gl.deleteBuffer(buffer);
    } catch (error) { renderFallback(canvas, params); setDiagnostic(`Falha de compilação; fallback 2D ativo: ${error instanceof Error ? error.message : "erro desconhecido"}`); }
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(params)); } catch { /* armazenamento local é opcional */ }
  }, [params]);
  useEffect(() => { try { const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Parameters> | null; if (saved) setParams((current) => ({ ...current, ...saved })); } catch { /* rascunho inválido é ignorado */ } }, []);
  useEffect(() => { render(); }, [render]);
  const update = <K extends keyof Parameters>(key: K, value: Parameters[K]) => setParams((current) => ({ ...current, [key]: value }));
  const download = () => { const canvas = canvasRef.current; if (!canvas) return; const link = document.createElement("a"); link.download = "varynth-shader.png"; link.href = canvas.toDataURL("image/png"); link.click(); };
  return <PageLayout title="Shader Forge" subtitle="Pipeline WebGL2 local, determinístico e sem execução arbitrária"><div className="mx-auto max-w-6xl space-y-4"><div className="flex flex-wrap items-center gap-4 rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4"><label className="text-xs text-[var(--vly-text-secondary)]">Padrão <select aria-label="Padrão procedural" value={params.pattern} onChange={(event) => update("pattern", event.target.value as Pattern)} className="vly-field ml-2 rounded-lg px-2 py-1"><option value="waves">Ondas</option><option value="rings">Anéis</option><option value="plasma">Plasma</option></select></label><label className="text-xs text-[var(--vly-text-secondary)]">Escala <input aria-label="Escala do shader" type="range" min="2" max="24" value={params.scale} onChange={(event) => update("scale", Number(event.target.value))} /></label><label className="text-xs text-[var(--vly-text-secondary)]">Matiz <input aria-label="Matiz do shader" type="range" min="0" max="359" value={params.hue} onChange={(event) => update("hue", Number(event.target.value))} /></label><label className="text-xs text-[var(--vly-text-secondary)]">Contraste <input aria-label="Contraste do shader" type="range" min="0.5" max="2" step="0.1" value={params.contrast} onChange={(event) => update("contrast", Number(event.target.value))} /></label><button onClick={download} className="vly-interactive inline-flex items-center rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"><Download size={14} className="mr-2" />Exportar PNG</button></div><div className="overflow-hidden rounded-2xl border border-[var(--vly-border-subtle)] bg-black"><canvas ref={canvasRef} width={960} height={540} className="block h-auto w-full" aria-label="Preview WebGL2 do Shader Forge" /></div><div className="flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-xs text-emerald-200"><ShieldCheck size={16} className="mt-0.5 shrink-0" /><span>{diagnostic} O código do shader é interno e fixo; o editor não executa entrada arbitrária do usuário.</span></div></div></PageLayout>;
}
