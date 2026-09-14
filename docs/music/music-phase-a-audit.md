# Music — Fase A: auditoria do estado atual

Data da auditoria: 2026-09-14
Escopo: somente inspeção do checkout e execução dos testes Music existentes. Nenhuma implementação do módulo foi alterada nesta fase. O checkout tem muitas modificações preexistentes, incluindo os arquivos de Music como não rastreados; a auditoria considera o conteúdo que está presente agora, sem presumir que todo ele já esteja publicado.

## Resumo

Music já tem uma base funcional: biblioteca local em IndexedDB, biblioteca privada por conta com metadados em Redis e áudio privado em Vercel Blob, reprodução via `HTMLAudioElement`, controles básicos, leitura de FFT e forma de onda via Web Audio, DNA v1 calculado a partir dos trechos ouvidos quando a pessoa pede, playlists e feedback locais, provider de conceito visual textual e uma agente consultiva registrada no catálogo Athena.

A experiência ainda é uma página única em formato de dashboard com um player. A visualização é um espectro de 32 barras, uma forma de onda e um disco decorativo; não existe capa, fundo específico por faixa ou `VisualProfile`. O DNA não começa automaticamente nem possui estados de ciclo de vida. A interlocutora ainda se chama Curadora Musical/`music-curator`, sem memória musical persistente, sem ferramentas de Music e sem capacidade de executar ações no domínio. A delegação pelo chat do módulo é unidirecional e baseada em heurísticas de texto.

## Arquitetura encontrada

```text
/modules/music (page.tsx, componente cliente único)
  ├─ musicLibrary ── IndexedDB local (faixas + blobs)
  │                  ou API autenticada → Redis (metadados)
  │                                     → Vercel Blob privado (áudio)
  ├─ HTMLAudioElement → Web Audio AnalyserNode → barras/onda + acumuladores
  ├─ musicStudio ── IndexedDB local (DNA v1, playlists, feedback)
  ├─ musicAgentBridge → musicCuratorAgent → (heurística) Athena Engine
  └─ athenaEventBus (eventos de observabilidade)

Studio de Áudio → domínio independente de produção e timeline
PermissionPolicyEngine → domínios e perfis de agentes existentes; Music não consta neles
```

Arquivos centrais: `src/app/modules/music/page.tsx`, `src/lib/music/{types,music-library,music-studio,music-agent-bridge,music-cloud,music-cloud-contracts}.ts`, `src/lib/athena/agents/council/music-curator.ts`, as três rotas em `src/app/api/music/` e `docs/music/music-module-roadmap.md`.

## O que é reaproveitável

- **Biblioteca e armazenamento:** `MusicTrack`/`StoredMusicTrack`, validação básica de arquivo, IndexedDB separado entre metadados e áudio, modo local de contingência e catálogo por conta. As rotas já isolam o namespace pela sessão autenticada; a rota de áudio consulta a faixa no catálogo daquela conta antes de transmitir o Blob privado.
- **Player e análise em tempo real:** o `HTMLAudioElement` já alimenta um `AnalyserNode`, com ajuste de FFT, leitura de frequência e forma de onda, pausa, seek, volume e troca de faixa. O ciclo de URL temporária e a limpeza do `AudioContext` podem servir de base para a tela Now Playing.
- **Dados musicais locais:** os stores IndexedDB e serviços `musicStudio` já separam DNA, playlists e feedback dos blobs. São uma base para migrações versionadas, embora hoje os schemas estejam acoplados a uma abertura de banco versão 2 duplicada em dois módulos.
- **Integração Athena:** o `AgentRegistry`, `AthenaTask`, `AthenaContext`, eventos tipados e o teste da agente já fornecem pontos de integração. O padrão de apresentar plano da Athena para revisão também está ligado à conversa existente.
- **Fallback e providers:** a reprodução não depende do provider visual. `VisualGenerationProvider` permite substituir a implementação, mas sua saída atual é texto e paleta, não assets de capa/fundo.

O Studio de Áudio não deve ser reutilizado como biblioteca/player: seu modelo é de edição, timeline, clips e render/exportação.

## Funcionalidades comprováveis no código e limites atuais

