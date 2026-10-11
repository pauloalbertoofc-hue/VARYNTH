import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

const files = {
  css: read("app/globals.css"),
  sidebar: read("components/layout/Sidebar.tsx"),
  navbar: read("components/layout/Navbar.tsx"),
  athena: read("components/athena/AthenaSidecar.tsx"),
  studioShell: read("components/studio/StudioShell.tsx"),
  quickCreate: read("components/ui/QuickCreateModal.tsx"),
  vault: read("app/modules/vault/page.tsx"),
  scratchpad: read("components/widgets/ScratchpadWidget.tsx"),
};

const failures: string[] = [];
const assert = (condition: boolean, message: string) => {
  if (!condition) failures.push(message);
};

// Structural checks for keyboard and touch-safe interaction contracts.
assert(files.sidebar.includes("min-h-[44px]") && files.navbar.includes("touch-manipulation"), "shell não garante alvo touch de 44px");
assert(files.css.includes("prefers-reduced-motion"), "reduced motion não está coberto");
assert(files.sidebar.includes('aria-label="Navegação principal"'), "Sidebar não expõe landmark de navegação");
assert(files.navbar.includes('aria-label="Abrir menu de navegação"'), "Navbar não rotula o controle do menu mobile");
assert(files.athena.includes('aria-label="Abrir Athena"'), "Athena não expõe nome acessível no launcher");
assert(files.studioShell.includes("aria-label"), "StudioShell não expõe landmark acessível");
assert(files.quickCreate.includes("max-h-[90dvh]"), "modal não usa viewport dinâmico para mobile");
assert(files.vault.includes('aria-label="Buscar na Vault"'), "busca da Vault não possui nome acessível");
assert(files.scratchpad.includes('aria-label="Rascunho rápido"'), "Scratchpad não possui nome acessível");

// New semantic primitives should use tokenized motion, not broad transitions.
assert(read("components/ui/Surface.tsx").includes("vly-interactive") || read("components/ui/Surface.tsx").includes("var(--vly-"), "Surface não usa tokens semânticos");
assert(read("components/ui/StatePanel.tsx").includes("var(--vly-"), "StatePanel não usa tokens semânticos");

if (failures.length) {
  console.error("Experience quality gate falhou:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Experience quality gate passed: teclado, touch, landmarks, viewport dinâmico e motion semântico.");
}
