# Convenções de Código & Padrões Arquiteturais — VARYNTH OS

## 1. Padrões de Tipagem & TypeScript
- **Tipagem Estrita Obrigatória**: Proibido o uso de `any` em interfaces centrais de domínio (`src/lib/types` e `src/lib/athena/domain`).
- **Imutabilidade de Domínio**: Interfaces devem preferir tipos imutáveis e schemas explícitos.
- **Nenhum Segredo em Código**: Proibido colocar credenciais, chaves ou tokens no repositório.

---

## 2. Princípios de Conversação e Copilot
- **Princípio de Resposta Direta**: Responder primeiro ao que foi pedido.
- **Anti-Generic-Fallback**: Nunca emitir frases evasivas de fingimento de compreensão.
- **Fail-Closed**: Bloquear mutações destrutivas em casos de ambiguidade.
- **Preservação de Testes de Regressão**: Todo bug descoberto em produção deve gerar um caso de teste na suíte de regressão antes do encerramento da tarefa.

