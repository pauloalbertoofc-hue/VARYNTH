# Audio Studio — Checklist Manual de Validação

Execute em navegador compatível com Web Audio, com permissão de microfone quando necessário.

| ID | Teste e passos | Resultado esperado | Limitação conhecida |
|---|---|---|---|
| 01 | Criar projeto em Branco | Projeto abre com faixa, Master e timeline persistidos | Nenhuma |
| 02 | Criar template Podcast | Host, Guest, Music, SFX e markers aparecem | Nenhuma |
| 03 | Definir duração personalizada | Timeline usa a duração informada | Nenhuma |
| 04 | Importar um WAV | Asset e clip são criados no projeto ativo | Codec depende do navegador |
| 05 | Importar MP3, OGG, FLAC e M4A | Cada formato válido é aceito quando suportado | FLAC/M4A variam por navegador |
| 06 | Arrastar múltiplos arquivos para a timeline | Todos entram na faixa selecionada, no playhead | Apenas arquivos reconhecidos como áudio |
| 07 | Abrir Asset Browser | Nome, formato, duração, tamanho e metadata aparecem | Metadata depende do arquivo |
| 08 | Preview de asset | Preview reproduz o arquivo original | Requer codec suportado |
| 09 | Inserir asset existente | Novo clip usa o mesmo asset sem duplicar arquivo | Nenhuma |
| 10 | Ver waveform | Peaks correspondem ao áudio decodificado | Requer Web Audio ativo |
| 11 | Play/Pause/Stop | Áudio real inicia, pausa e para | Autoplay policy pode exigir clique |
| 12 | Clicar na régua | Playhead busca a posição clicada | Nenhuma |
| 13 | Zoom e fit timeline | Escala horizontal muda sem perder clips | Nenhuma |
| 14 | Mover clip por drag | Clip muda de posição e respeita snapping | Precisão depende do ponteiro |
| 15 | Trim inicial/final | Source range muda sem alterar asset | Handles atuais usam ajustes incrementais |
| 16 | Split no playhead | Dois clips referenciam o mesmo asset | Nenhuma |
| 17 | Duplicar clip | Cópia independente referencia o mesmo asset | Nenhuma |
| 18 | Copiar/colar | Clip é colado no playhead | Clipboard é interno ao Studio |
| 19 | Seleção múltipla | Ctrl/Cmd seleciona vários clips | Nenhuma |
| 20 | Delete | Clips selecionados são removidos do projeto | Asset original permanece preservado |
| 21 | Fade in/out | Fade altera playback/render | Curvas avançadas ainda limitadas |
| 22 | Crossfade | Clips sobrepostos fazem transição suave | Edição visual avançada pendente |
| 23 | Criar track | Nova track aparece e persiste | Nenhuma |
| 24 | Mute/Solo | Playback e render respeitam a semântica | Nenhuma |
| 25 | Volume/Pan | Mudanças afetam playback e export | Nenhuma |
| 26 | Abrir Mixer | Tracks, buses e Master aparecem | Nenhuma |
| 27 | Criar/configurar bus | Track pode ser roteada ao bus | UI de criação de bus ainda é limitada |
| 28 | Configurar send/AUX | Sinal paralelo chega ao bus escolhido | UI de sends ainda é limitada |
| 29 | Adicionar efeito | Insert aparece no Inspector | Parâmetros variam por efeito |
| 30 | Bypass/remover efeito | Processamento muda sem apagar o projeto | Reverb/de-esser/noise reduction pendentes |
| 31 | Criar automação | Ponto de volume/pan é persistido | Edição por arraste ainda pendente |
| 32 | Gravar microfone | REC cria asset e clip na faixa armada | Requer permissão e MediaRecorder |
| 33 | Input monitor | Meter mostra sinal real de entrada | Requer dispositivo selecionado |
| 34 | Undo/Redo | Operações de edição são revertidas/reaplicadas | Histórico é limitado à sessão |
| 35 | Autosave/reload | Projeto mantém clips, tracks, efeitos e markers | Cache de waveform ainda é volátil |
| 36 | Criar versão | Snapshot nomeado é criado | Snapshot lógico não duplica blobs |
| 37 | Restaurar versão | Versão antiga restaura sem apagar versões posteriores | Nenhuma |
| 38 | Exportar WAV | Arquivo renderiza clips, fades, efeitos, buses e Master | Requer OfflineAudioContext |
| 39 | Ouvir exportação | WAV exportado é reproduzível | Codec/player externo pode variar |
| 40 | Testar erro de arquivo | Codec inválido ou asset ausente mostra erro | Mensagens podem ser aprimoradas |
| 41 | Projeto grande | Timeline permanece utilizável com muitos clips | Virtualização avançada ainda pendente |
| 42 | Fechar/reabrir | Estado lógico é recuperado | Recuperação de sessão incompleta |

## Critério de aprovação

O fluxo mínimo aprovado é: criar projeto, importar áudio real, visualizar waveform, reproduzir, buscar, mover, trimar, dividir, aplicar fade, criar faixa, ajustar volume/pan, usar mute/solo, adicionar marker, abrir Mixer, salvar, reabrir, criar versão e exportar WAV reproduzível.

Qualquer teste que dependa de `AudioContext`, `OfflineAudioContext`, `MediaRecorder` ou microfone deve ser executado em browser real; a suíte Node não certifica essas capacidades.
