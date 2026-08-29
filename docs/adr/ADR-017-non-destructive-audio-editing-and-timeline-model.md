# ADR-017: Modelo de Edição Não-Destrutiva de Áudio e Linha do Tempo

## Status
Aceito

## Contexto
Diferente de textos ou códigos-fonte, áudio digital envolve arquivos binários pesados de fluxo contínuo no tempo. Na edição convencional simplista, operações de corte (trim/split) ou alteração de ganho reescrevem o arquivo binário, destruindo partes da gravação original e impedindo reversões granulares. O VARYNTH OS necessita de um modelo onde fontes brutas de áudio permaneçam imutáveis como evidência primária, permitindo que a linha do tempo seja uma representação declarativa puramente matemática.

## Decisão
1. **Source Assets Imutáveis**: Arquivos de áudio importados são armazenados no `AssetManager` com a flag `isSource: true` e nunca sofrem mutação física em disco.
2. **Clips como Ponteiros Temporais**: A entidade `AudioClip` referencia um `assetId` definindo janelas virtuais através de `sourceStartMs` e `sourceEndMs`, permitindo múltiplos clips apontando para o mesmo arquivo físico com offsets distintos.
3. **Cortes Sem Perda de Dados**: A divisão de clip (`split`) gera dois clips independentes (`clip-a` e `clip-b`) particionando as janelas de origem sem tocar no arquivo subjacente.
4. **Isolamento de Undo/Redo e VersionManager**: A movimentação e corte de clips em tempo real operam em uma pilha de histórico em memória (`AudioCommandHistory`) sem registrar novas versões a cada pixel ou milissegundo de edição.
5. **Rollback sob o Princípio Alex**: Reversões históricas geram uma nova versão sequencial (`vNext`), preservando todas as versões intermediárias.

## Consequências
* **Positivas**: Soberania e integridade absoluta dos áudios originais; consumo eficiente de armazenamento (sem duplicação de áudio por corte); reversibilidade instantânea de qualquer corte ou split.
* **Trade-offs**: A reprodução em tempo real e a mixagem exigem que o motor de áudio calcule dinamicamente os offsets e envelopes de ganho de cada clip durante a leitura.

