# VARYNTH Audio Studio — auditoria de conclusão da próxima versão

Data da auditoria: 23/09/2026
Escopo-fonte: pedido integral anexado, seções 0–110 e marcos A–Q, conferido contra o checkout local.
Situação do release: **em andamento; alterações locais, não publicadas**. Esta auditoria substitui resultados históricos incompatíveis abaixo pela rodada verificada em 23/09/2026.

## Resumo executivo

O checkout contém uma base local-first ampla de edição não destrutiva, Music Domain, MIDI, Piano Roll e Score sincronizados, synth local, loop musical, provider contract sem provider configurado, perfil editorial da Euterpe, Voice/Analysis, WAV/stems, sampler e Game Audio. O sampler melódico por faixa está ligado às notas musicais no playback e render offline, incluindo pitch-rate, ADSR, filtro, ganho, validação de bounds e crossfade de loop não destrutivo. A cobertura E2E confirma C3/C4/C5 no WAV PCM renderizado por sampler real associado a uma faixa INSTRUMENT e asset 440 Hz, com as três frequências verificadas dentro de 8 Hz; a sequência C4–E4–G4–C5 continua validada separadamente no Score/Piano Roll, Undo/Redo, reload, playback e export. Também foi corrigida a seleção no inspector para que clips previamente selecionados não ocultem controles da faixa, e o nome da faixa ganhou botão acessível por teclado para seleção. Nesta rodada, os dois E2Es de Drum Sequencer e sampler passaram em execução conjunta (2/2), `npx tsc --noEmit` e ESLint focal passaram, e `npm run test:audio-studio` terminou em 39 aprovados/0 falhas/4 skips ambientais. `npm run build` também passou: compilação, typecheck e 62 páginas estáticas; pré-gates documentais 43 rotas/36 ferramentas/12 agentes/18 módulos e certificação Athena 15/15. `git diff --check` passou. Permanecem lacunas: aceite manual/hardware, provider real, instrumento de piano sampleado/licenciado, multi-sampling, preview/detecção de seam, operações avançadas de arranjo/variações, áudio adaptativo/standalone completo e execução integral dos checklists manuais.

As fases anteriores ligaram os buses ao mixer real, corrigiram medição duplicada/rotas de áudio, implementaram bus-solo, pan e sends, geração por provider autorizado, proveniência, Voice/Analysis, transpose de Music Clips e `concertPitchHz`. Nesta continuação, migração/persistência foram exercitadas por reload de navegador incluindo WAV/MIDI/Voice; o armazenamento binário agora usa structured clone em `asset_blobs`, ArrayBuffer é normalizado para Blob, WAV PCM lê duração do cabeçalho, e clips curtos mantêm área de seleção sem alças de trim sobrepostas. Os gates relevantes passaram. Isso reduz lacunas, mas não equivale a disponibilizar um provider nem a concluir as capacidades abaixo.

Nesta rodada, a Tempo Track foi adicionada em Piano Roll e Score; editar seu mapa durante playback atualiza o agendamento de notas e metrônomo sem reiniciar fontes de clips de áudio. O E2E cobriu nota futura, edição de BPM com transporte ativo e persistência após reload. A suíte Audio manteve 39 aprovações/0 falhas/4 skips ambientais; TypeScript, ESLint focal, regressão documental, Athena 15/15 e build de produção com 62 páginas passaram após as alterações.

## Legenda

- **Feito**: evidência direta no código e teste pertinente.
- **Parcial**: modelo ou caminho básico existe, mas falta parte explícita do requisito, integração ou verificação.
- **Pendente**: não existe implementação utilizável ou depende de uma decisão/serviço externo.

## Matriz requisito por requisito

