# VARYNTH Audio Studio — Manual operacional v2 (estado local)

Data da revisão: 22/09/2026  
Status: documentação de capacidades verificadas localmente; **não representa publicação nem aceite manual completo**. Matriz de gaps e status por requisito: [auditoria de conclusão](./audio-studio-v2-completion-audit.md). Checklist de aceite: [49 cenários manuais](./audio-studio-manual-acceptance-checklist.md).

## Antes de começar

Abra VARYNTH → Studios → Audio Studio (Studio 4) → Novo Projeto de Áudio ou abra um projeto existente. O produto usa estado local-first por projeto. Importação, síntese Web Audio, edição e export WAV são locais. A permissão de microfone só é solicitada ao iniciar gravação/análise. Geração externa depende de provider autorizado; sem ele, não há resultado gerado e a UI deve informar indisponibilidade.

Mantenha cópias dos projetos importantes. Salvar projeto, exportar um WAV derivado e sincronizar entre dispositivos são operações distintas; não presuma sincronização remota.

## EDIT — timeline e clips

1. Importe arquivo pelo botão Importar Áudio ou arraste um áudio compatível.
2. Confirme o asset no painel Assets e o clip na faixa selecionada.
3. Selecione, arraste, corte, divida no playhead, duplique, copie/cole ou apague clips; ajuste fades, ganho, pan, playback rate, loop source-relative e espacialização no inspector quando disponíveis.
4. Use Undo/Redo para revisar edições e recarregue o projeto para validar persistência.

Os originais importados permanecem como assets-fonte; edições temporais ficam no documento. Arquivos com codec não suportado ou duração impossível de medir devem falhar explicitamente, não receber duração fictícia.

## MUSIC — composição e teoria

O Music Domain guarda notas, pitch/acidente/oitava, início/duração em beats, velocity, tempo map, compasso, tonalidade/escala, acordes e clips. A4 é MIDI 69/440 Hz e C4 é MIDI 60 no 12-TET. O concert pitch pode alterar a referência de frequência. Mapas de tempo exigem BPM positivo, beats não negativos e pontos únicos; o primeiro BPM vale retroativamente até o beat zero.

Edite BPM, compasso, tonalidade e escala nos controles musicais disponíveis. Notas fora da escala continuam permitidas; qualquer correção tonal é uma ação explícita. Quantize e Humanize não devem ser aplicados sem intenção e guardam valores de origem para reversão quando o comando está disponível.

O metrônomo subdivide pela unidade indicada pelo denominador (por exemplo, seis colcheias em 6/8), acentua o início do compasso e posiciona o count-in antes do primeiro beat. Após seek, ele retoma no próximo pulso; mudanças de BPM usam o tempo map. Medição de deriva/latência em hardware continua pendente.

## PIANO ROLL

Abra Piano Roll/Compose no Audio Studio. Crie nota com duplo clique na grade; selecione uma nota ou use Shift/Ctrl/Cmd para seleção múltipla; arraste para mover/alterar duração; edite início, duração, tuplet, velocity e articulação/expressão no inspector. Use os comandos de duplicar, apagar, transpor, quantizar/humanizar e reverter conforme necessário. Alterne para Score para conferir o mesmo estado musical. O teclado virtual disponível no painel MIDI pode pré-escutar o synth local.

### Tempo Track

No painel Tempo Track, cada bloco representa um ponto do mapa de BPM. O ponto no beat 0 define o tempo inicial e não pode ser movido ou removido. Para criar uma mudança, informe beat maior que zero e BPM de 20 a 300, pressione “Adicionar mudança”, revise o mapa e então “Aplicar mapa”. Beats repetidos são rejeitados; para alterar um ponto existente, edite o campo BPM/beat desse ponto e aplique. Remover um ponto e aplicar registra uma única alteração no histórico do Music Domain.

### Arrangement, Chord e Sync Tracks

No Piano Roll ou Score, a faixa “Arranjo · Acordes · Sync” edita o mesmo estado musical persistido. Em “Seções do arranjo”, selecione Intro, Verso, Pré-refrão, Refrão, Ponte, Break, Build, Drop, Outro ou Personalizada, defina início e fim em beats absolutos e adicione. Intervalos inválidos ou sobrepostos são recusados. Cada seção gera um marcador Seção no início; removê-la também remove esse marcador vinculado.

