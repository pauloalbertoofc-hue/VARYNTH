# Music: identidade visual e personagem viva

`TrackVisualIdentity` mantém a identidade por `trackId`, separando capa, fundo, ambiente, animação e reatividade. A capa aceita origem incorporada quando disponível no metadata futuro, upload do operador e resultado gerado; o provider local atual é procedural e não simula IA. Uploads de capa/fundo são gravados no perfil visual da faixa.

`VisualIntent` descreve o pedido de Euterpe para a Athena. `EuterpeVisualGenerationBridge` retorna candidatos; a aplicação só salva depois de escolha explícita. Geração de capa, fundo, ambos, identidade completa e capa animada possuem escopos distintos.

`EnvironmentEffect` e `SceneAnchor` permanecem separados do artwork. Anchors evitam controles e oferecem pontos de descanso futuros. `BackgroundRendererKind` e `AnimatedCoverKind` permitem STATIC, PARALLAX, ANIMATED, VIDEO_LOOP, PROCEDURAL e LAYERED sem obrigar GIF ou vídeo.

`idlePhase`, `MovementPlan`, `RestSpot` e `EuterpeProp` formam a base do ciclo ACTIVE_IDLE, RELAXED_IDLE e REST_ELIGIBLE. O movimento futuro deve percorrer a origem até o destino, respeitar áreas seguras e ser interrompível. Pausa e idle não significam sono automático.

`EuterpePresenceMode` separa MUSIC_SCENE, presença global, overlay de sistema e contexto de lock screen. `detectPlatformCapabilities` declara que a web/PWA possui Media Session quando disponível, mas não possui overlay visual nem lock screen visual. `SystemMediaSession` continua convencional; `VarynthVisualSession` permanece a cena dentro do VARYNTH.