| Nº | Requisito do pedido | Estado | Evidência e lacuna restante |
|---:|---|---|---|
| 0 | Auditoria prévia, reuso, compatibilidade, migrações | Parcial forte | Modelos, serviços, engines, UI, persistência, migrations e testes foram inspecionados; migrations de schema 1→4 existem. Este arquivo acompanha os 110 itens. Checklist manual registra 49 cenários e permanece não executado integralmente; aceite auditivo/hardware também pendente. |
| 1 | Editar + Compor + Criar convergindo em timeline/mixer/export | Parcial | Os modos compartilham o projeto e a timeline; provider gerativo e algumas ferramentas de criação ainda não produzem/ligam material real. |
| 2 | Audio, Voice, Dialogue, Music, Instrument, MIDI, SFX, Foley, Ambience, Reference, Bus/Aux | Feito no modelo/UI | Tipos são criáveis e Bus/Aux é criado no Mixer como canal dedicado. Ainda falta validar cada tipo em uma sessão real e eventual tratamento contextual por tipo. |
| 3 | Modelo musical serializável: notas, pitch, duração, tempo, meter, key, escala, acorde, pausa, compasso, articulação, dinâmica, expressão | Parcial forte | `music-domain.ts` e `types.ts` modelam notas, voz polifônica opcional, pitch, duração, tempo, meter, key, escala, acorde, pausa, articulação e expressão; dinâmica formal e semântica completa de notação ainda não estão completas. Expressão, articulação e voz permanecem serializáveis, e expressão/articulação afetam playback/render. |
| 4 | Pitch, acidentes, oitavas, conversões MIDI/frequência centralizadas | Feito no domínio | `pitchToMidi`, `midiToPitch`, `midiToFrequency`, `pitchToFrequency`; testes cobrem conversões básicas. Falta cobrir sequência musical completa em playback/reload. |
| 5 | 12-TET e A4 configurável/extensível | Parcial | `concertPitchHz` é aplicado nos sintetizadores de playback/export e a frequência de A4=442 tem teste de domínio; faltam validação de projeto persistido e comportamento em instrumentos futuros. |
| 6 | Durações, pontuação, ligaduras, pausas, tuplets | Parcial forte | Enum e conversões cobrem até 1/32, duração pontuada, rests e tie; notas aceitam proporção tuplet `actual/normal`, o Piano Roll edita a razão, playback/render aplicam a duração efetiva, MusicXML exporta `<time-modification>` e PDF preserva texto e bracket gráfico simples, com testes de domínio, E2E e exportação. Gravação tipográfica completa em pauta ainda falta. |
| 7 | BPM e mapa de tempo | Feito no domínio; integração parcial | Conversões e mapas variáveis são testados; ainda falta provar todos os pontos de automação/transport em um arranjo longo com mudanças de BPM. |
| 8 | Compassos e mudanças de fórmula | Parcial | Projeto aceita fórmula de compasso e conversões de beat/bar; não há mapa variável de compassos durante a peça. |
| 9 | Tonalidade e escalas | Parcial forte | Piano Roll permite editar tônica e escala, persiste o `MusicProjectState`, confirma os valores após reload, informa visualmente quantas notas estão fora da escala e oferece correção explícita em lote pela nota diatônica mais próxima; integração da validação em todas as operações musicais ainda é incompleta. |
| 10 | Acordes | Parcial forte | Score View cria, lista, seleciona e atualiza acordes maiores/menores, diminutos, aumentados, suspensos e sétimas com inversão 0–3, extensão 9ª/11ª/13ª e voicings `close`, `drop2` e `spread`; notas materializadas carregam `chordId`, e o domínio rematerializa somente as notas relacionadas ao acorde selecionado, preservando `chords`. Edição independente de cada nota do acorde ainda falta. |
| 11 | Piano Roll | Parcial forte | Criar/selecionar/mover/redimensionar/editar/duplicar/apagar, lane visual de velocity, inspector de tonalidade/escala, articulação/expressão e sincronização Music Clip/Score estão implementados; ainda faltam usabilidade/performance para projetos grandes e notação de múltiplas vozes. |
| 12 | Partitura com claves, compassos, acidentes, ligaduras, pausas, vozes e export futuro | Parcial forte | Score View compartilha e edita o modelo musical, permite selecionar voz 1–4 e diferencia visualmente as vozes; exportações MusicXML 4.0 e PDF local preservam metadados e conteúdo básico. MusicXML preserva a voz por nota, usa `<backup>` entre linhas temporais, `<forward>` para offsets internos e `<chord/>` para sobreposições no mesmo início; ainda faltam renderização convencional completa e notação avançada. |
| 13 | VARYNTH Piano tocável por clique e integrado | Parcial forte | Teclado visual C4–C5 no painel MIDI, mapeamento A–K do teclado do computador e pedal visual de sustain disparam `noteOn`/`noteOff`/`setSustain` no `LocalSynthInstrument` real; o E2E confirma tecla e pedal. Timbre de piano amostrado/licenciado ainda falta. |
| 14 | Instrument Engine extensível e presets | Parcial forte | Contrato noteOn/noteOff/parâmetros/preset/dispose, piano clicável, oscilador local, UI de parâmetros e versionamento/importação/exportação de presets existem; ainda faltam mais instrumentos/provedores. |
| 15 | MIDI import/export, canais, CC e hardware Web MIDI | Parcial forte | Importação por tracks, formato 0/1, notas/velocity/tempo, painel de detecção/seleção/conexão Web MIDI, Note On/Off, CC 7/74/64, sustain, pitch bend de ±2 semitons, gravação no Music Clip selecionado e ciclo de desconexão estão cobertos com falha fechada. A gravação converte a tomada para beats por BPM e fecha notas abertas ao parar; ainda faltam gravação multipista avançada, CC amplo e validação manual com hardware/permissões reais. |
| 16 | Quantização não destrutiva e reversível | Parcial forte | Funções guardam início original e intensidade; Piano Roll oferece `Reverter quantização` sem alterar velocity, integrado ao histórico, e o E2E confirma aplicar/restaurar a operação. Persistência/reload dedicada de cada variação de quantização ainda falta. |
| 17 | Velocity/dinâmica visual mapeada ao instrumento | Atendido | Piano Roll possui lane visual de velocity, edição individual/em lote e o valor é mapeado ao ganho do synth e do render offline. |
| 18 | Articulação e expressão | Atendido | Playback e render traduzem legato, staccato, accent, tenuto e sustain no envelope; `expression` escala o ganho de forma determinística e os campos permanecem no modelo serializado. |
| 19 | Metrônomo sincronizado, volume, acento e count-in | Parcial | Playback usa BPM/compasso, volume/acento e count-in configurável de 0 a 2 compassos, com testes browser; ainda falta teste dedicado de deriva sob mapa de tempo variável. |
| 20 | Loop musical por compassos com transporte repetindo precisamente | Feito no caminho E2E principal | Região serializada em beats e transporte testado em navegador; falta teste de reopen/reload e mudanças de tempo dentro da região. |
| 21 | Music Clips editáveis, movíveis, duplicáveis, loopáveis, transponíveis | Parcial | Modelo, MIDI import, render e alguns editores existem; transposição é aplicada no flatten/playback/render; faltam validações de todas operações e integração completa com timeline/Undo. |
| 22 | Transpose em semitons/oitavas preservado no histórico | Parcial | `transposeSemitones` agora afeta playback/render e tem teste de domínio; falta cobrir Undo e persistência em reload. |
| 23 | AudioGenerationService desacoplado e funciona sem provider | Parcial | Interface extensível, capabilities, validação e falha honesta; nenhum provider está registrado/configurado no produto atual. |
| 24 | Pedido estruturado e resultado com asset/provider/settings/proveniência | Parcial forte | Contratos validados; callback agora exige asset existente, vincula, insere, define duração e grava proveniência. Falta teste ponta a ponta com provider de teste que registre asset verdadeiro. |
| 25 | Ambience Generator com parâmetros ambientais e resultado asset real | Parcial forte | Além do formulário para provider, Sound Design agora gera localmente WAV PCM real e persistido para chuva, vento e floresta, com intensidade, densidade e distância registradas na proveniência; E2E valida floresta procedural e inserção. Geração ambiental de maior fidelidade e provider autorizado continuam pendentes. |
| 26 | Layers de ambiente independentes, automação, mute, randomização e stems | Parcial forte | Painel “Ambience Layers” opera faixas AMBIENCE persistidas: criar/renomear, ganho, pan, mute/solo, saída para bus, inserção de asset local na faixa selecionada, automação existente e export individual por stem. E2E exercita duas camadas, controles, inserção, automação e WAV stem. A barreira de persistência antes da inserção elimina corrida com autosave atrasado. Não há seleção aleatória/sequenciamento por estado de jogo ou geração ambiental; espacialização de clips existe no inspector separado e no runtime. Aceite humano de qualidade/uso ainda pendente. |
| 27 | Loop perfeito, crossfade, preview repetido e assistência de seam | Parcial forte | Audio Studio permite editar região source-relative e duração do crossfade; utilitário DSP cria seam tail→head equal-power em buffer temporário, compartilhado por playback Web Audio e render OfflineAudioContext sem alterar a fonte. Teste unitário cobre seam, limites, não mutação e crossfade zero; E2E exporta WAV com loop parcial/crossfade. Preview visual/audível repetido dedicado, detecção/assistência automática de seam e audição manual em navegadores/dispositivos reais seguem pendentes. Game Studio usa a mesma transformação no runtime Web Audio; E2E cobre reprodução, pause/resume e WAV.
| 28 | Variation Groups com pesos, tags e seleção futura pelo Game Studio | Parcial forte | Modelo, parser/validação, seleção ponderada seedada e controles visuais para grupo por faixa, peso por clip e seed compartilhada entre faixas do grupo estão implementados e exportados. Seleção múltipla aplica atomicamente grupo/seed, peso/ranges e tags de projeto aos clips/faixas escolhidos; E2E valida dois membros. Tags por clip são deduplicadas/exportadas sem mutar metadata compartilhada. Browser pesquisável de grupos/membros/tags/eventos mostra validade do pacote e navega ao clip de origem. Teste determinístico verifica 20 mil seeds, proporção 1:3 dentro de tolerância de 1,5 ponto percentual e exclusão de peso zero. Game Studio consome grupos no Play Mode. Ainda faltam operações avançadas de membros/rebalanceamento e validação estatística de múltiplas distribuições/categorias.
| 29 | SFX Creator com categorias e múltiplas variações | Pendente/provider | Formulário de geração genérico, sem taxonomia específica/editor de grupo e sem provider configurado. |
| 30 | Sound design procedural: noise/filter/envelope/LFO/modulação/delay/reverb | Parcial forte | Web Audio oferece osciladores, filtros, compressor, delay, LFO de filtro, reverb procedural por impulso e gerador local de ruído branco/rosa em WAV; o gerador de ambience acrescenta síntese determinística de chuva/vento/floresta com parâmetros ambientais. Modulações adicionais e composição visual de grafo ainda faltam. |
| 31 | Synth com waveforms, frequency/detune/gain/ADSR/filter/LFO | Parcial | Osciladores locais, waveform, ganho, detune, ADSR, filtro e LFO de filtro estão expostos no Studio e persistem no preset; frequência avançada e modulações adicionais ainda faltam. |
| 32 | Editor/visualizador ADSR aplicado ao synth | Atendido | Curva ADSR visual e controles editáveis de attack/decay/sustain/release estão integrados ao preset; alterações são persistidas e reutilizadas no playback/render. |
| 33 | Voice Studio, provider, preview, takes, emoção, idioma e pós-processamento | Parcial | Voice está acessível; rascunhos são editáveis, geração explícita tenta provider e associa asset real se houver; provider, preview A/B e pipeline vocal dedicado faltam. |
| 34 | Identidade persistente Euterpe, referência de provider, sem segredos no projeto | Parcial | Perfil migra/persiste; configuração segura de credenciais/provider e associação de configurações reais não existem. |
| 35 | Voice Bible editorial e estados expressivos sem áudio falso | Feito como direção editorial | Perfil e estados existem; provider não informa suporte ainda, pois não está configurado. |
| 36 | Versões de perfil, referência de provider, parâmetros e amostras | Parcial | `profileVersion` é salvo no take; fluxo de criar/comparar/versionar profiles e parâmetros efetivamente usados está incompleto. |
| 37 | Voice Preview Lab A/B/favoritar/anotar | Parcial | Voice Studio agora oferece favoritos, anotação editorial e marcação A/B persistível por take; o E2E cria os metadados, recarrega a página e confirma a restauração; preview de áudio real continua dependente de asset/provider e ainda não há comparador sonoro dedicado. |
| 38 | Múltiplos Voice Takes sem destruir versões | Parcial forte | Takes e seleção existem, sem apagar versões; metadados de favorito, anotação e slots A/B são editáveis, persistidos e validados após reload no E2E. Preview/playback comparativo de takes com assets reais ainda precisa de fluxo dedicado. |
| 39 | Cadeia vocal EQ/de-esser/compressor/noise/gain | Parcial forte | Voice Studio permite ativar/desativar e persistir EQ, de-esser, compressor, noise gate e gain, além de parâmetros de ganho, gate, de-esser e ratio do compressor; `voice-processing.ts` aplica a cadeia local determinística sobre WAV PCM 16-bit, rejeita formatos inválidos e a ação `Processar localmente` cria asset derivado, preserva a fonte e atualiza o take com rastreabilidade. Aceitação auditiva profissional, parâmetros avançados de EQ/compressor e processamento de formatos não-PCM ainda faltam. |
| 40 | Dicionário de pronúncia | Parcial forte | Voice Studio agora permite adicionar, editar e remover entradas com forma escrita, pronúncia, idioma e notas; o perfil é salvo no estado do projeto e o E2E confirma restauração após reload. A passagem efetiva ao provider continua condicionada à integração de provider autorizado. |
| 41 | Fala contextual separada do Audio Engine | Pendente | Nenhum agente de fala contextual conectado ao Voice Studio. |
| 42 | Asset Library com categorias e metadados sonoros | Parcial forte | Biblioteca lista, pré-visualiza e insere assets reais. WAV fornece duração/taxa/canais/bit depth do container; em outros formatos duração e canais podem vir do decoder, mas taxa original desconhecida continua desconhecida. Anotações uniformes de categoria/tags/personagem/BPM/key/declaração de licença/atribuição/notas são persistidas por projeto (schema 4); não alteram bytes, `AssetFile` compartilhado nem licença/provider de origem. E2E verifica reload e declaração não verificada; E2E adicional remove duração de um registro legado, mede pelo blob WAV, insere o clip e confirma que a duração medida passa a constar na biblioteca. A inserção reaplica o snapshot de edição mais recente após aguardar os bytes; regressão AUDST-REG-039 intercala edição durante a medição e prova que não é perdida. Formulário oferece facts da origem somente leitura; revisão jurídica ainda é manual. |
| 43 | Busca textual/filtros por tags, personagem, BPM, key | Parcial forte | Busca por tokens sem distinção de acento e filtros por categoria/tag/personagem/BPM/key, duração mínima/máxima, sample rate e canais. Facetas são calculadas somente de valores medidos; duração desconhecida não passa faixa numérica e intervalos invertidos são informados. WAV 100 ms/44,1 kHz/mono e persistência do overlay são cobertos em E2E; codecs adicionais, milhares de assets e a interação por projeto exigem validação de escala. |
| 44 | GameAudioPackage consumível pelo Game Studio | Parcial forte | Export JSON v1 inclui assets deduplicados com MIME/duração/tags/proveniência disponível, eventos por clip, loops e grupos ponderados. Importação valida pacote e exige assets usáveis locais; Game Studio persiste o pacote no documento, inclui dependências no build manifest e Play Mode reproduz assets locais. O JSON não contém bytes, build autônomo não inclui um runtime consumidor completo, e a cobertura de licenciamento comercial segue pendente. |
| 45 | Audio Events para clips/variações/loops/faixas | Parcial forte | Evento `PLAY` por clip é serializado com track/clip/assets, grupo, loop/crossfade, ranges editáveis e condições opcionais por variável (`EQUALS`, `NOT_EQUALS`, `GREATER_THAN`, `LESS_THAN`, `CONTAINS`). Parser falha fechado e o Play Mode bloqueia eventos cujas condições não passam; ainda faltam gatilhos/eventos além de PLAY e consumo no jogo exportado/autônomo. |
| 46 | Randomização controlada e reprodutível | Parcial forte | Variações são escolhidas por pesos com seed e volume/rate variam nos ranges serializados; o Play Mode agora produz uma sequência ponderada determinística que evita repetição imediata quando há alternativas; falta distribuição estatística em lote, pitch/intensidade perceptual e política/configuração de seed exposta ao usuário. |
| 47 | Áudio espacial mono/stereo/position/distance/pan | Parcial forte | Clips têm inspector de posição X/Y/Z, distância de referência/máxima e rolloff; o Audio Engine usa PannerNode HRTF/inverse e projetos antigos mantêm pan estéreo. Game Audio JSON preserva os campos e o Web Build aplica a mesma espacialização, com testes de roundtrip e runtime. Aceite auditivo em fones/alto-falantes, automação espacial e edição de trajetória ainda não existem. |
| 48 | Intents estruturados de Euterpe como diretora sonora | Pendente | Não existe camada de intenção para converter pedidos textuais em configuração musical/ambience validada. |
| 49 | Responsabilidades Athena/Euterpe/Audio Engine | Parcial | Camadas e contratos separados existem; ações e integração Euterpe/Athena nesta área ainda não cobrem a proposta. |
| 50 | Geração musical via provider e resultado áudio/MIDI/ambos | Parcial/provider | Tipo `music` faz parte do contrato genérico; intent musical estruturado e providers de áudio/MIDI não estão configurados. |
| 51 | Ações estruturadas de composição e Undo compartilhado | Parcial forte | Piano Roll aplica quantização/humanização somente à seleção quando há seleção, ou a todas as notas quando não há, permite velocity em lote e mantém transposição/duplicação/exclusão/gestos multi-nota editáveis. Cada `onChange` passa pelo histórico do Studio; a sincronização atualiza `music.clips[*].notes` por ID, preserva clips de outros tracks e clips segmentados do mesmo track, e insere notas novas no clip primário ou no primeiro clip do track como fallback determinístico, sem duplicar a lista legada. Operações específicas de nota/tempo/key/clip/instrument/automation ainda não estão todas integradas ao mesmo ChangeSet persistente da Athena. |
| 52 | Humanize opcional, reversível e não automático | Parcial forte | Utilitário seedado, botão explícito de humanização e comando “Reverter humanização” no Piano Roll preservam/restauram valores originais; Undo/Redo e reversão separada de quantização também estão disponíveis, mas ainda falta verificação específica em clips ativos persistidos. |
| 53 | Peak/RMS/LUFS/spectrum/pitch/tempo/transientes confiáveis | Parcial forte | Há LUFS integrado mono/estéreo por análise do trecho-fonte selecionado (K-weighting/gates BS.1770), peak/RMS de amostra e alerta de pico inter-sample interpolado 4×, além de estimativa de BPM/transientes por envelope de energia com confiança e falha fechada. O pico interpolado é aproximado e não certificação true peak ITU; não inclui processamento da timeline, multicanal >2 ou beat tracking avançado. Spectrum usa engine real e pitch YIN no tuner de entrada/clipe; ambos ainda precisam de validação manual com fontes reais. |
| 54 | Tuner de input/clip com nota, frequência e cents | Parcial forte | Tuner de entrada pede microfone sob ação explícita e o Analysis também estima pitch de clipes a partir dos bytes locais, apresentando nota/frequência/cents/confiança quando YIN atinge o limiar. Ambos tratam ausência de confiança sem inventar nota; input trata negação/dispositivo indisponível e encerra stream ao parar/desmontar. Validação com hardware/instrumentos reais e fontes polifônicas continua pendente. |
| 55 | Spectrum Analyzer conectado ao áudio real | Feito parcialmente | Espectro usa analyser do Audio Engine, sem animação falsa; modo parado fica sem sinal, como esperado. |
| 56 | Inspector musical para clip e nota | Parcial forte | Piano Roll mantém contexto de tonalidade/escala, correção tonal explícita, frequência calculada, articulação, expressão, transposição cromática por semitom e velocity visual no fluxo do inspector; BPM/compasso, quantize e humanize continuam expostos no cabeçalho por serem operações globais e o instrumento permanece definido no track/synth. |
| 57 | Navegação Timeline/Mixer/Piano Roll/Score/Assets/Sound/Voice/Analysis | Parcial forte | Modos existem e Voice/Analysis foram conectados; falta validar consistência de troca/persistência e evitar painéis laterais concorrentes. |
| 58 | Full mix, região, faixa, stems, SFX, loop, variation, MIDI e futuro MusicXML/PDF | Parcial forte | WAV/mix/região/faixa/stems, MIDI, MusicXML e PDF local existem; exportação de clip individual usa alvo `CLIP`, região source/timeline do clip e restringe o render ao ID selecionado, cobrindo SFX/loop/variation como áudio do clip. E2E verifica importação, seleção, downloads RIFF/MusicXML/PDF e nomes sem extensão duplicada. Game Audio possui bundle ZIP local com JSON, bytes e hashes SHA-256; ainda não é um jogo autônomo com runtime exportado. |
| 59 | Proveniência/licença completa para gerado/importado | Parcial forte | Clip gerado agora armazena provider/data/settings/license; assets importados e dados comerciais ainda precisam de formulário/política uniforme. |
| 60 | Custos, geração explícita, preview, cancelamento, cache/reuso | Parcial forte | Geração continua explícita, recebe `AbortSignal` e falha fechada sem provider; o serviço agora reutiliza respostas validadas por provider e pedido normalizado, expõe invalidação/tamanho do cache e evita chamada duplicada. Custos, preview e cancelamento efetivo dependente da cooperação do provider ainda faltam. |
| 61 | Segredos apenas no backend/configuração segura | Parcial/pendente de provider | Nenhum segredo foi adicionado; não existe integração de provider remoto que prove arquitetura server-side segura. |
| 62 | Offline-first: edição, mix, gravação, synth, MIDI, notation, export | Parcial forte | Base local-first, MIDI, editor, Web Audio e WAV existem; notation instrumental/Piano e algumas funções gerativas dependem de recursos ainda incompletos. |
| 63 | Undo/redo para notas, quantize, transpose, synth, loops, takes, geração | Parcial forte | Alterações musicais passam pelo histórico do AudioService, os controles Desfazer/Refazer refletem dinamicamente a disponibilidade real das pilhas por projeto e o E2E confirma desfazer/refazer uma transposição no Piano Roll inclusive após reload; ainda falta cobertura dedicada para cada classe de operação. |
| 64 | Versionamento de composição/arranjo/sound design/mix/master | Parcial | Version snapshots incluem estado geral; labels/fases específicas e verificação de recuperar assets/estados novos faltam. |
| 65 | Performance para milhares de notas/assets/analyzers | Parcial | Medidores têm atualização limitada e caches existem; virtualização/benchmark/memória em projeto grande e Score/Piano Roll não verificados. |
| 66 | Testes unitários listados no requisito | Parcial forte | Suites cobrem pitch/tempo/duração/quantize/transpose/chords/MIDI/clips/voice/provider/migration/variations; falta referência completa de instrumento, loop seam, serialization avançada e propriedades. |
| 67 | Fluxos de integração Piano→som, Score↔Piano, save/reload, ambience/voice→export | Parcial forte | E2E prova Score↔Piano, MIDI audível/stems, WAV→Game Audio JSON→importação no Game Studio→regra→Play Mode com reprodução do asset e criação de camadas AMBIENCE→asset local→automação→stem WAV. Provider→asset→effects→export e Voice→export seguem sem provider real configurado. |
| 68 | Referência A4/MIDI e sequência C4-E4-G4-C5 completa | FEITO no fluxo 12-TET coberto | Domínio comprova A4=440/C4=MIDI60; E2E confirma C4–E4–G4–C5 sincronizadas entre Score/Piano, persistidas após reload e no WAV por medição de frequência. Microtonalidade/temperamentos alternativos não fazem parte desta referência inicial. |
| 69 | Checklist manual de 49 cenários com passos/esperados/erros/limites | Parcial | O roteiro executável de 49 cenários está em `docs/audio/audio-studio-manual-acceptance-checklist.md`, com passos, resultados esperados, estados, evidência, dependências e bloqueios explícitos. AS-46 cobre camadas AMBIENCE, AS-47 Asset Library/metadata, AS-48 análise de áudio e AS-49 exportação de clip individual; a execução humana integral em browsers/hardware/provider continua pendente. |
| 70 | Aceite Composition/Score/Sound Design/Game Audio/Euterpe real | Parcial forte | MIDI render audível, Score compartilhado, camadas de ambience a partir de assets locais e Game Audio integrado ao Play Mode existem; geração de ambience/voice ainda depende de provider e Game Studio ainda não exporta um jogo autônomo com binaries e runtime completo. |
| 71 | Não criar UI falsa/áudio fake/secret/hardcode/quebrar legado | Parcialmente atendido | Providers falham fechados; alterações mantêm campos opcionais e migrations. Ainda é preciso ampliar revisão manual para cada controle e caminho de falha. |
| 72 | Fases A–P em ordem de dependência | Parcial | A–G e O têm fundações; H–N e P ainda possuem lacunas explícitas acima. Não declarar as fases completas com base em presença de telas/modelos. |
| 73 | Lint, types, unit/integration/E2E/build/migrations/legacy/new save+reload/audio real/manual report | Parcial forte | Ver estado de execução datado ao final deste relatório. Build final local, já com a correção de metadata, compilou TypeScript e gerou 49 páginas; prerender terminou em 2,2 s, sem retry. Execução anterior havia registrado retries >60 s, mas o sintoma não se reproduziu. Permanecem aceites manuais, hardware e release. |