Na Chord Track, escolha raiz, qualidade, beat inicial e duração para criar um acorde. Ele é guardado em Chords e suas notas são materializadas no Piano Roll com vínculo de acorde, para que reprodução e edição continuem usando o modelo musical existente. Remover o acorde remove as notas que ele próprio gerou, sem apagar notas independentes.

Os Sync Markers aceitam Beat, Compasso, Seção e Transição, com posição e rótulo. A posição é expressa em beats de semínima; Compasso só aceita o início de um compasso conforme a fórmula de compasso atual. Criar/remover essas faixas é uma operação do projeto, portanto entra no histórico e autosave existentes. O runtime de música adaptativa ainda não usa esses marcadores para disparar transições.

Na Key / Scale Track, escolha beat, tônica, acidente e escala e pressione “Definir tonalidade”. O mapa inicia no beat zero; mudanças posteriores entram em vigor no início do compasso indicado (validado pela fórmula de compasso) e substituem um ponto já existente no mesmo beat. O ponto base não pode ser removido. A tonalidade global continua servindo de compatibilidade e ponto de partida para projetos anteriores. A validação e “Corrigir conforme Key Track” respeitam a tonalidade correspondente ao início de cada nota. O Score mostra a tonalidade efetiva abaixo de cada compasso e desenha as divisórias de compasso; MusicXML grava mudanças na armadura, enquanto o PDF textual lista até oito mudanças (sinalizando excedentes), mas não desenha armaduras de partitura.

O mesmo editor está disponível no Score. Durante playback, aplicar um novo mapa reagenda notas futuras e metrônomo sem reiniciar clips de áudio contínuos; o teste browser confirma que o transporte continua e que mapa/notas sobrevivem ao reload. Ainda faltam ensaio longo com muitas mudanças de tempo, medição de deriva e performance em milhares de notas.

Confirme alterações com Undo/Redo e recarregue o projeto. A sequência canônica C4–E4–G4–C5 foi validada entre Score/Piano Roll, playback, save/reload e WAV.

## SCORE / PARTITURA

Abra Score. A vista lê e edita o modelo musical compartilhado com Piano Roll; crie/selecione notas e acordes nos controles disponíveis, escolha vozes quando habilitado e exporte MusicXML ou PDF para inspeção externa. Não trate o Score como editor de gravura profissional completo: layout convencional avançado, claves/polifonia complexa e validação com leitor externo ainda têm limitações registradas na auditoria.

## MIDI

Use Import MIDI para selecionar `.mid` e converter faixas/notas para o projeto. MIDI exporta formatos suportados pelo fluxo atual. Para instrumento físico, abra o painel MIDI, pressione Atualizar, selecione uma entrada e Conectar; permissões/indisponibilidade devem ser exibidas claramente. O teclado A–K e as teclas C4–C5 são alternativas locais; Gravar MIDI registra eventos recebidos e os converte para beats.

Web MIDI requer navegador/permissões compatíveis e hardware conectado. A implementação dos CC é parcial; a validação manual com hardware ainda não foi executada.

## SYNTH / INSTRUMENTS

O synth local inclui formas de onda disponíveis, ganho, detune, envelope ADSR, filtro e LFO nos destinos implementados. O preset ativo participa de playback e render musical. Use versões e exportação/importação de presets para guardar timbres. O synth é real, mas não equivale a um piano acústico sampleado: timbre de piano dedicado aguarda escolha/licença.

## SAMPLER E DRUM SEQUENCER

Em Sound Design, selecione um asset de áudio já ligado ao projeto, informe nome e root MIDI e defina a faixa de notas; adicione o sampler. No Drum Sequencer, crie pattern, escolha sampler por lane, ative steps e ajuste velocity/probability/microtiming. Envie o pattern para a composição e reproduza pelo Audio Engine.

Testes browser confirmam asset/sample real, persistência após reload, drum hit e render melódico C3/C4/C5 medido no WAV com tolerância de 8 Hz. Multi-sampling, banco por zona e avaliação auditiva em hardware permanecem pendentes.

## SOUND DESIGN / AMBIENCE / SFX / FOLEY

