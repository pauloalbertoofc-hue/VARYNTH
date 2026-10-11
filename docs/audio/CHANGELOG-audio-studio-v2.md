# Changelog — VARYNTH Audio Studio v2 (em desenvolvimento)

Data da atualização local: 23/09/2026  
Release público: **não publicado**. Este changelog descreve mudanças verificadas neste ciclo de desenvolvimento, não declara a versão completa.

## Adicionado e evoluído

- Drum Sequencer ligado a samplers/áudio real do projeto, com patterns persistentes, steps, velocity, probability, microtiming e envio de hits ao modelo musical.
- Seleção de asset de áudio pelo catálogo do projeto no Sampler, evitando entrada manual de IDs; playback de drum sample pelo Audio Engine e encaminhamento pelo mixer existente.
- Cobertura E2E do pattern: editar parâmetros, recarregar projeto, conferir persistência e reproduzir sample sem erro.
- Sampler melódico atribuído diretamente a tracks INSTRUMENT; notas usam o sample com pitch-rate, envelope ADSR, filtro e ganho no playback e no render WAV offline.
- E2E de ponta a ponta cria sampler e faixa, atribui o instrumento, cria nota e verifica que o WAV exportado contém PCM não silencioso.
- E2E também recarrega o projeto e confirma a persistência da atribuição de instrumento antes de criar nota e exportar.
- Cabeçalho da faixa agora oferece botão de seleção nomeado e acessível por teclado; seleção de faixa no outline/timeline e criação de faixa limpam a seleção de clips que poderia esconder os controles do instrumento no inspector.
- Sequência canônica C4–E4–G4–C5 validada no Score e Piano Roll: alteração sincronizada, Undo/Redo, migração/reload, playback e WAV; o E2E estima cada frequência no PCM renderizado com tolerância de 8 Hz.
- Auditoria por requisito ampliada para mapear as seções 1–110 e milestones A–Q sem tratar placeholders/fundações arquiteturais como features concluídas.
- Manual operacional v2, relatório de testes e matriz de limitações/documentação localizados em `docs/audio/`.
- Tempo Track compartilhada por Piano Roll e Score, com pontos BPM editáveis/adicionáveis/removíveis, validação de limites/duplicatas e preservação do BPM inicial. Alterações usam Music Domain, history e autosave existentes.
- Mudanças de BPM durante playback reagendam eventos musicais e metrônomo sem encerrar clips de áudio contínuos. O cálculo da nota cruza corretamente os segmentos de tempo.

## Corrigido

- Conversão do Music Domain agora normaliza o mapa de tempo com BPM inicial retroativo quando o primeiro ponto explícito ocorre depois do beat zero.
- Mapas de tempo rejeitam BPM não positivo, beats negativos/não finitos e pontos duplicados em vez de produzir tempos silenciosamente incorretos.
- Cálculo de beats por compasso valida numerador inteiro positivo e denominadores suportados.
- Metrônomo agenda subdivisões pelo denominador (6/8 = seis colcheias por compasso), count-in real antes do beat zero, acento de compasso, seek e BPM variável sem colapsar os ticks.
- Testes musicais reforçam A4 = MIDI 69 = 440 Hz, C4 = MIDI 60 e os casos inválidos/retroativos acima.

## Verificação desta rodada

- Audio domain/regression suites: 39 aprovados, 0 falhas, 4 skips que dependem de runtime Web Audio.
- E2E Audio Studio serial: 30/30; E2E de Drum Sequencer e sampler melódico: 2/2. O cenário melódico verifica exportação WAV e amplitude PCM não silenciosa.
- TypeScript, ESLint focal dos arquivos Audio e `git diff --check` passaram. A aplicação Next compilou no build final, mas o typecheck do build foi bloqueado por erros concorrentes em `src/lib/knowledge/vault-adapter.ts:26,33`; portanto, esta rodada não possui build de produção final verde. Build anterior, anterior ao scheduler, havia gerado 61 páginas.
- `npm run test:audio-studio` agora inclui `metronome-domain.test.ts`; execução completa: 39 aprovações/0 falhas/4 skips ambientais e todas as suítes de domínio passaram.
- Teste de domínio do metrônomo e E2E de configuração/count-in passaram após a correção.
- E2Es direcionados para a sequência musical compartilhada e para persistência/render após reload: 2/2 aprovados nesta atualização; TypeScript e ESLint focal também aprovados. O teste de render mede C4/E4/G4/C5 no WAV, além de confirmar RIFF e PCM16.
- Um E2E independente da Biblioteca Music (persistência de capa GIF) falhou em checkout concorrente; não foi alterado nem contado como aprovado pelo Audio Studio.

