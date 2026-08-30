# ADR-027: Reuso Físico de Assets e Segurança de Lixeira Cross-Studio

## Status
Aceito

## Contexto
Um único arquivo binário (PNG, WAV, MP4) gerado por um estúdio pode ser consumido por múltiplos outros (Web, Vídeo, Jogo). Era necessário permitir o compartilhamento de assets sem duplicação física, com proteção contra deleção acidental e diagnóstico preciso em caso de envio de artefatos para a Lixeira.

## Decisão
1. **Asset Usage Records Version-Aware**: O `AssetManager` registra detalhadamente `consumerArtifactId`, `consumerVersionId`, `usageSlot`, `sourceArtifactId` e `sourceVersionId`.
2. **Princípio Alex no Garbage Collection**: Um asset não é considerado órfão enquanto for referenciado por qualquer artefato ativo OU qualquer versão histórica preservada no `VersionManager`.
3. **Distinção entre Soft Break e Hard Break**: Quando a origem de um asset vai para a Lixeira, o estado do consumidor é marcado como `SOURCE_TRASHED` (degradação semântica mas reprodução física intacta), enquanto a ausência do arquivo em disco/storage é diagnosticada como `ASSET_MISSING`.

## Consequências
- Economia máxima de armazenamento e renderização offline.
- Rastreamento confiável de dependências de baixo nível e segurança na limpeza de lixeira.

