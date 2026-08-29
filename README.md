# VARYNTH 🚀

> Seu OS pessoal na web. Uma plataforma hub estilo gaming onde você acessa, gerencia e usa todos os seus projetos e ferramentas.

## Stack

- **Next.js 15** + TypeScript
- **Tailwind CSS v4** — tema dark gaming/cyberpunk
- **FastAPI** (Python) — backend dos módulos
- **NextAuth.js** — autenticação

## Como rodar

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev
# Acesse: http://localhost:3000

# Build de produção
npm run build
npm start
```

## Estrutura

```
src/
├── app/
│   ├── dashboard/       # Página principal
│   ├── modules/         # Lista de todos os apps
│   │   ├── athena/      # IA pessoal
│   │   └── studio/      # Editor de código
│   └── profile/         # Perfil gamer
├── components/
│   ├── layout/          # Sidebar, Navbar, PageLayout
│   └── ui/              # AppCard e outros
└── lib/
    ├── modules.ts        # ✨ Registre novos apps aqui!
    ├── types.ts
    └── utils.ts
```

## Adicionando um novo módulo

Edite [`src/lib/modules.ts`](src/lib/modules.ts) e adicione um novo objeto ao array:

```ts
{
  id: "meu-app",
  name: "Meu App",
  description: "Descrição do app",
  icon: "🔥",
  color: "violet",        // violet | cyan | green | orange | red
  href: "/modules/meu-app",
  status: "active",       // active | wip | coming-soon
  tags: ["tag1", "tag2"],
}
```

## Módulos

| Módulo | Status | Descrição |
|--------|--------|-----------|
| LigaHub | ✅ Ativo | Sistema de gestão da Liga Acadêmica |
| Athena | 🚧 WIP | IA pessoal integrada |
| Studio | 📌 Em breve | Editor de código embutido |

