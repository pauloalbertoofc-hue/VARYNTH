# Music — arquitetura e entrega incremental

## Estado examinado

O VARYNTH organiza aplicações no catálogo `src/lib/modules.ts` e usa páginas App Router. A interface interativa fica em componentes cliente. O Studio de Áudio (`src/lib/studio/audio`) é um editor de produção: seus tipos representam documentos, tracks de timeline, clips, renderização e exportação. Ele não é uma biblioteca de reprodução musical e não deve ser reaproveitado como se fosse um player.

A Athena já oferece o `athenaEventBus` tipado (`src/lib/athena/events/event-bus.ts`) e o `PermissionPolicyEngine` (`src/lib/permissions/permission-policy.ts`). A coleção inicial 0.1 ficava apenas no IndexedDB do navegador. A versão 1.1 acrescenta upload direto para Vercel Blob privado e catálogo no Redis, com partição derivada da sessão autenticada; cada áudio é servido por rota autenticada que confere a propriedade da faixa. Quando o serviço não está configurado ou indisponível, a interface avisa e mantém a biblioteca local deste dispositivo.

## Decisões iniciais da versão 0.1

- `src/lib/music` é um domínio separado do Studio de Áudio, com modelos pequenos e serviço de biblioteca substituível.
- A importação é iniciada pelo usuário e aceita arquivos de áudio conhecidos por MIME ou extensão. O navegador mede duração quando consegue ler os metadados; uma falha de decodificação é informada no player.
- A biblioteca da conta carrega metadados do Redis sem trazer os arquivos de áudio; os áudios ficam em Vercel Blob privado e só são transmitidos por rota que exige sessão e verifica o namespace da conta. URLs temporárias de reprodução são revogadas ao trocar de faixa ou sair da página. IndexedDB continua como modo local quando o armazenamento de conta não está disponível.
- O catálogo registra Music como módulo próprio em `/modules/music`; a reprodução usa o elemento de áudio do navegador, sem dependência de rede ou provedor de IA.
- O barramento registra importação, mudança de faixa, play e pause para futura integração. Esses eventos são observabilidade, não autorização.
- A pessoa executa a importação diretamente na interface. Agentes não recebem acesso implícito a arquivos locais; ações futuras mediadas pela Athena precisarão passar pela política de permissões e capacidades autorizadas.
- Escopo original deliberado: sem playlists, análise FFT, Music DNA, visualização reativa, geração visual, agente musical, exclusão de faixas ou sincronização. As entregas 0.2–1.0 abaixo ampliam agora essa base, mantendo o armazenamento local.

## Arquitetura observada

```text
Pessoa → /modules/music → Euterpe ──pedidos gerais──> Athena Engine
                              │                         │
                              ├── propostas revisáveis  └── PermissionPolicyEngine (MUSIC)
                              ├── Now Playing + HTMLAudioElement
                              ├── Music Library → IndexedDB ou API privada por conta
                              └── AthenaEventBus (observabilidade)

Studio de Áudio → timeline, edição, renderização e exportação
Athena → PermissionPolicyEngine → capacidades governadas
```

Não há nesta etapa um barramento global de domínio fora do barramento da Athena. Também não se introduz banco servidor: o armazenamento client-side existente atende ao requisito de biblioteca local para o player e evita tratar uma importação pessoal como publicação ou sincronização.

## Entregas incrementais

