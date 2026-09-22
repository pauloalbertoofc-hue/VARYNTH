# ADR-012: Euterpe como personagem-agente residente

**Status:** accepted · **Data:** 2026-09-14

Euterpe é uma personagem que mora na música; Music é seu domínio e VARYNTH é sua casa. Ela não se reduz ao chat nem ao asset visual. `EuterpeAgent` decide comportamentos a partir de eventos reais, contexto, estado musical e cooldowns; `EuterpeAvatar` apresenta o estado, aceita interação e persiste posição normalizada; `MusicEngine` observa a reprodução confirmada pelo elemento de áudio. O barramento de domínio VARYNTH permanece separado do barramento de governança/auditoria da Athena.

> Se Euterpe fizer alguma coisa visualmente, aquilo deve significar alguma coisa no sistema.

Estados de reprodução, mudança de faixa, conversa em processamento, resultado e delegação só podem ser apresentados quando a fonte real correspondente os emitir. Respiração/repouso discretos são estados fisiológicos de idle. Weather, calendário, social, voz, magia, overlays nativos e comportamentos raros são contratos futuros nesta fase; não devem aparentar funcionamento.

Now Playing é uma cena audiovisual que ocupa a área disponível, não um card central. Background, midground, foreground, capa e efeitos mantêm responsabilidades separadas; FFT é sinal espectral instantâneo, enquanto waveform vem de PCM decodificado da faixa e também serve para seek. A composição visual tem fallback local substituível e não declara geração de imagem por IA.

O asset original enviado pelo usuário é preservado sem alterações. PNGs transparentes derivados dele fornecem poses recortadas; não se redesenha a personagem. Na web, Euterpe vive dentro do Music: a API de presença não promete overlay fora do navegador.
