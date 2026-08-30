# ADR-026: Política de Version Pinning e Tolerância a Dependências Desatualizadas

## Status
Aceito

## Contexto
Quando um artefato de origem evolui (e.g. Imagem v2 -> v5), consumidores existentes (e.g. Vídeo v4) não devem ser alterados de forma silenciosa ou imprevisível. Ao mesmo tempo, o sistema deve detectar quando há novas versões disponíveis.

## Decisão
1. **Identidade Imutável**: O version pinning baseia-se em `targetVersionId` imutável, utilizando `targetVersionNumber` apenas para apresentação.
2. **Sem Mutações Silenciosas**: Consumidores pinados mantêm a versão congelada e a engine reporta `UPDATE_AVAILABLE` (`DEPENDENCY_UPDATE_AVAILABLE`).
3. **Atualização Transacional**: O método `acceptDependencyUpdate` cria snapshot de segurança do consumidor, atualiza relações e registros de uso físico de assets, valida integridade com `CreativeIntegrityValidator` e executa rollback atômico em caso de inconsistência.
4. **Proteção de Publicados**: Artefatos em status `PUBLISHED` são pinados por padrão e requerem confirmação explícita para atualização de dependências.

## Consequências
- Estabilidade total em composições complexas multimodais.
- Detecção transparente e segura de atualizações sem risco de quebra de renderizações históricas.