| Área | Estado real | Limite observado |
|---|---|---|
| Importação | Seleção iniciada pela pessoa; filtro por MIME/extensão; tentativa de ler duração; upload à conta se o endpoint autenticado estiver disponível; caso contrário IndexedDB | Sem leitura de tags incorporadas, capa, edição de metadados, progresso detalhado ou retomada. Falha numa faixa interrompe o lote. |
| Biblioteca e conta | Metadados da conta vêm do Redis; áudio fica em Blob privado e passa por rota autenticada. IndexedDB é fallback local | DNA, playlists, feedback e conversa não sincronizam. O fallback local é do navegador e não é separado por usuário do sistema operacional/conta VARYNTH. A UI deve deixar explícita a mudança para modo local quando o endpoint falhar. |
| Reprodução | Player HTML nativo com play/pause, anterior/próxima, seek, volume, duração e erro de decodificação | A tela não é dedicada; áudio de conta é baixado como Blob completo antes de criar URL local temporária, o que pode pressionar memória em faixas grandes. |
| Visualização | 32 barras de frequência, linha de forma de onda e ícone de disco giratório; atualizações limitadas a 20/s e perfis de custo do FFT | Sem capa, background, partículas, perfil visual por faixa ou resposta visual calibrada por bandas em outros elementos. O disco não é visualização derivada de artwork. |
| Music DNA | Média local de loudness espectral, centroide e proporções graves/médios/agudos dos frames ouvidos; gravação sob ação explícita | Apenas schema v1, sem lifecycle, BPM, RMS real, dinâmica, atributos de humor ou análise automática progressiva. A heurística de seções só vê amostras de loudness ouvidas e chama os eventos de início/mudança/pico. |
| Playlists e feedback | Persistência local, cores determinísticas, operações básicas de faixa e exportação JSON do feedback | Sem sincronização, preferências derivadas, memória de gosto, avaliação tipada de capa/fundo ou dataset de exemplos além de notas e texto livre. |
| Agente musical | `music-curator` registrado, recebe metadados/DNA explicitamente fornecidos e só aconselha; pode encaminhar a pergunta inteira à Athena | Nome ainda é Curadora; memória mostrada é uma frase derivada do track/DNA, não memória persistente. Sem tools, identidade persistente, contexto musical próprio, ações ou resposta estruturada de domínio. |
| Athena ↔ agente | Chat Music pode chamar Athena com heurística de verbos/menções e mostrar um plano retornado pela Athena | Caminho observado é Music→Athena. Não há roteador ou contrato comprovado para Athena→Euterpe neste módulo. Os eventos emitidos são observabilidade, não execução nem autorização. |
| Permissões | A Athena tem `PermissionPolicyEngine` geral | `music-curator` não tem perfil registrado e `MUSIC` não é domínio em `SecurityTargetDomain`. Como a agente ainda é consultiva, não há tool musical a governar; a política terá de ser ampliada antes de habilitar tools mutáveis. |
| Hub e comunidade | Nenhuma base identificada no domínio Music | Sem catálogo público, busca, comunidade, identidade de origem, licenças/atribuição ou `AudioSourceResolver`. |
| Metadados | Nome do arquivo sem extensão e artista desconhecido | Não há parser de tags, heurística artista–título, confiança ou edição manual; ruídos como `(Lyrics)` e `(MP3_160K)` permanecem. |

## Diferenças em relação à especificação

1. **Prioridade de interface:** falta separar Music Home, Library, Playlists e Now Playing; a hierarquia atual ainda é hero + conversa + biblioteca/player + cards de DNA, playlists, conceito visual e feedback.
2. **Mundo audiovisual por faixa:** faltam `VisualProfile`, paleta persistida, cover/background separados, gerador de fallback, movimento orientado por áudio, controles de acessibilidade e teste de FPS.
3. **Análise musical:** o DNA depende de clique e do trecho efetivamente ouvido. Os dados são agregados simples, não análise completa do arquivo; a detecção de seção é uma heurística de variação de energia.
4. **Euterpe como sub-IA:** há um agente Athena consultivo inicial, mas não a entidade de domínio descrita: faltam namespace/memória, preferências, tools, feedback próprio, ações estruturadas e ciclo de delegação nos dois sentidos.
5. **Identidade e fontes de áudio:** existe um UUID da faixa e um campo `storageMode`, mas não identidade canônica com origens locais/conta/hub, disponibilidade por dispositivo ou política de direitos.
6. **Catálogo híbrido e comunidade:** ainda inexistentes; devem ser fundados após a identidade de faixa e a origem do áudio estarem estáveis.
7. **Testes:** há testes de funções puras, namespace, DNA/FFT heurístico e conversa/delegação. Não há cobertura automatizada de importação IndexedDB real, playback/seek/volume no navegador, upload privado ponta a ponta, falha de storage, permissões musicais, persistência/migração, metadata, VisualProfile, identidade/origem, playlists em UI, privacidade entre contas ou acessibilidade/FPS.

## Plano de migração proposto

O trabalho futuro deve manter biblioteca, player, conta privada e stores locais compatíveis. Cada fase terá critério de aceite, regressões próprias e revisão da UI quando aplicável. Só a Fase A foi executada agora.

