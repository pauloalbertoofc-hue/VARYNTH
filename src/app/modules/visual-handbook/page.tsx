"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Search } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import {
  visualCapabilities,
  visualWorkflows,
} from "@/lib/visual-core/studio-catalog";

const tutorials = [
  {
    id: "shader",
    title: "Criando um padrão procedural",
    steps: [
      "Abra Shader Forge.",
      "Escolha Ondas, Anéis ou Plasma.",
      "Ajuste escala, matiz e contraste.",
      "Exporte PNG ou o GLSL fixo compilado.",
    ],
    href: "/modules/shader-forge",
    limitation:
      "Os shaders são internos e seguros; edição de código arbitrário ainda não está disponível.",
  },
  {
    id: "bezier",
    title: "Criando uma curva Bézier",
    steps: [
      "Abra Vector Studio.",
      "Escolha Curva Bézier e adicione o objeto.",
      "Ajuste x, y, largura e altura no inspector.",
      "Exporte SVG ou abra no Image Studio.",
    ],
    href: "/modules/vector-studio",
    limitation:
      "A curva é parametrizada pelo enquadramento; edição individual de nós e booleanos ainda não está disponível. Formas e círculos também aceitam gradientes lineares e arraste direto no canvas.",
  },
  {
    id: "rendering-3d",
    title: "Renderizando uma cena 3D",
    steps: [
      "Abra 3D & Rendering Studio.",
      "Ajuste as rotações X/Y e o zoom.",
      "Escolha Sólido, Xadrez ou Bandas, defina a cor e confirme o diagnóstico WebGL2.",
      "Exporte a cena renderizada em PNG.",
    ],
    href: "/modules/rendering-3d",
    limitation:
      "O corte usa um cubo indexado, luz direcional e materiais procedurais; iluminação física, importação de malhas e materiais PBR ainda não estão disponíveis.",
  },
  {
    id: "mathematical-art",
    title: "Gerando arte matemática",
    steps: [
      "Abra Mathematical Art Studio.",
      "Escolha Mandelbrot ou Julia.",
      "Ajuste iterações, zoom e, em Julia, os valores de C.",
      "Exporte o fractal em PNG.",
    ],
    href: "/modules/mathematical-art",
    limitation:
      "A renderização é CPU local e determinística; aceleração GPU, paletas avançadas e composição de múltiplas fórmulas ainda não estão disponíveis.",
  },
  {
    id: "texture-material",
    title: "Criando uma textura procedural",
    steps: [
      "Abra Texture & Material Lab.",
      "Escolha Xadrez, Anéis ou Ruído.",
      "Ajuste escala, rugosidade, metallic, normal e cor base.",
      "Exporte o preview PNG ou o descriptor JSON versionado.",
    ],
    href: "/modules/texture-material",
    limitation:
      "O corte gera preview CPU e descriptor; PBR físico, mapas reais e exportação direta para Game Studio ainda não estão disponíveis.",
  },
  {
    id: "code-graphics",
    title: "Criando um gráfico por documento",
    steps: [
      "Abra Code Graphics Studio.",
      "Edite o documento JSON usando rect, circle, line ou text.",
      "Observe o preview SVG e corrija o JSON se o diagnóstico aparecer.",
      "Exporte o SVG, abra uma cópia rasterizável ou abra as formas e textos como camadas editáveis no Image Studio.",
    ],
    href: "/modules/code-graphics",
    limitation:
      "A execução de JavaScript, TypeScript e GLSL arbitrários ainda não está disponível; o estúdio usa apenas o contrato declarativo seguro.",
  },
  {
    id: "scientific-imaging",
    title: "Medindo uma imagem",
    steps: [
      "Abra Scientific Imaging.",
      "Carregue uma imagem local.",
      "Leia a luminância média, desvio, clipping, alfa e histograma.",
      "Exporte o relatório JSON versionado.",
    ],
    href: "/modules/scientific-imaging",
    limitation:
      "As métricas são técnicas e locais; segmentação, calibração e diagnóstico científico especializado ainda não estão disponíveis.",
  },
  {
    id: "cinematic-lighting",
    title: "Aplicando iluminação cinematográfica",
    steps: [
      "Abra Cinematic Lighting Studio e carregue uma imagem local.",
      "Escolha Natural, Cinematic, Noir ou Golden Glow.",
      "Refine exposição, contraste, temperatura, matiz e vinheta.",
      "Exporte PNG ou a receita JSON para reabrir os mesmos parâmetros; também é possível enviar o resultado ao Image Studio.",
    ],
    href: "/modules/cinematic-lighting",
    limitation:
      "O processamento é local e determinístico; LUTs ICC, profundidade e iluminação 3D ainda não estão disponíveis.",
  },
  {
    id: "retouch",
    title: "Ajustando uma imagem com segurança",
    steps: [
      "Abra Retouch Studio.",
      "Carregue uma imagem local.",
      "Escolha Natural, Editorial, Noir ou Clean e refine brilho, contraste e saturação observando o preview; qualquer ajuste manual passa a Personalizado.",
      "Use Clone Stamp ou Healing Brush: clique no canvas para o destino e Shift+clique para a origem; ajuste raio e opacidade.",
      "Exporte PNG ou abra a cópia no Image Studio.",
    ],
    href: "/modules/retouch",
    limitation:
      "O módulo preserva o buffer original; remoção de objetos e reconstrução generativa ainda não estão disponíveis.",
  },
  {
    id: "procedural-graph",
    title: "Validando um grafo procedural",
    steps: [
      "Abra Procedural Node Studio.",
      "Edite nós e conexões no documento JSON.",
      "Observe a validação de nós desconhecidos e ciclos.",
      "Use o preview por nó e a cor final calculada.",
      "Abra o resultado avaliado no Image Studio ou exporte o grafo versionado.",
    ],
    href: "/modules/procedural-graph",
    limitation:
      "O corte atual avalia cores determinísticas, mostra previews dos nós alcançados e encaminha um PNG ao Image Studio; execução incremental e subgrafos ainda não estão disponíveis.",
  },
];

