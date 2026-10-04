# ADR-046 — Explicit Domain Knowledge Policy

## Status

Aceito e implementado incrementalmente.

## Contexto

O índice de awareness já separava metadados de conteúdo, mas as policies retornadas pelo registro eram sintetizadas como públicas para todos os domínios. Isso fazia a interface comunicar proteção enquanto policy efetiva não era configurável por domínio.

## Decisão

- Persistir por domínio elegibilidade de compartilhamento, visibilities permitidas, sensibilidade e consumidores.
- Calcular policy efetiva de subdomínio por interseção com ancestrais; um filho nunca amplia acesso herdado nem baixa a sensibilidade.
- Aplicar policy no gate central de acesso para conteúdo `DOMAIN`, `CROSS_DOMAIN` e `PUBLIC_TO_AGENTS`, sem alterar awareness de metadados.
- Filtrar capabilities públicas também pela policy efetiva, mantendo seus contratos registrados para futura reabertura pelo owner.
- Expor controles somente na superfície de proprietário, usando revisão otimista e persistência já existente do Domain Registry.
- Interpretar registros legados ausentes como a policy pública anterior, evitando mudança sem migração de dados.

## Consequências

Owners podem restringir compartilhamento sem apagar declarações de capability; consumers e subdomínios recebem apenas o escopo explicitamente permitido. A policy do domínio governa o teto de compartilhamento e não substitui a classificação individual, autorização do projeto, provenance ou controles de conteúdo privado.
