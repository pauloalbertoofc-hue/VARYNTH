"use client";
import { useEffect, useState } from "react";
import {
  Check,
  ImagePlus,
  LoaderCircle,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  ACCENT_COLORS,
  DASHBOARD_SECTIONS,
  DEFAULT_PREFERENCES,
  NAVIGATION_ITEMS,
  parsePreferences,
  VAULT_SECTIONS,
  type NavigationHref,
  type PlatformPreferences,
} from "@/lib/customization/preferences";
import { Surface } from "@/components/ui/Surface";

const sectionLabels = {
  hero: "Boas-vindas e ações rápidas",
  metricProjects: "Indicador: projetos ativos",
  metricTasks: "Indicador: tarefas pendentes",
  metricCompleted: "Indicador: tarefas concluídas",
  metricVault: "Indicador: notas e Vault",
  priorityTasks: "Tarefas prioritárias",
  deadlines: "Prazos próximos",
  activeProjects: "Projetos em andamento",
  clock: "Relógio",
  focusTimer: "Timer de foco",
  scratchpad: "Bloco de notas rápido",
  activity: "Histórico de atividade",
  modules: "Catálogo de módulos",
} as const;
const vaultLabels = {
  header: "Título e descrição",
  metricTotal: "Contador: total de obras",
  metricReading: "Contador: lendo agora",
  metricCompleted: "Contador: concluídos / fichados",
  metricToRead: "Contador: para ler",
  athena: "Cartão de ações da Athena",
  categories: "Categorias literárias",
  sources: "Fontes da compilação",
  compilation: "Resultado da compilação",
  processing: "Processamentos",
  filters: "Busca e filtros",
  items: "Obras e cartões do Vault",
} as const;
async function prepareBackground(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha uma imagem.");
  if (file.size > 12 * 1024 * 1024)
    throw new Error("A imagem original deve ter até 12 MB.");
  const image = new Image();
  const source = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("Não foi possível abrir essa imagem."));
      image.src = source;
    });
    const scale = Math.min(
      1,
      1920 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.72, 0.62, 0.52]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= 480_000)
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(new Error("Não foi possível ler a imagem preparada."));
          reader.readAsDataURL(blob);
        });
    }
    throw new Error(
      "Essa imagem não pôde ser reduzida o suficiente. Tente uma imagem menor.",
    );
  } finally {
    URL.revokeObjectURL(source);
  }
}
export function EnvironmentPersonalization({
  account = false,
  allowedNavigation,
}: {
  account?: boolean;
  allowedNavigation?: readonly NavigationHref[];
}) {
  const [draft, setDraft] = useState<PlatformPreferences>(DEFAULT_PREFERENCES);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [canPublishDefault, setCanPublishDefault] = useState(false);
  useEffect(() => {
    fetch("/api/platform/preferences", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) return;
        const value = (await r.json()) as {
          preferences?: unknown;
          canPublishDefault?: boolean;
        };
        setDraft(parsePreferences(value.preferences || value));
        setCanPublishDefault(value.canPublishDefault === true);
      })
      .catch(() =>
        setMessage("Não foi possível carregar as preferências atuais."),
      );
  }, []);
  function update<K extends keyof PlatformPreferences>(
    key: K,
    value: PlatformPreferences[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        account ? "/api/account/preferences" : "/api/platform/preferences",
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(draft),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível salvar.");
      setDraft(parsePreferences(result));
      window.dispatchEvent(new Event("varynth-preferences-updated"));
      setMessage(
        account
          ? "Sua personalização foi salva. Ela aparece somente na sua conta."
          : "Preferências salvas. Elas serão aplicadas ao navegar pela plataforma.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível salvar.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function publishDefault() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/platform/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível publicar o padrão.");
      setMessage(
        "Seu tema atual foi definido como padrão público para novas contas.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível publicar o padrão.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <Surface
        tone="panel"
        role="region"
        aria-labelledby="environment-personalization-title"
        className="p-5"
      >
        <div>
          <h2
            id="environment-personalization-title"
            className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]"
          >
            <Palette size={16} className="text-[var(--vly-accent)]" />{" "}
            {account
              ? "Sua personalização"
              : "Identidade visual padrão da plataforma"}
          </h2>
          <p className="mt-1 text-xs text-[var(--vly-text-muted)]">
            {account
              ? "Suas escolhas aparecem somente nesta conta. O padrão da plataforma continua definido pelo proprietário."
              : "Este é o padrão que novas contas recebem. Cada cliente pode aplicar uma preferência pessoal sem mudar este padrão."}
          </p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {!account && (
            <label className="text-xs font-semibold text-[var(--vly-text-secondary)]">
              Nome da plataforma
              <input
                value={draft.appName}
                maxLength={40}
                onChange={(e) => update("appName", e.target.value)}
                className="vly-field mt-1.5 min-h-10 w-full px-3 text-sm"
              />
            </label>
          )}
          <label className="text-xs font-semibold text-[var(--vly-text-secondary)]">
            Como quer ser chamado no dashboard
            <input
              value={draft.displayName}
              maxLength={60}
              onChange={(e) => update("displayName", e.target.value)}
              className="vly-field mt-1.5 min-h-10 w-full px-3 text-sm"
            />
          </label>
        </div>
        <fieldset className="mt-5">
          <legend className="text-xs font-semibold text-[var(--vly-text-secondary)]">
            Cor de destaque
          </legend>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {Object.entries(ACCENT_COLORS).map(([id, color]) => (
              <button
                key={id}
                type="button"
                aria-pressed={
                  draft.accentColor.toLowerCase() ===
                  color.values[2].toLowerCase()
                }
                onClick={() => update("accentColor", color.values[2])}
                className={`vly-interactive flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs font-semibold ${draft.accentColor.toLowerCase() === color.values[2].toLowerCase() ? "border-[var(--vly-border-accent)] bg-[var(--vly-surface-active)] text-[var(--vly-text-primary)]" : "border-[var(--vly-border-default)] text-[var(--vly-text-secondary)]"}`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: color.values[2] }}
                />
                {color.label}
              </button>
            ))}
            <label className="flex min-h-10 items-center gap-2 rounded-lg border border-[var(--vly-border-default)] px-3 text-xs font-semibold text-[var(--vly-text-secondary)]">
              Sua cor
              <input
                type="color"
                aria-label="Escolha qualquer cor de destaque"
                value={draft.accentColor}
                onChange={(e) => update("accentColor", e.target.value)}
                className="h-7 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </label>
          </div>
        </fieldset>
        <div className="mt-5 border-t border-[var(--vly-border-subtle)] pt-4">
          <p className="text-xs font-semibold text-[var(--vly-text-secondary)]">
            Imagem de fundo
          </p>
          <p className="mt-1 text-[11px] text-[var(--vly-text-muted)]">
            A imagem aparece atrás do conteúdo em todas as áreas. É ajustada
            para caber no armazenamento da sua conta.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {draft.backgroundImage && (
              <div
                className="h-16 w-28 rounded-lg border border-[var(--vly-border-default)] bg-cover bg-center"
                style={{ backgroundImage: `url(${draft.backgroundImage})` }}
              />
            )}
            <label className="vly-interactive inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-[var(--vly-border-accent)] px-3 text-xs font-bold text-[var(--vly-accent)] hover:bg-[var(--vly-accent)]/10">
              <ImagePlus size={14} />
              {draft.backgroundImage ? "Trocar imagem" : "Escolher imagem"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (file)
                    void prepareBackground(file)
                      .then((image) => {
                        update("backgroundImage", image);
                        setMessage(
                          "Prévia pronta. Salve para aplicar a imagem de fundo.",
                        );
                      })
                      .catch((error: unknown) =>
                        setMessage(
                          error instanceof Error
                            ? error.message
                            : "Não foi possível preparar a imagem.",
                        ),
                      );
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {draft.backgroundImage && (
              <button
                type="button"
                onClick={() => update("backgroundImage", null)}
                className="vly-interactive inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--vly-border-default)] px-3 text-xs text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
              >
                <Trash2 size={13} /> Remover fundo
              </button>
            )}
          </div>
        </div>
      </Surface>
      <Surface tone="panel" role="region" aria-labelledby="vault-personalization-title" className="p-5">
        <h2 id="vault-personalization-title" className="text-sm font-bold text-[var(--vly-text-primary)]">
          Informações do Vault
        </h2>
        <p className="mt-1 text-xs text-[var(--vly-text-muted)]">
          Escolha quais áreas da Biblioteca Viva aparecem. Ocultar uma área não
          apaga obras nem arquivos.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {VAULT_SECTIONS.map((section) => (
            <label
              key={section}
              className="vly-interactive flex min-h-11 cursor-pointer items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-3 text-xs text-[var(--vly-text-secondary)]"
            >
              {vaultLabels[section]}
              <input
                type="checkbox"
                checked={draft.vault[section]}
                onChange={(e) =>
                  update("vault", {
                    ...draft.vault,
                    [section]: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-[var(--vly-accent)]"
              />
            </label>
          ))}
        </div>
      </Surface>
      <Surface tone="panel" role="region" aria-labelledby="dashboard-personalization-title" className="p-5">
        <h2 id="dashboard-personalization-title" className="flex items-center gap-2 text-sm font-bold text-[var(--vly-text-primary)]">
          <SlidersHorizontal size={16} className="text-[var(--vly-info)]" /> O
          que aparece no dashboard
        </h2>
        <p className="mt-1 text-xs text-[var(--vly-text-muted)]">
          Oculte blocos que não usa. Seus dados continuam salvos e podem ser
          mostrados novamente.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {DASHBOARD_SECTIONS.map((section) => (
            <label
              key={section}
              className="vly-interactive flex min-h-11 cursor-pointer items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-3 text-xs text-[var(--vly-text-secondary)]"
            >
              {sectionLabels[section]}
              <input
                type="checkbox"
                checked={draft.dashboard[section]}
                onChange={(e) =>
                  update("dashboard", {
                    ...draft.dashboard,
                    [section]: e.target.checked,
                  })
                }
                className="h-4 w-4 accent-[var(--vly-accent)]"
              />
            </label>
          ))}
        </div>
      </Surface>
      <Surface tone="panel" role="region" aria-labelledby="navigation-personalization-title" className="p-5">
        <h2 id="navigation-personalization-title" className="text-sm font-bold text-[var(--vly-text-primary)]">
          Atalhos do menu lateral
        </h2>
        <p className="mt-1 text-xs text-[var(--vly-text-muted)]">
          Isso só oculta o atalho; nenhuma área ou dado é apagado. O Dashboard
          fica sempre acessível.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {NAVIGATION_ITEMS.filter(
            ([href]) => !allowedNavigation || allowedNavigation.includes(href),
          ).map(([href, label]) => (
            <label
              key={href}
              className="vly-interactive flex min-h-10 cursor-pointer items-center justify-between rounded-lg border border-[var(--vly-border-subtle)] bg-[var(--vly-surface-raised)] px-3 text-xs text-[var(--vly-text-secondary)]"
            >
              {label}
              <input
                type="checkbox"
                checked={!draft.hiddenNavigation.includes(href)}
                onChange={(e) =>
                  update(
                    "hiddenNavigation",
                    e.target.checked
                      ? draft.hiddenNavigation.filter((item) => item !== href)
                      : [...draft.hiddenNavigation, href],
                  )
                }
                className="h-4 w-4 accent-[var(--vly-accent)]"
              />
            </label>
          ))}
        </div>
      </Surface>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          aria-busy={busy}
          onClick={() => void save()}
          className="vly-interactive inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--vly-accent)] px-4 text-xs font-bold text-[var(--vly-accent-contrast)] hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}{" "}
          Salvar personalização
        </button>
        {account && canPublishDefault && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void publishDefault()}
            className="vly-interactive inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--vly-border-default)] bg-[var(--vly-info)]/10 px-3 text-xs font-bold text-[var(--vly-info)] hover:bg-[var(--vly-info)]/20 disabled:opacity-50"
          >
            <Check size={13} /> Tornar padrão público
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (!account) {
              setDraft(DEFAULT_PREFERENCES);
              setMessage(
                "Padrões restaurados no formulário. Salve para aplicar.",
              );
              return;
            }
            setBusy(true);
            fetch("/api/account/preferences", { method: "DELETE" })
              .then(async (response) => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error);
                setDraft(parsePreferences(result));
                window.dispatchEvent(new Event("varynth-preferences-updated"));
                setMessage("Você voltou ao padrão definido para a plataforma.");
              })
              .catch((error: unknown) =>
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível restaurar.",
                ),
              )
              .finally(() => setBusy(false));
          }}
          className="vly-interactive inline-flex min-h-10 items-center gap-2 rounded-lg border border-[var(--vly-border-default)] px-3 text-xs font-semibold text-[var(--vly-text-secondary)] hover:text-[var(--vly-text-primary)]"
        >
          <RotateCcw size={13} />{" "}
          {account ? "Usar padrão da plataforma" : "Restaurar padrões"}
        </button>
        {message && (
          <p role="status" className="text-xs text-[var(--vly-text-secondary)]">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