## Bloqueios e dependências externas

1. **Provider autorizado de áudio/voz/música:** nenhum está registrado. A próxima versão continua utilizável localmente, mas geração real, Voice Preview Lab e geração de ambience dependem de integração e credenciais seguras no backend. Não se deve simular esse resultado.
2. **VARYNTH Piano:** falta decidir/licenciar timbre de piano (samples redistribuíveis) ou aprovar synth de piano procedural mais convincente; o synth atual não deve ser chamado de piano.
3. **Prioridades de produto:** nenhuma escolha bloqueia o trabalho atual de estabilização local; essas dependências só impedem afirmar os critérios gerativos como prontos.

## Próximos lotes recomendados, por dependência

### Lote 1 — estabilização do caminho de sinal (P0)

- Executar typecheck, toda suite de domínio e E2E atual após as mudanças de Mixer, faders, sends, bus-solo, Voice/Analysis e inserção gerativa.
- Adicionar testes em render real para sends pre/post-fader, pan de bus/Master, fade/automação numa região renderizada e roteamento inválido.
- Verificar playback (não só OfflineAudioContext), medição de bus sem duplicar sinal, M/S/Solo combinado e STOP/PAUSE/SEEK sem fontes órfãs.
- Corrigir bugs observados e então rodar build de produção/gates de docs.