## Ainda não nesta versão / limitações

- Nenhum provider remoto de música/voz/som está configurado; não há geração externa nem Voice Lab A/B real.
- Piano acústico sampleado/licenciado não está incluído; o synth genérico não deve ser chamado de piano.
- Seam inspection/preview, Sound Graph, SFX/Foley workflows completos, Arrangement/Tempo/Key tracks dedicados, adaptive music completo e runtime standalone de Game Audio permanecem parciais ou pendentes.
- Hardware MIDI/microfone, teste auditivo de loops/exports, checklist manual integral, benchmark de projetos grandes e publicação não foram concluídos.

## Validação complementar — 23/09/2026

- O E2E de sampler melódico agora mede o áudio realmente exportado em C3, C4 e C5 a partir de um sample A4=440 Hz; a faixa de instrumento e sua atribuição sobrevivem ao reload. As três frequências renderizadas atendem à tolerância de 8 Hz.
- E2Es do Drum Sequencer e sampler: 2/2 aprovados; regressões de domínio Audio: 39 aprovadas, 0 falhas e 4 skips de ambiente Web Audio.
- TypeScript, ESLint focal e `git diff --check` aprovados.
- Build de produção passou com typecheck e 62 páginas estáticas; regressão documental 43 rotas/36 ferramentas/12 agentes/18 módulos e certificação Athena 15/15 aprovadas.
- Não houve teste manual/hardware nem publicação nesta rodada.

## Validação complementar — Tempo Track — 23/09/2026

- E2E criou nota numa faixa INSTRUMENT, adicionou mudança BPM no beat 2, iniciou playback, alterou esse ponto enquanto tocava e confirmou transporte ativo sem erro.
- Após pausa e reload, o mapa BPM=60 e a nota permaneceram no projeto.
- Teste de domínio validou atraso dos eventos futuros e duração de nota entre segmentos com BPM distinto. `npm run test:audio-studio`, TypeScript, ESLint focal e `git diff --check` passaram antes do build subsequente.
- Build subsequente passou com TypeScript e 62 páginas estáticas; regressão documental 43 rotas/36 ferramentas/12 agentes/18 módulos e certificação Athena 15/15 também passaram.

## Validação complementar — Arranjo musical — 23/09/2026

- Piano Roll e Score agora compartilham uma faixa persistente de seções, acordes e marcadores musicais.
- Seções oferecem presets e nomes customizados, intervalos em beats e validação para impedir sobreposição; marcador Section acompanha a seção e é removido junto dela.
- Chord Track cria/remove acordes e suas notas materializadas ligadas; Sync Track valida compasso contra o time signature e suporta Beat, Bar, Section e Transition.
- Compatibilidade legacy normaliza as novas listas; testes de domínio/migração e E2E de criação, reload e visibilidade em Score passaram.
- Edição por arrasto e execução dos marcadores pelo runtime adaptativo continuam pendentes; não é release publicado.
- Key/Scale Track adiciona mapa tonal persistido por beat; E2E prova modulação após reload, MusicXML exporta a armadura de cada mudança de compasso e o resumo PDF lista mudanças tonais com limite explícito de uma página.
- Alterações tonais agora são validadas no início de compasso conforme o compasso musical corrente; indicação e correção de notas usam a tonalidade ativa no beat de cada nota, preservando notas corretas após modulação.
- Score alinha divisórias visuais e rótulos de tonalidade aos compassos calculados pela fórmula vigente; E2E confirma a modulação no compasso 5 depois de salvar e reabrir. A visualização ainda não desenha símbolos convencionais de armadura.
- Music domain, migração, MusicXML (incluindo mapa tonal), E2E ampliado, ESLint focal e typecheck da aplicação com exclusão temporária de tipos `.next/dev` passaram. O `next build` compile step foi verde, mas a checagem integrada final segue bloqueada pelos arquivos gerados malformados `.next/dev/types/routes.d.ts` e `validator.ts`; `tsconfig.json` foi restaurado e a publicação não foi feita.

## Documentos relacionados

- [Manual operacional v2](./audio-studio-v2-manual.md)
- [Auditoria de conclusão e matriz 1–110 / A–Q](./audio-studio-v2-completion-audit.md)
- [Checklist de aceite manual](./audio-studio-manual-acceptance-checklist.md)
- [Arquitetura Audio Studio](../architecture/audio-studio-architecture.md)
