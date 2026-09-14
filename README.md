# VARYNTH 🚀

> Seu OS pessoal na web. Uma plataforma hub estilo gaming onde você acessa, gerencia e usa todos os seus projetos e ferramentas.

**Plataforma publicada:** [https://varynth-ynqv-plum.vercel.app/dashboard](https://varynth-ynqv-plum.vercel.app/dashboard)

## Stack

- **Next.js 16** + TypeScript
- **Tailwind CSS v4** — tema dark gaming/cyberpunk
- **NextAuth.js 4** — autenticação
- APIs internas em route handlers do Next.js; não há backend FastAPI neste repositório

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
    ├── modules.ts        # ✨ Registro de módulos navegáveis
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
| Athena | ✅ Implementado | Copilot cognitivo soberano |
| Studio | ✅ Implementado | Hub e seis studios criativos |
| Vault | ✅ Implementado | Acervo local, ingestão e pesquisa |
| Projects / Chronos / People / Labs / Activity / Trash / Codex / Research / Opportunities / Forge | ✅ Implementados | Módulos registrados em `src/lib/modules.ts` |

## Definition of Done

Uma mudança só é concluída quando o código, os testes e a documentação permanecem coerentes:

`IMPLEMENTAÇÃO → TESTES → DOCUMENTAÇÃO TÉCNICA → DOCUMENTAÇÃO DE USO → ADR, quando necessário → CHANGELOG`

O guard documental executado por `npm run docs:check` valida o inventário mínimo, os contratos críticos e afirmações numéricas sensíveis. Alterações de autoridade, segurança, persistência, contratos, integrações ou comportamento exigem revisão documental explícita.