### Lote 2 — integridade musical e sessão (P0)

- Aplicar `concertPitchHz` do projeto a todo playback/render synth; aplicar `transposeSemitones` de MusicClip em ambos os motores.
- Integrar a correção tonal às operações de composição que ainda não usam o contexto da escala, preservando sempre a ação explícita do usuário.
- Fechar semantics de durations/fades/loop/fórmula de compasso/tempo-map e testar nota/clip após save→reload. Sincronização por ID entre `music.notes` e clips estruturados, com isolamento entre tracks e segmentos múltiplos no mesmo track, foi implementada e testada; falta validar cada classe de operação em arranjos musicais longos após reload.
- Seleção múltipla, velocity, quantize/humanize, transposição e correção tonal em lote foram ampliados no Piano Roll; o AudioService agora expõe disponibilidade real de Undo/Redo por projeto, mas ainda falta verificar History após reload em cada classe de operação, sem criar estado duplicado entre `notes`/`clip.notes`.
- Implementar/validar teclado de entrada musical e decidir timbre de piano licenciado ou rotulagem honesta do synth genérico.

### Lote 3 — geração real e proveniência (P1, provider depende de integração)

- Criar adapter server-side para provider aprovado (segredo fora do client e do projeto), cancellation/custo/status/cache explícitos.
- Testar resposta malformed, timeout, abort, asset ausente/quarentenado, provider mismatch, licença e retry sem duplicar asset/clip.
- E2E com provider fake local que registra asset binário válido: gerar ambience/voice → asset associado → clip/VoiceTake → efeitos/mix → WAV.
- Persistir tags/categoria/settings/license no Asset Library, harmonizando provenance em import, record e generated.

### Lote 4 — sound design/game-audio operacional (P1, editor de variações e crossfade local concluídos; endurecimento pendente)

- Concluído nas rodadas locais: contrato/parser fail-closed de GameAudioPackage, importação direta no Game Studio, seletor de eventos PLAY, dispatch/reprodução local e editor de grupo/seed/peso/ranges de volume-velocidade no painel. Grupo/seed pertencem à faixa e pesos/ranges ao clip no documento serializado; metadata do asset compartilhado não é mutada.
- Concluído neste lote: edição em lote por seleção múltipla real para grupo/seed, peso/ranges e tags de projeto; browser pesquisável de grupos/membros/tags/eventos mostra validade do pacote e navega ao clip de origem. Tags exportam sem mutar metadata do asset; E2E valida busca, retorno ao clip e pacote com dois membros/eventos. O exportador também oferece clip individual selecionado, com plano fail-closed para ID ausente e render isolado do clip.
- Ainda falta: operações avançadas em lote para remover/rebalancear membros; testes estatísticos/property-based de múltiplas distribuições/categorias; preview de seam e metadados espaciais. O Bundle binário local agora inclui metadata, bytes e hashes, e o Web Build inclui runtime de navegador que reproduz `PLAY_AUDIO` em `ON_START`/`ON_CLICK`/`ON_KEY`; a semântica completa de regras, entidades e transições ainda não está exportada.
- Limite explícito de transporte: JSON só leva metadados e IDs locais, nunca bytes de áudio; projeto consumidor requer os mesmos assets locais disponíveis. Importar em outro perfil/dispositivo sem esses assets deve falhar claramente, não remapear IDs por nome.

### Lote 5 — voz, análise e documentação (P2)

