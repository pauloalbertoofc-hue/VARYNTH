# ADR-021: Preview de Vídeo e Pipeline Determinístico de Renderização Offline

## Status
ACCEPTED

## Contexto
Vídeo consome grande volume de memória e processamento. Carregar vídeos longos inteiros descompactados na RAM causaria travamento imediato da aplicação.
Além disso, encoders locais exigem validação honesta de suporte a codecs e containers.

## Decisão
1. **Guarda de Memória de Trabalho (`estimateWorkingSet`)**: Avalia conservadoramente a pegada de superfícies ativas, buffers de transição, áudio e fila de encoder, bloqueando execuções com teto superior a 128MB.
2. **Processamento Incremental Frame a Frame**: Composição de frame individual, envio para codificação e liberação imediata da memória intermediária.
3. **Detecção Honesta de Capacidades (`canExport`)**: Exportação em WEBM/MP4 somente quando houver encoder e muxer compatíveis. Codecs ou resoluções (ex: 4K em ambiente restrito) não disponíveis reportam `CAPABILITY_UNAVAILABLE`.
4. **Derived Asset Real**: A renderização registra um `Derived Asset` (`isDerived: true`) no `AssetManager` e rastreia o progresso via `JobManager`.

## Consequências
### Positivas
* Estabilidade do navegador sem memory leaks nem travamento da interface.
* Transparência total nas capacidades reais de exportação.
### Negativas / Mitigações
* Resoluções ultra-altas (4K) são desabilitadas quando o runtime não garante estabilidade de memória.

