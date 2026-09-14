# ADR-043 — Documentação como código e gate de regressão documental

## Status

Accepted — 2026-09-06

## Contexto

O repositório possui documentação extensa e um Documentation Guardian, mas o guard anterior usava números fixos para rotas, ferramentas, agentes e módulos. Isso permitia declarar sincronização mesmo quando o código já havia evoluído.

## Decisão

O inventário mínimo de componentes documentáveis será derivado do checkout em tempo de teste. O gate `test:docs:regression` deve verificar:

- existência e indexação dos documentos canônicos de arquitetura, Athena e desenvolvimento;
- coerência entre rotas, módulos, ferramentas e agentes registrados e os números/âncoras documentados;
- presença de documentação dos contratos soberanos (`PermissionPolicyEngine`, `MemoryGate`, sandbox, anti-replay, auditoria e backup);
- Definition of Done e referência ao ADR no caminho de desenvolvimento.

O teste não presume que toda alteração interna exige um novo documento; ele força revisão quando uma superfície documentável, contrato ou princípio de segurança muda. A decisão humana continua necessária para classificar implementações experimentais, deprecadas e decisões arquiteturais.

## Consequências

Ganho: drift estrutural detectável em CI/build e números reais em vez de contagens aspiracionais. Custo: documentos canônicos precisam manter âncoras e o teste deve ser atualizado quando a estrutura deliberadamente mudar.

## Não decidido

O gate não consegue provar qualidade prose, completude conceitual ou correção de uma decisão. Essas propriedades continuam exigindo revisão humana e ADR quando aplicável.
