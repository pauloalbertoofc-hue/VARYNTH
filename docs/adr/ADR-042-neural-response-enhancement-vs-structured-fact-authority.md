# ADR-042: Neural Response Enhancement vs Structured Fact Authority (Fact Lock)

## Status
ACCEPTED

## Contexto
O adaptador neural local (Ollama) pode ser utilizado opcionalmente para enriquecer a fluidez e naturalidade das respostas em português. No entanto, modelos de linguagem generativos possuem tendência intrínseca a alucinar números, estados ou alegar ações operacionais não executadas.

## Decisão
1. **Fact Lock com Fail-Closed (`FactLockValidator`)**:
   - Todo modelo neural recebe apenas o `ResponseIntent`, `keyFacts` e contexto delimitado.
   - Antes de entregar a resposta textual gerada ao usuário, o `FactLockValidator` inspeciona a saída:
     - Se o modelo neural contradizer um fato numérico (ex.: 5 tarefas pendentes alteradas para 6 ou 99);
     - Se o modelo neural alegar conclusão de projeto em progresso parcial (ex.: 60% alegado como 100% pronto);
     - Se o modelo neural alegar que executou mutações operacionais sem autoridade (*"Já criei a tarefa"*);
     - **A resposta neural é sumariamente descartada** e o sistema entrega a resposta determinística de alta fidelidade (`FAIL-CLOSED`).
2. **Separação entre Fato e Variação Estilística**:
   - O Fact Lock valida números, entidades e alegações de execução, permitindo variações naturais de estilo (*"Você tem 5 tarefas"* vs *"Ainda restam 5 tarefas para concluir"*).
3. **Política de Chamada Seletiva (Call Policy)**:
   - Respostas de status simples, fatos numéricos diretos e negativas de permissão utilizam diretamente o motor determinístico (0ms, 100% offline).
   - O modelo neural só é acionado para explicações conceituais densas, sínteses elaboradas ou diálogos dialéticos.

## Consequências
- Fatos operacionais são 100% confiáveis e verificáveis.
- Queda de latência e garantia absoluta contra alucinações de mutações no banco de dados.