| Versão | Escopo | Condição para avançar |
|---|---|---|
| 0.1 | Importação local, biblioteca, play/pause, seek, volume e faixa anterior/próxima | Implementado: IndexedDB e controles locais |
| 0.2 | Waveform, espectro FFT e bandas em tempo real | Implementado via Web Audio; modos econômico (512), equilibrado (2048) e alto (4096), buffers limitados à janela FFT, waveform e 32 bandas atualizadas até 20 vezes por segundo e no máximo 3.600 amostras de seção |
| 0.3 | Fundo e movimento reativo com níveis de qualidade | Implementado: barras de frequência e disco animado, sem canvas ou recursos pesados |
| 0.4 | Music DNA persistente e perfis determinísticos | Implementado com schemaVersion 1; médias baseadas nos frames ouvidos e leitura compatível com faixas ainda sem DNA |
| 0.5 | Especialista musical subordinado à Athena | Evoluído na 1.3 para Euterpe, com alias legado `music-curator`, interlocução própria e consulta ao Athena Engine para solicitações gerais |
| 0.6 | Prompts e interface `VisualGenerationProvider` | Composição SVG local gratuita e geração opcional pela Athena/OpenAI em WebP, com prompts para capa quadrada e fundo panorâmico separados |
| 0.7 | Playlists com identidade visual | Implementado em IndexedDB com cores determinísticas, filtro, renomear, adicionar e remover faixa |
| 0.8 | Detecção de seções e transições | Implementado como heurística de energia sobre frames ouvidos, com confiança exposta e sem alegação de análise musical robusta |
| 0.9 | Dataset estruturado de feedback | Implementado com revisão na interface e exportação JSON explícita; sem treinamento ou alteração de pesos |
| 1.0 | Integração e polimento | Cobertura de domínio, builds e testes executados; análises permanecem locais |
| 1.1 | Biblioteca de áudio privada por conta | Upload privado, catálogo segregado por conta e leitura autenticada; arquivos antigos locais precisam ser importados novamente para sincronizar |
| 1.2 | Metadados e navegação Music | Sugestões por tags ID3 e nomes de arquivo, edição manual, telas Início/Biblioteca/Playlists; importação em lote continua após falha individual |
| 1.3 | Fases C–K | Now Playing responsivo; capa e fundo vetoriais locais; VisualProfile versionado e editável via proposta; DNA v2 migra v1 e salva amostras a cada 5 s, com estados parcial/concluído; Euterpe substitui o nome público, mantém lookup legado e roteia tarefas musicais na Athena; memória/preferências locais; alterações propostas e governadas pelo domínio MUSIC; identidade estável da faixa separada da origem; AudioSourceResolver seleciona dispositivo/conta; Hub isolado e desativado enquanto não houver provedor público verificado |
| 1.5 | Geração de imagens via Athena | Chave OpenAI opcional criptografada por conta; capa quadrada + fundo panorâmico WebP; assets persistidos no escopo selecionado; seis pedidos/hora; composição local gratuita preservada |

Na 1.2, a importação de cada arquivo é isolada: uma falha informa nome e motivo e não cancela os itens restantes. A leitura da duração tem limite de espera para que um arquivo sem metadata legível não bloqueie o lote. A UI permite selecionar vários arquivos, mostra progresso e mantém um botão de importação acessível em todas as telas. Tags ID3v2/ID3v1 têm prioridade sobre o nome; padrões claros `artista - título` são sugeridos com confiança alta; sugestões incertas ficam marcadas e podem ser corrigidas manualmente. A organização Início/Biblioteca/Playlists foi adicionada sem substituir o player e a conversa existentes.

As etapas 0.2–1.0 foram ativadas conforme pedido, e a versão 1.1 acrescenta sincronização privada da biblioteca de áudio. Cobertura de isolamento do namespace da conta fica em `music-cloud-contracts.test.ts`; os fluxos DSP e agente ficam em `music-studio.test.ts` e `music-agent-bridge.test.ts`. A medição DSP e a heurística têm limites de entrada explícitos. A visualização exige interação de reprodução para desbloquear Web Audio no navegador. DNA, playlists e feedback continuam locais; faixas previamente importadas localmente precisam ser importadas novamente para enviar à conta, evitando uma transferência silenciosa. O provider atual produz conceitos textuais; geração de imagem requer integrar uma implementação autorizada de `VisualGenerationProvider`.

Na versão 1.4, capas e fundos são composições SVG determinísticas geradas localmente e animadas em loop; quando a preferência por movimento reduzido está ativa na criação, são produzidas estáticas. Na versão 1.5, Euterpe pede à Athena imagens originais por um provedor de geração configurável: um pedido cria capa quadrada e fundo panorâmico WebP, persiste no escopo de faixas escolhido e não envia o áudio. A chave opcional da pessoa fica criptografada e vinculada à conta no Redis; também é possível usar uma chave da plataforma configurada no servidor. A chamada pode consumir créditos do provedor e tem limite de seis pedidos por hora por conta. Sem chave, a composição local gratuita continua disponível. O Hub não consulta nem publica um catálogo: faltam provedor, direitos e moderação, então sua interface de serviço retorna `unconfigured` e não mistura conteúdo comunitário à biblioteca privada. Preferências e memória do Euterpe ficam neste navegador; não são sincronizadas por conta. A identidade da faixa mantém o UUID existente por compatibilidade e registra se sua origem é local ou da conta. Propostas do Euterpe passam pelo perfil de permissão e aguardam o clique de revisão da pessoa; a agente não executa ferramentas, importa arquivos ou controla o player.

Metadados legados que foram salvos com bytes UTF-16 invertidos são corrigidos somente na leitura e na apresentação; o dado da conta não é alterado até a pessoa confirmar uma edição. A geração visual usa o título normalizado e preserva a paleta aprovada no perfil.

Os critérios verificáveis de 1.5 incluem criptografia e autenticação de imagens, limites do formato WebP, prompts distintos, falha explícita do provedor, persistência dos assets e cobertura de navegador. `test:music:complete` e o build verificam as regressões de Music, documentação e Athena. A geração externa requer uma chave com acesso de imagem configurada pela pessoa ou pela plataforma; a composição local não requer credenciais.
