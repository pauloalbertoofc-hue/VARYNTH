# ADR-022: Modelo de Artefato de Jogo Desacoplado de Engine e Arquitetura Entidade-Componente

## Status
ACCEPTED

## Contexto
Jogos combinam narrativa, assets visuais, áudio, código, lógica e estado.
Acoplar o VARYNTH OS a uma engine comercial ou monolítica específica (como Unity, Godot ou Phaser) criaria dependência de runtime e impediria a serialização limpa e a manipulação inteligente de jogos pela Athena.

## Decisão
1. **Engine-Agnostic Game Model**: Representar o jogo declarativamente através de `GameDocumentState` com cenas, entidades, componentes, variáveis e regras serializáveis.
2. **Entidade-Componente (ECS)**: Utilizar modelo composicional de entidades com componentes modulares (`TRANSFORM`, `SPRITE`, `TEXT`, `COLLIDER`, `INPUT`, `UI`, `AUDIO_SOURCE`).
3. **Prevenção de Ciclos Transitivos**: Validar que a árvore de parentesco de entidades seja estritamente acíclica (`A -> B -> C -> A` é rejeitado).
4. **Princípio Alex**: Source assets (sprites, áudios, roteiros) são mantidos imutáveis no `AssetManager` (`isSource: true`).

## Consequências
### Positivas
* Portabilidade completa entre diferentes runtimes de visualização e compilação.
* A Athena pode inspecionar e orquestrar cenas e entidades de forma declarativa e segura.
### Negativas / Mitigações
* Recursos complexos de física 3D não são suportados nativamente nesta V1 (prioridade 2D/Web).
