import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), "utf8");
const files = (relative: string) => fs.readdirSync(path.join(root, relative), { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => entry.name);
const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(`DOC-REGRESSION: ${message}`);
};

const routes = fs.existsSync(path.join(root, "src/app"))
  ? (function walk(dir: string): string[] { return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : entry.name === "route.ts" ? [path.join(dir, entry.name)] : []); })(path.join(root, "src/app"))
  : [];
const registry = read("src/lib/athena/tools/registry.ts");
const agents = read("src/lib/athena/agents/registry.ts");
const moduleSource = read("src/lib/modules.ts");
const toolCount = (registry.match(/^\s+name:\s+"/gm) || []).length;
const agentCount = (agents.match(/this\.register\(/g) || []).length;
const moduleCount = (moduleSource.match(/^\s+id:\s+"/gm) || []).length;
const architecture = read("docs/architecture/overview.md");
const tools = read("docs/athena/tools.md");
const council = read("docs/athena/agents.md");
const readme = read("README.md");

assert(routes.length === 33, `número de route handlers mudou (${routes.length}); revise a auditoria/documentação`);
assert(toolCount === 36, `número de ferramentas mudou (${toolCount}); revise docs/athena/tools.md`);
assert(agentCount === 12, `número de agentes registrados mudou (${agentCount}); revise docs/athena/agents.md`);
assert(moduleCount === 18, `número de módulos registrados mudou (${moduleCount}); revise docs/varynth/modules.md`);
assert(readme.includes("Next.js 16") && !readme.includes("Next.js 15"), "README contém versão antiga do Next.js");
assert(architecture.includes("33 route handlers") && architecture.includes("36 ferramentas") && architecture.includes("12 agentes"), "overview não contém os números atuais");
assert(tools.includes("36") && tools.includes("registry.ts"), "catálogo de ferramentas não referencia o registro real");
assert(council.includes("12") && council.includes("registry.ts"), "documentação de agentes não referencia o registro real");
assert(files("docs/adr").some((file) => file.startsWith("ADR-043-")), "ADR-043 não está presente");
assert(fs.existsSync(path.join(root, "CHANGELOG.md")), "CHANGELOG.md não está presente");
assert(fs.existsSync(path.join(root, "docs/development/traceability-matrix.md")), "matriz de rastreabilidade não está presente");
assert(read("docs/development/traceability-matrix.md").includes("PermissionPolicyEngine"), "matriz não cobre a fronteira de autoridade");
for (const required of ["PermissionPolicyEngine", "MemoryGate", "SANDBOX", "anti-replay", "Definition of Done"]) {
  assert(read("docs/README.md").includes(required) || read("docs/architecture/security-model.md").includes(required) || read("README.md").includes(required), `princípio crítico ausente: ${required}`);
}
console.log(`Documentation regression gate passed: ${routes.length} routes, ${toolCount} tools, ${agentCount} agents, ${moduleCount} modules.`);
