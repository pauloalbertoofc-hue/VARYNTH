# Audio Studio Architecture — VARYNTH OS

## 1. Visão Geral
O **Audio Studio** é o quarto estúdio oficial da sequência arquitetural canônica do VARYNTH OS:
```text
DOCUMENT (Studio 1) -> WEB (Studio 2) -> IMAGE (Studio 3) -> AUDIO (Studio 4) -> VIDEO (Studio 5) -> GAME (Studio 6)
```

Sua finalidade é capacitar o sistema a representar, manipular e mixar a dimensão de **tempo contínuo, pistas de áudio (multitrack), clips temporais e waveforms derivadas** sem qualquer dependência de IA generativa ou serviços em nuvem.

---

## 2. Princípio Fundamental de Áudio
```text
AUDIO ARTIFACT ≠ SOURCE AUDIO ≠ TRACKS ≠ CLIPS ≠ TIMELINE ≠ EFFECTS ≠ MIX ≠ RENDERED OUTPUT
```

> *"The original is evidence. The editable timeline is interpretation. The render is a derived result."*

### Regras Centrais:
1. **Source Asset Immutability**: Os arquivos de áudio originais importados são registrados no `AssetManager` com `isSource: true` e preservados imutáveis.
2. **Edição Não-Destrutiva**: Todas as alterações temporais (`trim`, `split`, `move`, `volume`, `pan`, `fadeIn`, `fadeOut`) modificam exclusivamente metadados declarativos em `AudioDocumentState`.
3. **Clips Referenciam Fontes**: Múltiplos clips podem referenciar a mesma fonte de áudio em janelas temporais distintas sem duplicação de arquivos no disco.
4. **Waveform é Dado Derivado**: Os picos da forma de onda (waveform peaks) são calculados localmente e mantidos em cache leve, sendo liberados da RAM quando desnecessários.
5. **Renderização como Derived Asset**: A mixagem multitrack produz um `Derived Asset` (`isDerived: true`) em formato WAV PCM 16-bit real sem sobrescrever o artefato de origem nem achatar a timeline editável.
6. **Sessão Undo / Redo Separada do VersionManager**: Pilha de comandos em memória (`AudioCommandHistory`) ágil para operações de corte e movimentação sem poluir o histórico formal de versões.
7. **Princípio Alex**: O rollback restaura o estado histórico como uma nova versão (`vNext`), preservando todas as versões anteriores no histórico.

---

## 3. Topologia e Fluxo de Dados
```text
[Arquivos de Áudio Importados (WAV, MP3, OGG)]
           │
           ▼
   [AssetManager (isSource: true)] ──► [Waveform Peak Generator (Cache Derivado)]
           │
           ▼
[AudioDocumentState (Timeline + Tracks + Clips + Fades)]
           │
           ├──► [AudioCommandHistory (Undo/Redo de Sessão)]
           ├──► [Athena Audio Actions (ChangeSets Atômicos com Snapshot Prévio)]
           │
           ▼
 [AudioDeterministicEngine (Offline Mix PCM 16-bit + Memory Guard + Normalização)]
           │
           ▼
   [AssetManager (isDerived: true)] ──► [Exportação de Arquivo WAV Real]
```

---

## 4. Segurança e Proteção de Recursos
* **Guarda Dinâmica de Memória (PCM Float32)**: `estimatedDecodedBytes = durationSeconds * sampleRate * channels * 4`. Se exceder o limite seguro (`128MB`), a decodificação é bloqueada imediatamente com erro `AUDIO_DECODE_EXCEEDS_RUNTIME_LIMIT`.
* **Detecção Honesta de Capacidades (`canExport`)**: Exportação WAV nativa; formatos não compiláveis retornam `CAPABILITY_UNAVAILABLE`.
* **Ciclo de Vida do AudioContext**: Gerenciamento centralizado com liberação explícita de referências para o Garbage Collector.