| Fase | Migração e saída verificável | Gate antes de avançar |
|---|---|---|
| **A — Auditoria (concluída)** | Inventário, componentes reaproveitáveis, limites, divergências e sequência registrados neste documento | Aprovação do entendimento e do plano pelo usuário |
| **B — Metadados e navegação** | Parser de tags; sugestão por nome com confiança; edição confirmada; decompor página em Home, Library, Playlists e conversa global da agente; player existente preservado | Casos de tags/nomes e revisão manual passam; testes responsivos e regressões do player |
| **C — Now Playing** | Rota/overlay dedicada que ocupa a área útil, responsiva, com controles já existentes, estados vazio/carregando/erro e redução de movimento | Fluxo real de reprodução e controles validados em desktop/mobile; verificação visual |
| **D — Visual Engine** | Extrair captura/análise de áudio do componente; encaminhar bandas reais para waveform/espectro e efeitos; limitar trabalho por qualidade/visibilidade | Medir custo/FPS em faixas curtas e longas; degradar com Web Audio indisponível |
| **E — DNA v2 e VisualProfile** | Schema com versão/migração; lifecycle UNKNOWN→ANALYZING→PARTIAL→COMPLETE; cálculo incremental; perfil determinístico e editável | Fixtures de áudio sintéticas e migração de DNA v1; nenhuma alegação além dos dados medidos |
| **F — Euterpe: identidade e contexto** | Renomear identidade pública para Euterpe preservando compatibilidade do id salvo quando necessário; definir manifesto, prompt, contexto, namespace e contratos de resposta | Registro/catálogo Athena e conversas antigas compatíveis; identidade visível coerente |
| **G — Memória e tools** | Preferências, feedback e memória musicais versionados; primeiro tools somente leitura, depois propostas editáveis; alterações de biblioteca/perfil com preview e autorização | Testar memória por conta, isolamento e consentimento; tools vinculadas à política, sem mutação silenciosa |
| **H — Athena ↔ Euterpe** | Contrato explícito de delegação nos dois sentidos com correlação, contexto mínimo e resultado estruturado; roteamento Athena→Music | Testar sucesso, falha, timeout, loop e fronteiras de permissão |
| **I — Track Identity e AudioSourceResolver** | Separar identidade/metadata da origem; resolver arquivo local, áudio da conta e futuras fontes por interfaces; playback por stream quando suportado | Migrações de dados e acesso por conta testados; tratar faixas ausentes e direitos antes de hub público |
| **J — Hub e Community foundation** | Catálogo público e áreas comunitárias como domínio separado, com atribuição, disponibilidade regional, origem e permissões explícitas | Modelo de direitos/moderação e APIs reais disponíveis; distinguir catálogo público de biblioteca privada |
| **K — Geração visual** | Provider neutro para conceito/capa/background com implementações local, remota autorizada e indisponível; geração nunca bloqueia playback | Provider mockado e real isolado; custo, conteúdo, consentimento e fallback validados |

## Critérios transversais

- Toda leitura/escrita que envolva conta deve validar sessão e propriedade no servidor; armazenamento local deve permanecer explicitamente local.
- Não enviar arquivos pessoais a provider visual ou agente. Análise local recebe só buffers necessários; qualquer novo envio exige uma ação clara na interface.
- Migrações IndexedDB devem ter um único responsável pelo schema, upgrade compatível e teste com bases existentes. Hoje `music-library.ts` e `music-studio.ts` abrem o mesmo banco versão 2 separadamente.
- A cobertura deve combinar testes de domínio, rota/isolamento, persistência/migração e interação real de navegador; testes unitários de helper não provam funcionamento completo do player ou do upload.
- Reavaliar tamanho da página cliente: hoje player, FFT, biblioteca, chat, DNA, playlists, feedback e provider visual vivem em `src/app/modules/music/page.tsx`.

## Validação desta fase

Passaram no checkout atual:

- `npm run test:music` — validação de tipos/índices/tempo básico da biblioteca.
- `npm run test:music:cloud` — isolamento do namespace e rejeição de caminhos inválidos.
- `npm run test:music:studio` — extração espectral, DNA v1, limites, seções heurísticas e provider textual.
- `npm run test:music:chat` — heurística de delegação e ponte de conversa.
- `npm run test:music:athena` — registro da agente e limite consultivo sem acesso direto a ferramentas/arquivos.

Esses testes cobrem funções e contratos selecionados; não equivalem a teste ponta a ponta do navegador, upload ou reprodução. Build não foi executado nesta auditoria, pois não houve alteração de implementação e a fase solicitada é apenas diagnóstico.
