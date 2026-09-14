# Changelog

Todas as mudanças relevantes seguem a Definition of Done: implementação, testes, documentação técnica, documentação de uso, ADR quando necessário e changelog.

## [Unreleased]

### Changed

- Documentação auditada contra o checkout real: 22 route handlers, 36 ferramentas Athena, 11 agentes registrados e 17 módulos.
- `DocumentationGuardian` deixou de apresentar contagens fixas para ferramentas, agentes e módulos; o gate de arquivos passou a ser obrigatório em `docs:check` e no build.
- Login carrega o cliente NextAuth apenas após interação do usuário, evitando falha de pré-renderização causada por URL de ambiente inválida.
- A Administração permite definir ou restaurar o ícone global do Web App para o site e as instalações PWA.

### Added

- ADR-043: documentação como código e gate de regressão documental.
- Relatório de auditoria documental de 2026-09-06.
- Matriz de rastreabilidade entre subsistemas, código, testes e documentação.
- Comando `npm run test:all` para a verificação integrada do repositório.
