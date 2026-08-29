# ADR-002 — Retenção de 10 Dias na Lixeira, Desfazer (Undo) & Alex Principle

## Status
**Accepted**

## Contexto
Em sistemas de gestão e assistentes inteligentes, ações de exclusão acidentais ou comandos ambíguos (ex: *"apague isso"*) podem destruir permanentemente semanas de pesquisa ou anotações complexas.

## Decisão
1. **Quarentena de 10 Dias**: Nenhuma exclusão no VARYNTH OS é definitiva no ato. Todo recurso é movido para o módulo Trash com prazo de expiração de 10 dias.
2. **Suporte a Desfazer (*Undo*)**: A interface e a Athena emitem cards com ação reversível imediata.
3. **Alex Principle (Fail-Closed)**: Comandos de mutação ou exclusão com alvo ambíguo bloqueiam a execução e exigem confirmação explícita.

## Justificativa
Garante a integridade do ecossistema intelectual contra erros humanos ou interpretações equivocadas de linguagem natural.

## Consequências
- **Ganhos**: Risco zero de perda irreversível de dados por um comando mal interpretado.
- **Compromissos**: Exige lógica adicional de ciclo de vida e purga programada após 10 dias.

