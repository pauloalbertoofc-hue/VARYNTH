# Video Studio Architecture — VARYNTH OS

O **Video Studio** (Studio 5 da sequência canônica: `DOCUMENT -> WEB -> IMAGE -> AUDIO -> VIDEO -> GAME`) unifica e consolida todas as fundações criativas do VARYNTH OS em uma plataforma de composição e edição audiovisual local-first.

```text
ESPAÇO (Image) + TEMPO (Audio) + NARRATIVA (Document) + ASSETS + RENDER = VIDEO
```

---

## 1. Princípio Fundamental de Vídeo

```text
VIDEO ARTIFACT ≠ SOURCE ASSETS ≠ SCENES ≠ TRACKS ≠ CLIPS ≠ TIMELINE ≠ KEYFRAMES ≠ PREVIEW ≠ RENDER JOB ≠ RENDERED OUTPUT
```

> *"The original is evidence. The editable timeline is interpretation. The render is a derived result."*

### Regras Centrais:
1. **Source Asset Immutability**: Vídeos brutos, imagens, gravações de áudio e roteiros originais são mantidos no `AssetManager` como `isSource: true` e preservados imutáveis.
2. **Edição Não-Destrutiva**: Todas as alterações temporais (`trim`, `split`, `move`), transições, transforms visuais, keyframes, textos e legendas residem em metadados declarativos em `VideoDocumentState`.
3. **Cenas como Visualização Semântica**: `VideoScene` mapeia unidades narrativas da linha do tempo sem duplicar nem divergir da verdade temporal mestre (`VideoTimeline`).
4. **Renderização como Derived Asset**: A renderização local offline produz um `Derived Asset` (`isDerived: true`) vinculado ao artefato, preservando intacta a timeline editável.
5. **Princípio Alex**: O rollback restaura o estado histórico como uma nova versão (`vNext`), preservando todas as versões intermediárias no `VersionManager`.
6. **Prompt-to-Video Honesto**: A Athena orquestra a montagem de vídeos por linguagem natural utilizando assets existentes (`Script + Imagens + Áudio -> VideoCreationPlan -> VideoChangeSet`), reportando honestamente `CAPABILITY_UNAVAILABLE` para geração neural sem modelo local.

---

## 2. TemporalCore & Master Timeline Clock

Para prevenir drift acumulado entre áudio, vídeo, legendas e keyframes em taxas de quadros fracionárias reais (23.976fps, 29.97fps, 59.94fps), o `TemporalCore` opera sobre taxas racionais canônicas:

```ts
interface FrameRate {
  numerator: number;
  denominator: number;
}
```

As conversões temporais passam exclusivamente por funções centrais:
* `timeMsToFrame(timeMs, fps)`
* `frameToTimeMs(frame, fps)`
* `timeToAudioSample(timeMs, sampleRate)`
* `audioSampleToTime(sample, sampleRate)`
* `formatTimecode(timeMs, { fps, showFrames })`

---

## 3. Modelo de Composição Compartilhado (`VideoCompositionModel`)

O Preview em tempo real e a Renderização offline compartilham a mesma semântica de composição:
* **Ordem de Sobreposição de Camadas (Track Layering)**:
  1. `OVERLAY` / `TEXT` (Títulos e Lower Thirds)
  2. `SUBTITLE` (Legendas automáticas sincronizadas)
  3. `IMAGE` / `VIDEO` (Camadas visuais ordenadas)
  4. `AUDIO` (Mixagem multiplexada de voz, música e efeitos)
* **Transformações e Keyframes**: Interpolação linear ou hold de escala, rotação, posição e opacidade.
* **Transições**: `CUT`, `FADE`, `CROSSFADE` e `DISSOLVE` com validação de duração.

---

## 4. Guarda de Recursos e Estabilidade de Memória

A renderização opera por composição frame a frame com descarte imediato de buffers temporários:
* `MAX_VIDEO_DURATION_MS = 3.600.000` (1 hora como teto nominal)
* `MAX_CANVAS_DIMENSION = 4096px`
* `DEFAULT_MAX_WORKING_SET_BYTES = 128MB` (calculado conservadoramente para superfícies ativas, buffers de transição, áudio e fila do encoder).
* Retenção de backpressure para evitar crescimento descontrolado da fila do encoder.