- Voice Preview A/B, pronúncia que chega ao provider, versionamento do perfil, processing preset aplicado e playback dos takes.
- Tuner de entrada YIN, pitch de clipe, análise LUFS, pico inter-sample aproximado e estimativa de ritmo/transientes implementados localmente; a análise usa os bytes locais, recorta `sourceStartMs/sourceEndMs`, limita lote a 8 e valida o limite de memória do decoder. O pitch usa uma janela inicial do trecho, retorna nota/frequência/cents somente com confiança suficiente e não tenta resolver polifonia. O pico 4× é um alerta aproximado, não certificação true peak. Mono/estéreo para loudness; trechos <400ms e silêncio explicitamente sem LUFS. Ritmo usa mono, envelope de energia, faixa 40–240 BPM e confiança; não é beat tracker polimétrico. Nada inclui ganho/fades/efeitos da timeline. Ainda falta validação manual com fontes reais, formatos/canais adicionais e material musical complexo.
- Biblioteca de assets: busca/facetas e filtros medidos por duração/sample rate/canais, formulário uniforme de anotações por projeto e migração schema 4 implementados localmente; continuam pendentes validação com codecs adicionais, grande volume, isolamento manual entre dois projetos e revisão jurídica das declarações.
- Checklist manual de 49 cenários preparado com procedimento, esperado, limitações e estados; sua execução manual integral continua pendente.

## Gates de release ainda obrigatórios

- [x] ESLint focal dos arquivos de Game Audio/loop e da página Studio: 0 erros e 0 avisos; as dependências de `syncFromUrl` e `handleUpdateAudioDocumentState` foram estabilizadas com `useCallback`.
- [x] `npx tsc --noEmit` após implementação de buffers temporários para crossfade.
- [x] `npm run test:audio-studio` (37 regressões, 0 falhas, 4 skips ambientais; inclui tags de variação, parser, seleção ponderada/teste estatístico de 20 mil seeds e DSP de loop) e `npm run test:audio-routing` passou na rodada anterior.
- [x] `npm run test:e2e:audio` (26/26 na última execução E2E; inclui edição em lote, browser pesquisável, filtros técnicos, anotações por projeto após reload e `pagehide`, recuperação/persistência da duração medida no asset legado, rejeição de duração desconhecida, serialização, loop/crossfade/runtime, presets versionados, inspector de espacialização e Bundle ZIP). O serviço recebeu depois um teste de domínio concorrente AUDST-REG-039; a E2E UI é reexecutada ao validar integração final.
- [x] Teste de persistência local cobre flush síncrono e rejeição explícita em falha simulada de quota de armazenamento.
- [x] `npm run build` após a análise de loudness (regressão documental 28 rotas/36 ferramentas/12 agentes/17 módulos; Athena 15/15; TypeScript de produção e Next.js compilou e gerou 49 páginas; prerender 1,8 s).
- [x] Migração schema 1 → abrir → editar → salvar no schema atual → reabrir preservando asset WAV, notas MIDI e take Voice; conferir leitura do Blob após reload.
- [x] Novo projeto: criar/importar → salvar → reload → reproduzir → exportar WAV; os E2E também verificam saída com samples audíveis e cabeçalho WAV nos cenários correspondentes.
- [ ] Smoke manual em navegadores/dispositivos suportados, inclusive permissão de microfone e ausência de provider.
- [x] Atualizar este relatório e manual com apenas os resultados realmente executados nesta rodada.
- [ ] Confirmar separadamente publicação/deploy e alias READY antes de anunciar release público.

## Estado da execução nesta auditoria

- Rodada anterior (baseline): `npm run test:audio-studio` passou com 37 regressões e quatro skips exclusivos de runtime; roteamento, TypeScript, ESLint (zero erros/29 avisos), E2E 16/16 e build (28 rotas, Athena 15/15, 49 páginas estáticas) passaram antes da integração Audio→Game descrita abaixo.
- Mudanças desta rodada: pacote JSON agora pode ser importado no Game Studio; referência a assets faltantes/inválidos falha fechada; pacote é persistido e manifest atualizado; regras oferecem picker de evento PLAY; Play Mode toca asset real do Asset Manager, escolhe variações com seed/pesos e aplica range/loop; colliders `isTrigger` geram contato sem bloquear o corpo. O Web Build passou a gerar ZIP com runtime, estado, bins e hashes e o teste verifica os caminhos de áudio, loop, eventos, timers, ciclo físico e sensores no `index.html`. Testes unitários e regressões dedicadas passaram em execuções focadas: domínio Game Audio, regras (11/11), Game Studio (71/71); E2E focado exportou WAV, baixou JSON/Bundle, importou no jogo, escolheu evento e confirmou início da reprodução local.
- Lote anterior de integração Audio→Game: pacote JSON importável, validação fail-closed, regras `PLAY_AUDIO` e reprodução local em Play Mode; testes focados Game Rules 11/11 e Game Studio 67/67, além do E2E focado do fluxo.
- Lote de variações/loop: TypeScript, lint focal (0 erros; 2 avisos preexistentes de hooks na página Studio), E2E 17/17 à época, distribuição determinística em 20 mil seeds, regressão documental e build aprovados. Essa é evidência histórica, não substitui os resultados atuais abaixo.
- Lote de confiabilidade/autosave e concorrência: `saveDocumentState` só confirma depois da persistência local; `pagehide`, aba oculta e desmontagem fazem flush do snapshot pendente; timer do áudio separado dos outros Studios; UI publica snapshots válidos em memória sem forçar I/O síncrona a cada gesto; inserção recupera estado atual após aguardar bytes/medição e revalida faixa/asset; blobs WAV legados têm duração lida do container antes do fallback decoder. Testes cobrem flush síncrono, falha explícita de quota, concorrência AUDST-REG-039 e E2E 26/26 após integração UI. Audio Studio 39 aprovados/0 falhas/4 skips ambientais; TypeScript passou; lint focal 0 erros/0 avisos; regressão documental 28/36/12/17; build passou com Athena 15/15 e 49 páginas, prerender 2,5 s. Tudo local, não publicado.
- Lote atual de análise e transporte Game Audio: loudness integrado por clipe selecionado usa decodificação real do asset local e intervalo-fonte do clipe, com ITU-R BS.1770 K-weighting, janelas 400ms/75%, gates absoluto/relativo; informa peak de amostra, RMS, pico inter-sample aproximado 4×, duração/canais e estado sem LUFS para trecho curto/silêncio. O mesmo fluxo estima BPM e lista tempos de transientes a partir do mono, com confiança e estados `INSUFFICIENT_DURATION`/`NO_PULSES`, e estima pitch na janela inicial quando há confiança. Escopo limitado a mono/estéreo para loudness, oito clipes por lote e teto do AudioRenderEngine; não inclui processamento de timeline, true peak certificado ou beat tracking avançado. Testes numéricos passam com tom 1kHz de referência (-3,01 LUFS), alteração de amplitude, soma estéreo, gates, click-track 120 BPM/transientes, pico interpolado e entradas inválidas. O fluxo Game Audio exporta JSON v1 e Bundle ZIP local com `game-audio.json`, `manifest.json`, bytes e SHA-256, e importa o Bundle verificando integridade, recriando assets locais e remapeando IDs para eventos/variações; falha fechado para asset ausente/corrompido. A suíte E2E completa passou 26/26, incluindo análise, reload MIDI, Piano Roll, loops, stems, exportação individual de clip com WAV RIFF, presets versionados, edição/persistência de espacialização e importação real do Bundle ZIP no Game Studio. TypeScript, suite Audio Studio (39 aprovados/0 falhas/4 skips ambientais), documentação (28 rotas/36 ferramentas/12 agentes/17 módulos), Athena (15/15), build (49 páginas; prerender 2,5 s) e lint focal passaram sem avisos. Local, não publicado.
- Ainda faltam teste físico do tuner, smoke manual multi-dispositivo, provider real, execução manual dos 49 cenários, aceite auditivo do clip exportado e execução completa da semântica de regras/entidades/transições. O Web Build já gera ZIP com runtime de navegador, arquivos embutidos e reprodução básica de eventos Game Audio; sensores `isTrigger` agora não resolvem fisicamente no pacote exportado. O standalone completo de Game Audio ainda não está concluído. Nenhum deploy público ocorreu.

## Atualização de evidências — 22/09/2026

Escopo da solicitação: seções 1–110 e milestones A–Q. A matriz antiga acima agrega os requisitos em 74 linhas; ela não é uma correspondência direta com a numeração do anexo. Use a matriz rastreável abaixo para o status por seção. Esta atualização mantém o release em andamento e local.

