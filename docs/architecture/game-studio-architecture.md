# Game Studio Architecture — VARYNTH OS

O **Game Studio** representa o sexto e último Studio da sequência canônica do VARYNTH OS (`DOCUMENT -> WEB -> IMAGE -> AUDIO -> VIDEO -> GAME`).
Ele consolida todas as fundações construídas anteriormente em um ambiente de criação e simulação de jogos desacoplado de engines monolíticas.

```text
LOGIC + STATE + INTERACTION + RULES + SCENES + ENTITIES + INPUT + SIMULATION + BUILD = GAME
```

---

## 1. Princípio Fundamental de Jogos

```text
GAME ARTIFACT ≠ GAME DESIGN DOCUMENT ≠ SCENES ≠ ENTITIES ≠ COMPONENTS ≠ SYSTEMS ≠ SCRIPTS ≠ ASSETS ≠ RUNTIME ≠ TEST SESSION ≠ BUILD JOB ≠ BUILD OUTPUT
```

> *"The editable project is intention. The session is simulation. The build is a derived result."*

### Regras Centrais:
1. **Source Asset Immutability**: Sprites, áudios, vídeos de cutscene e roteiros são mantidos no `AssetManager` como `isSource: true` e preservados imutáveis.
2. **Modelo Desacoplado de Engine (`Engine-Agnostic Game Model`)**: `GameDocumentState` define cenas, entidades, componentes, variáveis e regras de forma declarativa e serializável, desacoplada de runtimes proprietários.
3. **Regras Antes de Código ("Rules Before Code")**: Suporte prioritário a um motor declarativo de regras (`Triggers -> Conditions -> Actions`), permitindo que a Athena crie mecânicas ricas e auditáveis sem gerar código arbitrário opaco.
4. **Proteção contra Tempestade de Regras (`Rule Storms`)**: O `RuleExecutionContext` rastreia a profundidade de recursão (`maxDepth = 8`) e passos por tick (`maxSteps = 50`), encerrando com segurança em caso de `RULE_EXECUTION_BUDGET_EXCEEDED` para prevenir travamento do navegador.
5. **Fila de Eventos Determinística & Timestep Fixo**: Eventos gerados por ações são enfileirados em FIFO com prioridade estável, e a simulação avança em passos fixos (60Hz / 16.666ms) independente do frame rate de renderização.
6. **PRNG com Seed Determinístico**: O motor Mulberry32 garante que o mesmo seed e sequência de inputs gerem o mesmo resultado em sessões de playtest e replays de depuração.
7. **Isolamento Estrito do Play Mode**: A execução em Sandbox gera estado volátil em tempo de execução (`GameTestSession`) que nunca sobrescreve a definição do jogo.
8. **Hierarquia Acíclica de Entidades**: Validação transitiva completa que impede ciclos de parentesco (`A -> B -> C -> A`).
9. **Princípio Alex**: O build compilado é um `Derived Asset` (`isDerived: true`). Rollbacks no `VersionManager` restauram como `vNext`, preservando todas as versões intermediárias.

---

## 2. Componentes e Entidades (ECS)

O Game Studio adota um modelo composicional:
* `TRANSFORM`: Posição (X, Y), Escala, Rotação e Z-Index.
* `SPRITE`: Dimensões e referência a imagem no `AssetManager`.
* `TEXT`: Conteúdo textual, tamanho e cor da fonte.
* `AUDIO_SOURCE`: Referência sonora, volume e loop.
* `COLLIDER`: Caixa delimitadora retangular ou circular, com suporte a `isTrigger`.
* `INPUT`: Mapeamento de ações lógicas (`MOVE_LEFT`, `INTERACT`, `JUMP`) para teclas físicas.
* `UI`: Botões interativos, painéis e caixas de diálogo.
* `STATE` & `VARIABLES`: Variáveis numéricas, booleanas e textuais com escopo global ou local.

---

## 3. Orquestração Prompt-to-Game & GDD com Athena

A Athena auxilia na concepção do jogo através de um fluxo estruturado:
1. Geração de `GameCreationPlan` (Conceito, Loop de Jogabilidade, Cenas, Entidades, Variáveis e Regras).
2. Apresentação para inspeção e aprovação do usuário.
3. Compilação em `GameChangeSet` atômico com snapshot de segurança prévio e `ATOMIC_ROLLBACK` em caso de erro.

