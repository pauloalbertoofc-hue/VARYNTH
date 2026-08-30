# ADR-020: Edição Não-Destrutiva de Vídeo e Arquitetura de Cenas Semânticas

## Status
ACCEPTED

## Contexto
A composição audiovisual envolve múltiplos tipos de mídia (vídeo, imagens, textos, legendas, áudio).
A manipulação temporal (recortes, divisões, movimentações) não pode destruir os arquivos de mídia originais nem achatar prematuramente o projeto em arquivos binários.

## Decisão
1. **Princípio Alex**: Arquivos de mídia originais são importados como `isSource: true` e preservados imutáveis.
2. **Clips como Referências Virtuais**: Clips apontam para intervalos temporais do asset fonte sem duplicação de dados físicos no disco.
3. **Cenas Semânticas (`VideoScene`)**: Cenas agrupam logicamente momentos narrativos (ex: Introdução, Demonstração, Conclusão) referenciando a linha do tempo principal sem criar fontes concorrentes de verdade temporal.
4. **Pilha de Undo/Redo Local**: Histórico em memória (`VideoCommandHistory`) que não polui o histórico formal de versões durante autosave.

## Consequências
### Positivas
* Reversibilidade total de qualquer corte ou transformação.
* Suporte a navegação por cenas e storyboard visual.
### Negativas / Mitigações
* A validação de integridade deve checar periodicamente se os limites de cenas não ultrapassam o término da timeline.