- `npm run build` após integração do metrônomo: o bundle Next compilou, mas o typecheck falhou em mudanças concorrentes de Knowledge em `src/lib/knowledge/vault-adapter.ts:26,33` (predicate `string` incompatível com união de categorias e array opcionalidade). O build que gerou 61 páginas aprovado foi executado antes desta alteração concorrente; não declarar build final verde até corrigir/revalidar o outro domínio.
- `npx tsc --noEmit` executado imediatamente após as mudanças do Audio/metrônomo, antes de a alteração concorrente atual de Knowledge aparecer, terminou sem erro; o typecheck atual é vermelho pelo motivo descrito acima.
- Todas as suítes `src/lib/studio/audio/*.test.ts`: aprovadas; regressão Audio informa 39 PASS, 0 FAIL, 4 SKIP ambientais (runtime Web Audio ausente no unitário).
- `npx playwright test tests/e2e/audio-studio.smoke.spec.ts --workers=1`: 30/30 aprovado em 3,2 min. Dois timeouts na rodada anterior passaram 2/2 isoladamente e 30/30 na repetição serial; não se aumentou timeout global.
- `npx playwright test tests/e2e/audio-drum-sequencer.spec.ts`: 1/1 aprovado, incluindo asset real, edição/persistência após reload e playback.
- `metronome-domain.test.ts` e E2E focado `configures a synchronized metronome count-in`: aprovados após o scheduler passar a usar a subdivisão do compasso e tempo map.
- `npm run test:audio-studio` foi atualizado para incluir `metronome-domain.test.ts` e executou até o fim: 39 aprovados/0 falhas/4 skips ambientais, além de todas as suítes de domínio encadeadas.
- `music-domain.test.ts`, ESLint focal e `git diff --check`: aprovados após validar C4=MIDI60, compassos e mapa de tempo inválidos e herança de BPM antes do primeiro tempo explícito.
- E2E independente `music-visual-persistence.spec.ts`: falhou ao não encontrar capa GIF após reload. A tela Music está sendo modificada concorrentemente, então essa mudança não foi alterada nem contabilizada como aprovada.
- Nenhuma publicação/deploy foi executada. Não assumir estado READY.

## Atualização de evidências — 23/09/2026

- Sampler melódico real: Playwright importa um WAV mono A4=440 Hz, cria e persiste um sampler, atribui-o a uma faixa INSTRUMENT, cria C3/C4/C5 no Piano Roll, exporta PCM16 WAV e mede os cruzamentos de frequência dos três trechos; cada resultado fica dentro de 8 Hz da frequência 12-TET esperada. A atribuição é confirmada após reload. E2E passou.
- `npx playwright test tests/e2e/audio-drum-sequencer.spec.ts`: 2/2 aprovados, incluindo sequência do Drum Sequencer e teste real de root mapping C3/C4/C5.
- `npm run test:audio-studio`: 39 aprovados, 0 falhas e 4 skips que requerem runtime Web Audio; todas as suítes encadeadas terminaram.
- `npx tsc --noEmit`, ESLint focal de `tests/e2e/audio-drum-sequencer.spec.ts` e `git diff --check`: aprovados.
- `npm run build`: passou, incluindo os pre-gates; compilação e typecheck concluídos; 62 páginas estáticas geradas, em 6,0 s.
- Regressão documental: 43 rotas, 36 ferramentas, 12 agentes e 18 módulos. Certificação Athena: 15/15. Não foram executados checklist humano nem validação de hardware, e não houve publicação/deploy nesta rodada. O release continua local e em andamento.

### Continuação — Tempo Track e reagendamento de playback

- Tempo Track compartilhada em Piano Roll e Score edita múltiplos pontos sem descartar os existentes; BPM limitado a 20–300 e beat zero protegido. Mudanças persistem no Music Domain e passam por Undo.
- AudioEngine reagenda eventos musicais/metrônomo durante playback usando buses já criados, sem reiniciar clips de áudio; duração das notas integra corretamente os segmentos BPM atravessados.
- E2E de tempo ao vivo passou: cria nota numa faixa INSTRUMENT, muda BPM durante playback, confirma transporte ativo/sem erro, pausa, recarrega e confirma mapa/nota persistidos. Teste de domínio cobre atraso futuro e duração em BPM variável.

## Matriz literal de requisitos 1–110

Estados: FEITO = evidência funcional no escopo indicado; PARCIAL = há implementação, mas falta parte do critério; PENDENTE = não implementado ou requer dependência/aceite ainda indisponível.

