import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

const css = read("app/globals.css");
const sidebar = read("components/layout/Sidebar.tsx");
const navbar = read("components/layout/Navbar.tsx");
const surface = read("components/ui/Surface.tsx");
const statePanel = read("components/ui/StatePanel.tsx");

const requiredTokens = [
  "--vly-world",
  "--vly-surface",
  "--vly-surface-raised",
  "--vly-surface-floating",
  "--vly-border-default",
  "--vly-border-accent",
  "--vly-text-primary",
  "--vly-accent",
  "--vly-success",
  "--vly-warning",
  "--vly-danger",
  "--vly-shadow-floating",
  "--vly-motion-standard",
  "--vly-ease-standard",
  "--vly-z-drawer",
  "--vly-z-modal",
  "--vly-type-display",
  "--vly-type-page-title",
  "--vly-type-code",
  "--vly-icon-md",
  "--vly-target-min",
];

const failures: string[] = [];
const assert = (condition: boolean, message: string) => {
  if (!condition) failures.push(message);
};

const tokenHex = (token: string) => {
  const match = css.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`));
  return match?.[1] || null;
};
const luminance = (hex: string) => {
  const channels = [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};
const contrast = (foreground: string | null, background: string | null) => {
  if (!foreground || !background) return 0;
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

requiredTokens.forEach((token) => assert(css.includes(token), `token ausente: ${token}`));
assert(css.includes(":focus-visible"), "indicador global de foco ausente");
assert(css.includes("prefers-reduced-motion"), "fallback de reduced motion ausente");
assert(css.includes(".vly-interactive"), "primitive de interação ausente");
assert(css.includes(".vly-field"), "primitive de campo ausente");
assert(css.includes(".vly-motion-enter") && css.includes(".vly-motion-exit") && css.includes(".vly-motion-loading"), "estados de motion semânticos ausentes");
assert(sidebar.includes("--vly-world"), "Sidebar não usa world semântico");
assert(navbar.includes("--vly-surface-glass"), "Navbar não usa superfície glass semântica");
assert(surface.includes("tone"), "Surface não expõe hierarquia de tons");
assert(statePanel.includes("role={tone === \"error\" ? \"alert\" : \"status\"}"), "StatePanel não expõe semântica de status");
assert(contrast(tokenHex("--vly-text-primary"), tokenHex("--vly-world")) >= 4.5, "text-primary/world abaixo de 4.5:1");
assert(contrast(tokenHex("--vly-text-secondary"), tokenHex("--vly-world")) >= 4.5, "text-secondary/world abaixo de 4.5:1");
assert(contrast(tokenHex("--vly-text-muted"), tokenHex("--vly-world")) >= 4.5, "text-muted/world abaixo de 4.5:1");
assert(contrast(tokenHex("--vly-accent-contrast"), tokenHex("--vly-accent")) >= 4.5, "accent-contrast/accent abaixo de 4.5:1");

if (failures.length) {
  console.error("Design Language gate falhou:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Design Language gate passed: ${requiredTokens.length} tokens, foco, reduced motion, primitives e shell semântico.`);
}