Sound Design gera WAV procedural local real para os tipos de ambience disponíveis (incluindo chuva, vento e floresta) e ruído procedural. Ajuste os parâmetros expostos; o resultado vira asset com proveniência e pode ser inserido na timeline. Ambience Layers organizam faixas AMBIENCE separadas para volume/pan/mute/solo, roteamento, automação e exportação de stem.

SFX/FOLEY podem ser organizados em tracks/assets e Game Audio pode carregar metadados de variação/evento. Porém o SFX Creator categorizado, workflow completo de Foley, Sound Graph composável, randomização de camadas e designer de chuva com todos os parâmetros especificados ainda são parciais ou pendentes.

### Loops de áudio

Selecione clip, ative loop, indique limites relativos à fonte e crossfade. O DSP equal-power é aplicado a playback/render temporário sem alterar a fonte. A ferramenta não oferece inspeção/preview repetido de seam nem garante ausência de gap audível em todo material; faça avaliação auditiva externa antes de distribuir um loop.

## VOICE / EUTERPE

Voice mantém perfis, direção editorial, dicionário de pronúncia, takes e processamento local suportado. Takes sem asset são rascunhos, não áudio. Processamento local aceita formatos/PCM definidos pelo runtime e gera asset derivado preservando a fonte.

Não existe provider real de voz configurado nesta revisão. Logo, geração de voz Euterpe, identidade acústica, A/B de takes de provider e pronúncia enviada ao serviço não devem ser anunciadas como disponíveis. Não adicionar segredo ao frontend, projeto, logs ou Git.

## MIX E MASTER

Use mixer para faders, pan, mute/solo, buses/Aux, sends, inserts e Master. A topologia deve rejeitar rotas inexistentes/cíclicas; volume/pan/solo e efeitos influenciam playback e render. Automação existente pode ser editada na lane e verificada em reprodução/export.

Mastering aqui significa mix bus e processamento disponíveis; não há alegação de master automático certificado, loudness compliance universal ou true peak certificado. Referência/A-B avançados seguem parciais.

## ANALYSIS

Abra Analysis para analisar clips locais ou ativar tuner/input explicitamente. LUFS, peak/RMS, estimativa de pitch/frequência/cents, ritmo/transientes e espectro têm limitações de janela, canais e confiança; pitch sem confiança suficiente não deve mostrar nota inventada. Tuner requer permissão e sinal sustentado. Pare o microfone e libere o stream ao terminar. Teste manual com instrumento real ainda pendente.

## EXPORT / RENDER

Abra Export, selecione Mix, Região, faixa/stems ou clip conforme o destino. Selecione explicitamente as faixas de stems; a região precisa ter fim maior que início. Render WAV é asset derivado e não substitui a timeline. O E2E atual verifica WAV real de mix, composição MIDI audível, clip selecionado e stems. Formatos além de WAV dependem de capacidade explícita; não inferir suporte.

## GAME AUDIO

Defina grupo/seed na faixa, peso/tags/ranges/loop no clip/evento e exporte JSON ou Bundle local. O Game Audio Browser pesquisa grupos/tags/eventos e navega ao clip. JSON referencia IDs locais; Bundle pode transportar bytes/hash para reimportação local segundo os contratos. Game Studio reproduz eventos em Play Mode nos caminhos cobertos.

Limites: gameplay/adaptive transitions completos e equivalência do runtime standalone/exportado não estão prontos. Validar importação em outro perfil/dispositivo; não substituir assets ausentes pelo nome.

## TESTES MANUAIS E ERROS

Execute e registre os cenários `AS-01` a `AS-49` no [checklist de aceite](./audio-studio-manual-acceptance-checklist.md), usando os estados permitidos “Não executado”, “Passou”, “Falhou” ou “Bloqueado” e anexando evidência não sensível. Automatização verde não significa que hardware, licença, provider ou qualidade auditiva foram aprovados.

Erros esperados devem permanecer explícitos: runtime Web Audio indisponível, codec/duração inválidos, permissão/dispositivo de gravação, asset/sample ausente ou corrompido, provider não configurado, falha de storage/quota e render inválido. Não contornar por silêncio, fallback tonal, duração estimada ou sucesso simulado.
