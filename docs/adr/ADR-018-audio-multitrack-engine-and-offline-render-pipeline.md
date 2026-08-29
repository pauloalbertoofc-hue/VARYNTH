# ADR-018: Arquitetura de Motor Multipistas e Pipeline de Renderização de Áudio

## Status
Aceito

## Contexto
A renderização de áudio multipistas em ambiente Local-First no navegador exige somar canais em tempo real ou em lote (offline mixdown) com proteção rigorosa contra exaustão de memória RAM (especialmente ao descomprimir PCM para Float32), garantindo semântica formal e consistente para Mute/Solo e exportação de arquivo WAV com cabeçalho RIFF 16-bit válido.

## Decisão
1. **Guarda Dinâmica de Memória (PCM Float32)**: O motor calcula dinamicamente o volume em bytes antes do processamento (`estimatedDecodedBytes = durationSec * sampleRate * channels * 4`). Se exceder o teto (`128MB`), a operação é bloqueada de forma preventiva com o erro `AUDIO_DECODE_EXCEEDS_RUNTIME_LIMIT`.
2. **Semântica Formal de Mute e Solo**:
   * Se qualquer faixa tiver `solo: true`, apenas as faixas em solo são incluídas na mixagem e reprodução.
   * Caso contrário, todas as faixas com `muted: false` são somadas.
3. **Pancasting com Lei de Potência Constante**: Atenuação de estéreo calculada via seno e cosseno para manter volume perceptivo idêntico em qualquer posição do espectro estéreo.
4. **Normalização Opcional Segura**: A normalização calcula o pico máximo da mixagem final e escala os samples para `-0.2dBFS` exclusivamente durante a exportação, sem alterar as configurações originais de ganho do projeto.
5. **Codificador WAV PCM 16-bit**: Geração local de cabeçalhos RIFF canônicos com clamping estrito de samples entre `-32768` e `32767` para evitar distorção digital ou truncamento silencioso.

## Consequências
* **Positivas**: Renderização determinística e reprodutível; arquivos de áudio compatíveis com qualquer player do mercado; proteção total contra travamentos de navegador por memória excessiva.
* **Trade-offs**: Formatos comprimidos como MP3 dependem de encoders externos; caso não estejam presentes, o sistema reporta honestamente `CAPABILITY_UNAVAILABLE`.