export default function VisualHandbookPage() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();
  const capabilities = useMemo(
    () =>
      visualCapabilities.filter(
        (item) =>
          !normalized ||
          `${item.name} ${item.description} ${item.workflow}`
            .toLowerCase()
            .includes(normalized),
      ),
    [normalized],
  );
  const visibleTutorials = tutorials.filter(
    (tutorial) =>
      !normalized ||
      `${tutorial.title} ${tutorial.steps.join(" ")} ${tutorial.limitation}`
        .toLowerCase()
        .includes(normalized),
  );
  return (
    <PageLayout
      title="Visual Handbook"
      subtitle="Documentação contextual do ecossistema visual e seus limites operacionais"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vly-text-muted)]"
            size={16}
          />
          <input
            aria-label="Buscar no Visual Handbook"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar Camera, provenance, graph..."
            className="vly-field w-full rounded-xl py-3 pl-10 pr-4 text-sm"
          />
        </div>
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visualWorkflows.map((workflow) => (
            <article
              key={workflow.id}
              className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4"
            >
              <BookOpen size={18} className="text-[var(--vly-accent)]" />
              <h2 className="mt-3 text-sm font-bold text-[var(--vly-text-primary)]">
                {workflow.name}
              </h2>
              <p className="mt-2 text-xs leading-5 text-[var(--vly-text-secondary)]">
                {workflow.description}
              </p>
            </article>
          ))}
        </section>
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--vly-accent)]">
              Pictor
            </p>
            <h2 className="mt-1 text-sm font-bold text-[var(--vly-text-primary)]">
              Leve uma dúvida contextual para o agente visual
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--vly-text-muted)]">
              O Pictor recebe texto, métricas locais e um resumo filtrado da
              captura. Ele não acessa blobs, arquivos ou ferramentas e mantém as
              consultas sob seu controle.
            </p>
          </div>
          <Link
            href="/modules/visual-studio"
            className="vly-interactive inline-flex items-center rounded-lg bg-[var(--vly-accent)] px-3 py-2 text-xs font-bold text-[var(--vly-accent-contrast)]"
          >
            Abrir consulta do Pictor <ArrowRight size={13} className="ml-2" />
          </Link>
        </section>
        <section className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
          <h2 className="text-sm font-bold text-[var(--vly-text-primary)]">
            Tutoriais operacionais ({visibleTutorials.length})
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {visibleTutorials.map((tutorial) => (
              <article
                key={tutorial.id}
                className="rounded-xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] p-4"
              >
                <h3 className="text-sm font-bold text-[var(--vly-text-primary)]">
                  {tutorial.title}
                </h3>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs leading-5 text-[var(--vly-text-secondary)]">
                  {tutorial.steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
                <p className="mt-3 text-[10px] text-amber-200">
                  Limitação: {tutorial.limitation}
                </p>
                <Link
                  href={tutorial.href}
                  className="mt-3 inline-flex items-center text-xs font-bold text-[var(--vly-accent)]"
                >
                  Abrir módulo <ArrowRight size={13} className="ml-1" />
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-panel)] p-4">
          <h2 className="text-sm font-bold text-[var(--vly-text-primary)]">
            Capacidades indexadas ({capabilities.length})
          </h2>
          <div className="mt-3 divide-y divide-[var(--vly-border-subtle)]">
            {capabilities.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-xs font-bold text-[var(--vly-text-primary)]">
                    {item.name}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--vly-text-muted)]">
                    {item.evidence}
                  </p>
                </div>
                {item.href ? (
                  <Link
                    href={item.href}
                    className="text-xs font-bold text-[var(--vly-accent)]"
                  >
                    Abrir →
                  </Link>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-[var(--vly-text-muted)]">
                    {item.status}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageLayout>
  );
}