| Nº | Requisito | Estado | Evidência / trabalho que falta |
|---:|---|---|---|
| 1 | Auditoria prévia, arquitetura existente e migrações | PARCIAL | Models/services/engine/UI e migrations 1→4 revisados/testados; falta matriz de compatibilidade extensa e aceite manual. |
| 2 | Domínios Audio/Music/Sound Design/Voice convergentes | PARCIAL | Estado único conflui em Timeline/Mixer/Bus/Master/Render; provider e alguns resultados continuam indisponíveis. |
| 3 | Workspaces contextuais | PARCIAL | Modos contextuais existem; validação de tarefa/consistência de seleção em uso longo pendente. |
| 4 | Music Domain semântico | PARCIAL | Notes/pitch/duração/tempo/meter/key/scale/chords/rests/articulation/expression; dinâmica formal e time-signature map faltam. |
| 5 | Pitch MIDI/frequência/afinação | FEITO (12-TET) | Teste A4=69=440 Hz, C4=60, acidentes/conversões; temperamento alternativo/microtonal não existe. |
| 6 | Durações, pausas, dotted, ties, tuplets | PARCIAL FORTE | Domain/PianoRoll/playback/MusicXML/PDF cobrem base; notação convencional completa pendente. |
| 7 | BPM, tempo map e transport | PARCIAL FORTE | Conversões e duração através de mudanças de BPM cobertas no domínio; mudança durante playback reagenda notas e metrônomo sem reiniciar clips de áudio, validada por E2E com persistência. E2E de arranjo longo com várias mudanças e deriva prolongada ainda falta. |
| 8 | Compassos 2/4, 3/4, 4/4, 6/8 e válidos | PARCIAL | Contagem/denominadores validados; mudanças de compasso dentro da peça não são suportadas. |
| 9 | Key/Scale/Mode e notas externas permitidas | PARCIAL FORTE | Escalas/modos e correção explícita; integração em todos os gestos não concluída. |
| 10 | Chord System | PARCIAL FORTE | Qualidades, extensões, inversões e voicings; track dedicado e edição independente das vozes incompletos. |
| 11 | Piano Roll funcional | PARCIAL FORTE | Edit/create/select/duplicate/delete/velocity e E2E MIDI; performance para milhares de notas pendente. |
| 12 | Score funcional compartilhado com Piano Roll | PARCIAL FORTE | Estado compartilhado, seleção/edição e exports MusicXML/PDF; gravura convencional avançada incompleta. |
| 13 | Music Inspector de clips/notas | PARCIAL | Campos musicais distribuídos em Piano Roll/controles; inspector unificado e instrumento/quantize por clip incompletos. |
| 14 | Instrument Provider/Engine genérico | PARCIAL FORTE | Lifecycle noteOn/noteOff/parameters/preset/dispose e testes; catálogo de instrumentos/providers limitado. |
| 15 | Synth oscillator/filter/LFO/polyphony | PARCIAL FORTE | Síntese Web Audio real, envelope e controles; testes/performance por cada parâmetro e modulações adicionais faltam. |
| 16 | ADSR visual audível | FEITO no synth atual | Editor ligado ao preset; browser E2E edita/persiste ADSR. |
| 17 | Filtros low/high e LFO | PARCIAL | Filtro/LFO funcionais no caminho atual; destinos/modulações extensíveis não completos. |
| 18 | Piano inicial licenciado ou síntese apropriada | PENDENTE | Timbre não deve ser chamado de piano acústico; instrumento sampled/licença ou sintetizador de piano convincente não aprovado. |
| 19 | Sampler root/range/loop/ADSR/filter/gain/velocity | PARCIAL FORTE | Inspector de faixa seleciona definição persistida; playback e render offline usam asset real, root/range e playback-rate (C3/C4/C5 = 0.5/1/2), envelope, filtro, ganho/velocity e loop com crossfade em buffer copiado. E2E browser cria sample A4=440 Hz e sampler atribuído à faixa, persiste a atribuição, cria C3/C4/C5 e mede as três frequências do WAV renderizado dentro de 8 Hz. Multi-sampling e aceite auditivo manual continuam pendentes. |
| 20 | MIDI SMF/Web MIDI/hardware/CC | PARCIAL FORTE | Import/export, runtime, gravação e CC limitados testados; hardware real, permissões e gravação avançada faltam. |
| 21 | Metrônomo/count-in | PARCIAL FORTE | Scheduler subdivide pelo denominador (inclui seis colcheias em 6/8), agenda count-in antes do beat zero e respeita tempo map/seek; unit test dedicado e E2E de configuração passam. Deriva de longo prazo e latência real ainda não medidas. |
| 22 | Quantize reversível/undo | PARCIAL FORTE | Original timing e reversão no editor; todos os grids/reload não têm E2E abrangente. |
| 23 | Humanize opcional | PARCIAL FORTE | Seedado, acionamento explícito e reversão; persistência em clips longos não coberta. |
| 24 | Transpose por semitons/oitavas | PARCIAL FORTE | Domain/clip/playback/render; Undo/reload em todos contextos pendentes. |
| 25 | Velocity lane | FEITO no fluxo musical atual | Lane editável e velocity aplicada ao synth/render. |
| 26 | Drum machine/sequencer | FEITO no fluxo coberto | Domain test e E2E 1/1: steps, parâmetros, reload, sampler real e envio à composição. |
| 19 | Sampler melódico ligado a faixa e export | FEITO no fluxo coberto | E2E cria sampler/faixa INSTRUMENT/notas C3-C4-C5, confirma atribuição após reload, exporta WAV e mede a frequência de cada nota no PCM com tolerância de 8 Hz. Multi-sampling e aceite auditivo manual ficam fora do critério desta linha. |
| 27 | Arrangement sections configuráveis | PARCIAL FORTE | Lane compartilhada oferece presets Intro/Verso/Pré-refrão/Refrão/Ponte/Break/Build/Drop/Outro/custom, intervalos não sobrepostos em beats, exclusão e marcador de seção vinculado; E2E cobre criação e reload. Redimensionamento visual/arrastar ainda não existe. |
| 28 | Chord Track | PARCIAL FORTE | Faixa visual compartilhada cria/remove acordes no modelo e materializa/remove notas ligadas por chordId; E2E cobre persistência e leitura em Score. Edição visual por arrasto e manipulação harmônica avançada ficam pendentes. |
| 29 | Tempo Track visual | PARCIAL FORTE | Lane compartilhada Piano Roll/Score permite inserir, editar e remover pontos BPM, protege o ponto base, valida beats únicos e persistência/Undo via Music Domain; playback reagenda notas futuras. Mapa visual com edição direta por arrasto ainda não existe. |
| 30 | Key/Scale Track e modulação | PARCIAL FORTE | Mapa tonal por compasso com tonic/acidente/escala, mudança/substituição/remoção e base legacy protegida; Score exibe tonalidade vigente e divisórias por compasso; validação/correção respeita o trecho; MusicXML exporta armaduras e PDF resume até oito mudanças com aviso. Símbolos de armadura convencionais, gravura completa e testes de projetos longos ainda pendentes. |
| 31 | Sound Design Workspace | PARCIAL FORTE | Sampler, ambience/noise reais e layers; grafo/SFX completo ausentes. |
| 32 | Procedural Sound Engine modular | PARCIAL FORTE | WAV de ruído/chuva/vento/floresta; composição livre de sources/modifiers/LFO/delay/reverb falta. |
| 33 | Sound Graph foundation | PENDENTE | Grafo persistente Source→Modifier→Effect→Output não localizado. |
| 34 | Ambience layers Designer | PARCIAL FORTE | Faixas independentes, mix, automation e stems; random events/estado adaptativo faltam. |
| 35 | Rain Designer com parâmetros ambientais | PARCIAL | Chuva procedural real; superfícies, interior/exterior, thunder, width e perfect loop incompletos. |
| 36 | Perfect Loop preview/seam inspection | PARCIAL | Crossfade equal-power usado em playback/render; preview repetido e análise/assistência seam não existe. |
| 37 | SFX Creator/categorias/variações | PENDENTE | Formulário genérico sem provider não constitui workflow SFX funcional completo. |
| 38 | Variation Groups | PARCIAL FORTE | Pesos/seed/tags/browser/integração Game; gestão/rebalanceamento avançado falta. |
| 39 | Foley workflow | PARCIAL | Tipo de track disponível; metadados organizados character/surface/action/scene/take incompletos. |
| 40 | AudioGenerationProvider desacoplado | PARCIAL | Contrato/capabilities e falha honesta; provider real ausente. |
| 41 | Generation Request estruturado | FEITO no contrato | Request validado/capabilities; caminho provider→asset real não verificado por indisponibilidade do provider. |
| 42 | Generated assets/provenance | PARCIAL FORTE | Procedural assets têm WAV/provenance; lineage completo em edição/mastering parcial. |
| 43 | Voice Workspace | PARCIAL | Takes/perfis/process local; provider real e preview vocal ausentes. |
| 44 | Character Voice Profile | PARCIAL FORTE | Profile Euterpe estruturado/persistido/migrado; integração com provider não existe. |
| 45 | Identidade acústica Euterpe | PARCIAL EDITORIAL | Voice Bible é editorial; nenhuma voz real aprovada/provider disponível. |
| 46 | Performance directions | PARCIAL | Estados guardados; provider não conectado para validar realização sonora. |
| 47 | Voice Takes comparáveis | PARCIAL FORTE | Takes editáveis/persistidos; A/B audível com takes reais falta. |
| 48 | Voice Lab | PENDENTE | Laboratório de preview/A-B operacional não completo. |
| 49 | Pronunciation Dictionary | PARCIAL | Editor existe; nenhum adapter envia entradas a provider real. |
| 50 | Voice postprocessing | PARCIAL FORTE | Cadeia local determinística em WAV PCM cria derived asset; codecs e presets profissionais mais amplos faltam. |
| 51 | Voice timeline/script link | PARCIAL | Takes podem entrar como áudio; sincronização estruturada de roteiro/dialogue/takes incompleta. |
| 52 | Audio Analysis | PARCIAL FORTE | LUFS/peak/RMS/pitch/tempo/transientes locais; escopo mono-estéreo/janelas declarados, validação manual pendente. |
| 53 | Spectrum Analyzer real | PARCIAL FORTE | Analyser do engine; aceite manual/resolução e métricas mais amplas pendentes. |
| 54 | Tuner | PARCIAL FORTE | YIN nota/frequency/cents/confidence; hardware real ainda não testado. |
| 55 | Pitch Detection | PARCIAL FORTE | YIN com confiança; não detecta acordes/polifonia. |
| 56 | Tempo Detection | PARCIAL | Estimativa pulsos aproximada; não substitui beat tracker complexo. |
| 57 | Loudness | PARCIAL FORTE | LUFS com gates e E2E; true-peak certificado, >2 canais e efeitos timeline não cobertos. |
| 58 | Mastering workspace | PARCIAL | Master bus/effects/meters existem; targets de loudness/assistente mastering faltam. |
| 59 | Reference track | PARCIAL | Tipo/reference existe; comparação analisador/mix integrada não demonstrada. |
| 60 | A/B | PARCIAL | Slots/presets e metadata de takes; A/B sincronizado de áudio/voice lab incompleto. |
| 61 | Freeze/Bounce | PENDENTE | Render/export não prova freeze reversível de track. |
| 62 | Stem export | FEITO no escopo atual | E2E exporta stems WAV de tracks selecionadas; stems adaptativos faltam. |
| 63 | Game Audio metadata | PARCIAL FORTE | Evento/variation/loop/ranges/bundle; taxonomy/licensing completa ainda falta. |
| 64 | Audio Event Model | PARCIAL FORTE | Eventos/conditions e execução Play Mode; semântica e ferramenta standalone incompletas. |
| 65 | Adaptive Music foundation | PARCIAL | Events/conditions/variations base existem; transições adaptativas não executam. |
| 66 | Stem-based music | PARCIAL | Export de stems existe; sincronização/transição adaptativa sem gaps não provada. |
| 67 | Beat/Bar/Section/Transition sync points | PARCIAL FORTE | Marcadores Beat/Compasso/Seção/Transição persistidos no domínio; compasso rejeita posição desalinhada, seção gera marker vinculado e E2E verifica transição após reload. Execução sincronizada em runtime adaptativo ainda falta. |
| 68 | Euterpe modular | PARCIAL | Separação conceitual/contratos; especialista áudio de ponta a ponta falta. |
| 69 | Euterpe Audio Capabilities | PARCIAL | Athena Audio Actions base; catálogo seguro completo com approval não existe. |
| 70 | Euterpe sound director NL→plan→preview→apply | PENDENTE | Pipeline não implementado para cenários musicais descritos. |
| 71 | Euterpe não é chatbot do Studio | PARCIAL | Separação arquitetural documentada; agente/capabilities multi-módulo faltam. |
| 72 | Hierarquia Athena/Euterpe/Studio/Engine | PARCIAL FORTE | Bases separadas; integração especializada está incompleta. |
| 73 | Analyze→Propose→Preview→Apply→Undo | PARCIAL | ChangeSet/Undo em algumas ações; preview universal ausente. |
| 74 | Asset Library taxonomy | PARCIAL FORTE | Asset browser e anotação project-scoped; coleção/reuso abrangente pendentes. |
| 75 | Search/filter por metadata | FEITO no subconjunto persistido | Busca e facetas técnicas/categoria/tag; linguagem natural semântica não existe. |
| 76 | Favorites/collections/recents | PARCIAL | Favoritos em alguns takes; collections/recent/used cross-project incompletos. |
| 77 | Provenance e lineage | PARCIAL FORTE | Import/record/procedural/render metadados; lineage end-to-end parcial. |
| 78 | Licensing metadata | PARCIAL | Claim/attribution separado e não verificado; formulário consistente e revisão legal faltam. |
| 79 | Provider secrets security | FEITO no estado sem provider | Nenhuma chave embutida; backend/provider remoto seguro ainda inexistente. |
| 80 | Provider capability discovery | PARCIAL FORTE | Capabilities declaradas/renderizadas; adapter real não verifica o contrato na prática. |
| 81 | Generation job system | PARCIAL/PENDENTE | Jobs gerais existem; áudio generation não usa fila/status/cancel lifecycle completo. |
| 82 | Generation cache | PARCIAL | Cache de request existe; uso de asset/cache/cancel/cost completo não provado. |
| 83 | Offline-first | PARCIAL FORTE | edição, MIDI, synth, sampler, procedural, analysis, WAV local; provider fora fica explicitamente indisponível. |
| 84 | Latency diagnostics | PENDENTE | Sem medição integrada de recording/monitor/MIDI. |
| 85 | Large-project performance | PARCIAL | Guardas de duração/memória; benchmarks de mil notas/tracks/assets pendentes. |
| 86 | AudioWorklet decision | PENDENTE | Nenhuma avaliação comparativa Worklet registrada. |
| 87 | Worker decision | PENDENTE | Nenhum benchmark waveform/analysis/encoding registrado. |
| 88 | Undo/Redo de todos novos edits | PARCIAL FORTE | History em paths cobertos; checklist por classe de edição incompleto. |
| 89 | Autosave seguro e sem sync destrutivo | FEITO no fluxo browser coberto | pagehide/reload testados; concorrência/dispositivos cross-profile segue fora do aceite. |
| 90 | Versioning por domínio | PARCIAL | Snapshots gerais/presets; version labels/diff/recovery por domínio incompletos. |
| 91 | Project migrations e roundtrip | FEITO nas versões/casos cobertos; global PARCIAL | Migração 1→4 testada; projeto integrado full payload ainda não feito. |
| 92 | Erros estruturados para runtime | PARCIAL FORTE | Códigos para asset/codec/provider/storage; permissões e dispositivos exigem teste físico. |
| 93 | Testes musicais fundamentais | FEITO | A4/C4/tempo/conversões, maps inválidos e BPM herdado; test em 22/09. |
| 94 | Piano Roll C4-E4-G4-C5 playback/save/reload/undo | FEITO no cenário E2E | A sequência canônica é importada como MIDI, editada no Score com Undo/Redo confirmado no Piano Roll, sobrevive à migração/reload e é renderizada; medição PCM valida as quatro frequências-alvo. Benchmarks de escala e aceite auditivo continuam em outras seções. |
| 95 | Score mesmo modelo/alteração sincronizada | FEITO no fluxo compartilhado coberto | E2E edita duração no Score e observa a mesma alteração no Piano Roll; leitura convencional/gravura avançada permanece pendente no requisito 12. |
| 96 | Synth oscillator/ADSR/filter/velocity/polyphony | PARCIAL FORTE | Synth e ADSR E2E, MIDI WAV audível; matriz de cada parâmetro/polyphony falta. |
| 97 | Sampler C3/C4/C5 | PARCIAL | Domínio valida taxas C3/C4/C5 em relação a C4; E2E confirma C4 sampleado não silencioso após reload. Render tonal comparativo das três oitavas continua pendente. |
| 98 | Procedural SFX→asset→timeline→export | PARCIAL | Procedural ambience/noise asset e WAV export; SFX notification dedicada ausente. |
| 99 | Chuva→layers→loop→mix→export seamless | PARCIAL FORTE | Chuva/layers/DSP/stem; preview de emenda e avaliação auditiva ausentes. |
| 100 | Euterpe voice generation A/B/export | PENDENTE | Sem provider real, nenhum take sintético falso contado como resultado. |
| 101 | 5 footsteps variation group | PARCIAL | Variation/Game Audio existe; cenário de cinco variações não coberto pelo smoke atual. |
| 102 | Persistence aggregate all content | PARCIAL | MIDI/audio/voice reload em cenários; full project combinado com automation/markers/effects falta. |
| 103 | Regressão version anterior | PARCIAL FORTE | Audio regressions 39/0/4skip e smoke 30/30; gravação hardware/manual permanece. |
| 104 | E2E crítico | PARCIAL FORTE | Smoke Audio 30/30 + Drum 1/1; provider, hardware e failure-paths restantes. |
| 105 | Manual de testes detalhado por domínio | PARCIAL | Checklist 49 casos existente, porém não executado; manual version atual precisa atualização consolidada. |
| 106 | Definition of Done | PARCIAL | Gating funcional aplicado; não há release global até resolver pendências e aceitações. |
| 107 | Implementar milestones A–Q | PARCIAL | Estado detalhado na tabela seguinte; nenhuma presença de UI vale aceite por si só. |
| 108 | Não sacrificar qualidade; registrar parada/limites | FEITO COMO PROCESSO | Este audit conserva gaps explícitos e não sinaliza falso completion. |
| 109 | Changelog/architecture/test report/limits/manual | PARCIAL | Audit/architecture/manual/checklist existem; changelog e manual harmonizado de release faltam. |
| 110 | Fluxos integrais Music/Sound/Ambience/Voice/Game | PARCIAL | Music/MIDI/render, procedural/layers e Game Audio têm caminhos comprovados; Voice provider, loop inspection, standalone/adaptive permanecem incompletos. |

