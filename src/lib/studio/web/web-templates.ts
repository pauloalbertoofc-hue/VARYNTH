import { WebFramework, WebFileItem } from "./types";

export interface WebTemplate {
  id: string;
  name: string;
  description: string;
  framework: WebFramework;
  category: "STARTER" | "APPLICATION" | "DOCUMENTATION" | "SHOWCASE";
  files: Omit<WebFileItem, "id" | "createdAt" | "updatedAt">[];
}

export const WEB_TEMPLATES: WebTemplate[] = [
  {
    id: "blank",
    name: "Blank HTML5 / CSS3 / JS",
    description: "Estrutura moderna limpa e minimalista pronta para qualquer protótipo web.",
    framework: "STATIC",
    category: "STARTER",
    files: [
      {
        path: "index.html",
        name: "index.html",
        language: "html",
        isEntry: true,
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo Projeto Web — VARYNTH OS</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <main class="container">
    <h1>VARYNTH Web Studio</h1>
    <p>Projeto web inicializado com sucesso no ambiente isolado e soberano.</p>
    <button id="btn-action">Clique para Interagir</button>
    <div id="output" class="output-box"></div>
  </main>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        name: "styles.css",
        language: "css",
        content: `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

body {
  background-color: #0b0b14;
  color: #e2e8f0;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
}

.container {
  max-width: 600px;
  width: 100%;
  background: #131322;
  border: 1px solid #232338;
  border-radius: 12px;
  padding: 2.5rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

h1 {
  font-size: 1.75rem;
  margin-bottom: 0.75rem;
  color: #3b82f6;
}

p {
  color: #94a3b8;
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

button {
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover {
  background: #1d4ed8;
}

.output-box {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #0d0d18;
  border-radius: 6px;
  border: 1px dashed #334155;
  font-family: monospace;
  font-size: 0.9rem;
  color: #38bdf8;
  min-height: 48px;
  display: flex;
  align-items: center;
}`,
      },
      {
        path: "app.js",
        name: "app.js",
        language: "javascript",
        content: `// VARYNTH Web Studio - Client Script
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btn-action");
  const output = document.getElementById("output");
  let count = 0;

  btn.addEventListener("click", () => {
    count++;
    output.textContent = \`Interação registrada! Contador de eventos: \${count}\`;
    console.log(\`[WebStudio Event] Clique registrado no botão (count: \${count})\`);
  });

  console.log("Aplicação Web isolada inicializada com sucesso no Web Studio.");
});`,
      },
    ],
  },
  {
    id: "landing-page",
    name: "Landing Page de Produto",
    description: "Página de apresentação com cabeçalho moderno, lista de recursos e chamada para ação.",
    framework: "STATIC",
    category: "SHOWCASE",
    files: [
      {
        path: "index.html",
        name: "index.html",
        language: "html",
        isEntry: true,
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VARYNTH Sovereign Cloud</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="navbar">
    <div class="logo">VARYNTH</div>
    <nav>
      <a href="#features">Recursos</a>
      <a href="#about">Arquitetura</a>
      <a href="#cta" class="nav-btn">Começar</a>
    </nav>
  </header>

  <section class="hero">
    <h1>Controle Soberano Sobre Seus Dados</h1>
    <p>A primeira suíte criativa e cognitiva 100% Local-First, sem dependência de nuvens proprietárias.</p>
    <div class="hero-actions">
      <button class="primary-btn">Criar Workspace</button>
      <button class="secondary-btn">Documentação</button>
    </div>
  </section>

  <section id="features" class="features-grid">
    <div class="card">
      <h3>Local-First</h3>
      <p>Seus dados permanecem nas suas mãos, em banco de dados indexado soberano.</p>
    </div>
    <div class="card">
      <h3>Athena Copilot</h3>
      <p>Inteligência cognitiva determinística integrada a cada estúdio criativo.</p>
    </div>
    <div class="card">
      <h3>Universal Artifacts</h3>
      <p>Versionamento imutável e proteção contra perda acidental de dados.</p>
    </div>
  </section>

  <footer class="footer">
    <p>&copy; 2026 VARYNTH OS. Todos os direitos soberanos preservados.</p>
  </footer>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        name: "styles.css",
        language: "css",
        content: `body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #090a10;
  color: #f1f5f9;
}
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 4rem;
  border-bottom: 1px solid #1e2030;
}
.logo { font-size: 1.4rem; font-weight: 800; color: #3b82f6; letter-spacing: 1px; }
nav a { color: #94a3b8; text-decoration: none; margin-left: 2rem; font-size: 0.95rem; }
.nav-btn { background: #2563eb; color: white !important; padding: 0.5rem 1.25rem; border-radius: 6px; }
.hero { text-align: center; padding: 6rem 2rem 4rem; max-width: 800px; margin: 0 auto; }
.hero h1 { font-size: 3rem; line-height: 1.2; margin-bottom: 1.5rem; }
.hero p { font-size: 1.2rem; color: #94a3b8; margin-bottom: 2.5rem; line-height: 1.6; }
.hero-actions { display: flex; gap: 1rem; justify-content: center; }
.primary-btn { background: #3b82f6; color: white; border: none; padding: 0.85rem 2rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
.secondary-btn { background: #1e2030; color: #cbd5e1; border: 1px solid #334155; padding: 0.85rem 2rem; border-radius: 8px; font-weight: 600; cursor: pointer; }
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 2rem; max-width: 1000px; margin: 4rem auto; padding: 0 2rem; }
.card { background: #111322; border: 1px solid #1e2238; border-radius: 12px; padding: 2rem; }
.card h3 { color: #60a5fa; margin-bottom: 0.75rem; }
.card p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
.footer { text-align: center; padding: 3rem; border-top: 1px solid #1a1c2c; color: #64748b; font-size: 0.85rem; }`,
      },
      {
        path: "app.js",
        name: "app.js",
        language: "javascript",
        content: `console.log("Landing page do produto inicializada com sucesso.");`,
      },
    ],
  },
  {
    id: "documentation-site",
    name: "Site de Documentação Técnica",
    description: "Layout de documentação com sumário lateral de navegação, busca e visualização de tópicos.",
    framework: "STATIC",
    category: "DOCUMENTATION",
    files: [
      {
        path: "index.html",
        name: "index.html",
        language: "html",
        isEntry: true,
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentação — VARYNTH OS</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">Manual Técnico</div>
      <ul class="nav-list">
        <li class="active"><a href="#intro">1. Introdução</a></li>
        <li><a href="#arch">2. Arquitetura Universal</a></li>
        <li><a href="#sandbox">3. Sandbox e Segurança</a></li>
        <li><a href="#versioning">4. Versionamento Imutável</a></li>
      </ul>
    </aside>
    <main class="content">
      <h1 id="intro">1. Introdução ao VARYNTH OS</h1>
      <p>O VARYNTH é um sistema operacional cognitivo soberano desenhado para criadores, pesquisadores e engenheiros.</p>
      
      <h2 id="arch">2. Arquitetura Universal</h2>
      <p>Toda produção digital é tratada como uma instância formal do modelo <code>Artifact</code>, desacoplando arquivos físicos, execuções e publicações.</p>
      
      <h2 id="sandbox">3. Sandbox e Segurança</h2>
      <p>O código web gerado opera em ambiente estritamente isolado sem qualquer permissão de acesso ao Core soberano.</p>
    </main>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        name: "styles.css",
        language: "css",
        content: `body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0c0d16; color: #e2e8f0; }
.layout { display: flex; min-height: 100vh; }
.sidebar { width: 260px; background: #111220; border-right: 1px solid #1e2034; padding: 2rem 1.5rem; }
.sidebar-header { font-weight: 800; font-size: 1.1rem; color: #3b82f6; margin-bottom: 2rem; }
.nav-list { list-style: none; padding: 0; margin: 0; }
.nav-list li { margin-bottom: 0.75rem; }
.nav-list a { color: #94a3b8; text-decoration: none; font-size: 0.9rem; transition: color 0.2s; }
.nav-list li.active a, .nav-list a:hover { color: #60a5fa; font-weight: 600; }
.content { flex: 1; padding: 3rem 4rem; max-width: 800px; line-height: 1.7; }
.content h1 { font-size: 2rem; color: white; margin-bottom: 1rem; }
.content h2 { font-size: 1.4rem; color: #93c5fd; margin-top: 2.5rem; margin-bottom: 0.75rem; }
.content p { color: #94a3b8; margin-bottom: 1.25rem; }
code { background: #1b1d30; padding: 0.2rem 0.4rem; border-radius: 4px; color: #38bdf8; font-family: monospace; font-size: 0.9em; }`,
      },
      {
        path: "app.js",
        name: "app.js",
        language: "javascript",
        content: `console.log("Site de documentação carregado.");`,
      },
    ],
  },
  {
    id: "dashboard",
    name: "Dashboard & Painel Interativo",
    description: "Painel administrativo com cards de indicadores, gráficos simples e tabela de dados.",
    framework: "VANILLA_JS",
    category: "APPLICATION",
    files: [
      {
        path: "index.html",
        name: "index.html",
        language: "html",
        isEntry: true,
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard Executivo</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="dashboard-container">
    <header class="dash-header">
      <h2>Painel de Métricas</h2>
      <span class="badge">Soberania 100%</span>
    </header>

    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-label">Artefatos Criados</span>
        <span class="stat-val" id="val-artifacts">14</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Saúde do Sistema</span>
        <span class="stat-val text-green">100%</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Taxa de Isolamento</span>
        <span class="stat-val text-blue">Zero Drift</span>
      </div>
    </div>

    <div class="table-container">
      <h3>Atividades Recentes</h3>
      <table id="events-table">
        <thead>
          <tr>
            <th>Evento</th>
            <th>Origem</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Snapshot de Versão v4.0</td>
            <td>ArtifactService</td>
            <td><span class="tag-success">OK</span></td>
          </tr>
          <tr>
            <td>Execução em Sandbox</td>
            <td>JobManager</td>
            <td><span class="tag-success">OK</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        name: "styles.css",
        language: "css",
        content: `body { margin: 0; font-family: system-ui, sans-serif; background: #080911; color: #f8fafc; padding: 2rem; }
.dashboard-container { max-width: 1000px; margin: 0 auto; }
.dash-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.badge { background: #10b98122; color: #10b981; border: 1px solid #10b98144; padding: 0.35rem 0.75rem; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; }
.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2.5rem; }
.stat-card { background: #121324; border: 1px solid #20223c; border-radius: 12px; padding: 1.5rem; }
.stat-label { display: block; font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.5rem; }
.stat-val { font-size: 2rem; font-weight: 800; }
.text-green { color: #10b981; }
.text-blue { color: #3b82f6; }
.table-container { background: #121324; border: 1px solid #20223c; border-radius: 12px; padding: 1.5rem; }
table { width: 100%; border-collapse: collapse; margin-top: 1rem; text-align: left; }
th, td { padding: 0.85rem 1rem; border-bottom: 1px solid #1e2038; font-size: 0.9rem; }
th { color: #64748b; font-weight: 600; }
.tag-success { background: #10b98122; color: #10b981; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem; }`,
      },
      {
        path: "app.js",
        name: "app.js",
        language: "javascript",
        content: `console.log("Dashboard executivo pronto.");`,
      },
    ],
  },
  {
    id: "portfolio",
    name: "Portfolio Pessoal & Projetos",
    description: "Grid visual para exibição de trabalhos, experiências, biografia e links de contato.",
    framework: "STATIC",
    category: "SHOWCASE",
    files: [
      {
        path: "index.html",
        name: "index.html",
        language: "html",
        isEntry: true,
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Profissional</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="portfolio-wrap">
    <header class="hero-bio">
      <h1>Arquiteto de Sistemas Soberanos</h1>
      <p>Desenvolvendo arquiteturas resilientes, bancos de dados locais e interfaces cognitivas de alta fidelidade.</p>
    </header>

    <section class="gallery">
      <h2>Projetos em Destaque</h2>
      <div class="grid">
        <div class="project-box">
          <h3>VARYNTH OS</h3>
          <p>Sistema operacional cognitivo Local-First.</p>
        </div>
        <div class="project-box">
          <h3>Athena Kernel</h3>
          <p>Copilot analítico com memória episódica determinística.</p>
        </div>
      </div>
    </section>
  </div>
</body>
</html>`,
      },
      {
        path: "styles.css",
        name: "styles.css",
        language: "css",
        content: `body { background: #07080e; color: #e2e8f0; font-family: system-ui, sans-serif; margin: 0; padding: 4rem 2rem; }
.portfolio-wrap { max-width: 800px; margin: 0 auto; }
.hero-bio h1 { font-size: 2.5rem; color: #3b82f6; margin-bottom: 0.5rem; }
.hero-bio p { font-size: 1.1rem; color: #94a3b8; line-height: 1.6; margin-bottom: 3rem; }
.gallery h2 { font-size: 1.5rem; margin-bottom: 1.5rem; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.project-box { background: #101222; border: 1px solid #1e213a; padding: 1.5rem; border-radius: 10px; }
.project-box h3 { color: #60a5fa; margin-top: 0; }
.project-box p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; margin-bottom: 0; }`,
      },
    ],
  },
  {
    id: "simple-react-app",
    name: "Simple Component App",
    description: "Arquitetura modular de componentes JavaScript modernos com divisão por módulos.",
    framework: "REACT",
    category: "APPLICATION",
    files: [
      {
        path: "index.html",
        name: "index.html",
        language: "html",
        isEntry: true,
        content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div id="root"></div>
  <script src="app.js"></script>
</body>
</html>`,
      },
      {
        path: "styles.css",
        name: "styles.css",
        language: "css",
        content: `body { background: #0a0b14; color: #fff; font-family: sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; }
.app-card { background: #131426; border: 1px solid #222440; padding: 2rem; border-radius: 12px; width: 340px; text-align: center; }
.app-card h2 { color: #38bdf8; margin-top: 0; }
.count-badge { font-size: 3rem; font-weight: 800; margin: 1.5rem 0; color: #60a5fa; }
.btn-group { display: flex; gap: 0.5rem; justify-content: center; }
button { background: #2563eb; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; font-weight: 600; cursor: pointer; }`,
      },
      {
        path: "app.js",
        name: "app.js",
        language: "javascript",
        content: `// Reactive Component Controller
function renderApp(count) {
  const root = document.getElementById("root");
  root.innerHTML = \`
    <div class="app-card">
      <h2>Componente Reativo</h2>
      <div class="count-badge">\${count}</div>
      <div class="btn-group">
        <button id="btn-dec">-</button>
        <button id="btn-inc">+</button>
      </div>
    </div>
  \`;

  document.getElementById("btn-dec").addEventListener("click", () => renderApp(count - 1));
  document.getElementById("btn-inc").addEventListener("click", () => renderApp(count + 1));
}

document.addEventListener("DOMContentLoaded", () => renderApp(0));`,
      },
    ],
  },
];