## Milestones A–Q

| Marco | Estado | Próximo critério que fecha o marco |
|---|---|---|
| A Audit + baseline | PARCIAL | Checklist manual integral e compatibilidade de projetos legados/browser. |
| B Music domain | PARCIAL FORTE | Domain, Tempo Track persistida e scheduler do metrônomo cobrem mapa variável; edição ao vivo reagenda eventos futuros. Arranjo longo com várias mudanças/compassos e transport ainda carece de E2E de duração/deriva. |
| C Clips/instrument tracks | PARCIAL | operações move/duplicate/transpose/undo/reload em múltiplos tracks. |
| D Synth/instrument engine | PARCIAL FORTE | Piano/timbre aprovado, polyphony/filter/velocity suite. |
| E Piano Roll | PARCIAL FORTE | sequência musical completa e benchmark de milhares de notas. |
| F Score | PARCIAL | Gravura legível convencional e validação externa MusicXML/PDF. |
| G MIDI | PARCIAL FORTE | Hardware físico, permissões e gravação multi-track. |
| H Sampler/Drums | PARCIAL FORTE | Root mapping e render C3/C4/C5 E2E; faltam multi-sampling, banco por zona e aceite auditivo. |
| I Sound Design | PARCIAL FORTE | grafo/procedural composable e criação SFX persistida. |
| J Ambience/loop/variations | PARCIAL | preview/detecção seam, Foley/SFX e eventos aleatórios. |
| K Generation providers | PARCIAL | provider aprovado, server-side secret, jobs/cancel/cost/provenance. |
| L Voice/Euterpe | PARCIAL | Voice A/B/provider/playback/timeline/export. |
| M Analysis/Mastering | PARCIAL FORTE | validação hardware, mastering/true-peak escopo explícito. |
| N Game/adaptive | PARCIAL FORTE | standalone runtime e transições/stems adaptativos. |
| O Euterpe capabilities | PARCIAL | catalog completo de actions com preview/approval/undo seguro. |
| P Performance/persistence | PARCIAL FORTE | benchmarks, full-state roundtrip e teste concorrência/cross-profile. |
| Q Tests/docs/release | PARCIAL FORTE | manual aceite, changelog, limitações, E2E restante e deploy READY. |

## Próximos lotes para fechar o release

1. **Music/Sampler P0:** validar tempo-map alterado durante playback, continuidade de notas em transições de tempo e edição musical após reload em arranjo longo; ampliar sampler para zonas/multi-sampling somente se necessário ao escopo, sem duplicar estado.
2. **Sound Design/Game P1:** sound graph real composable, SFX/Foley com assets reais, preview repetido e medição de seam, ambience aleatório por evento; completar semantics de runtime adaptativo.
3. **Voice/Providers P1:** provider real somente após escolha/configuração autorizada e segredo seguro server-side; sem provider, aprimorar texto de indisponibilidade e testes fail-closed. Voice A/B e delivery de pronunciation só aceitos contra áudio real.
4. **Performance/Persistence P1:** projetos de milhares de notas/tracks, memória/caches/latência, full save→reload integrado e todas operações com undo/versioning.
5. **Entrega Q:** executar checklist manual de 49 cenários em browser/device suportado; atualizar manual/changelog/architecture notes, gates de release e verificar publicação/alias READY separadamente.

Não publicado. Dependências que exigem autoridade/contexto externo: provider e credenciais aprovados, decisão/licença do timbre de piano, hardware MIDI/microfone e execução manual multi-device. O trabalho local continua adiante sem fabricar esses resultados.
