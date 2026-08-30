# ADR-024: Pipeline de Compilação de Jogos e Descoberta Honesta de Capacidades

## Status
ACCEPTED

## Contexto
O processo de build de um jogo deve ser rastreável, reproduzível e isolado.
Além disso, solicitar exportação para plataformas sem toolchains nativas instaladas (como Android APK ou Windows EXE) não pode gerar falsos executáveis ou promessas enganosas.

## Decisão
1. **Compilação via JobManager**: O build é executado como um job formal (`JobType: "CODE_EXECUTION"`), gerando um pacote Web HTML5 real registrado como `Derived Asset` no `AssetManager`.
2. **Descoberta Honesta de Capacidades (`canExport`)**: Plataformas sem toolchain retornam explicitamente `CAPABILITY_UNAVAILABLE`, informando ao usuário e à Athena exatamente o que está ausente.
3. **Build Não Implica Publicação**: O executável gerado permanece como ativo derivado até que o usuário decida exportar ou publicar explicitamente.

## Consequências
### Positivas
* Transparência total no pipeline de criação.
* Empacotamento Web interoperável e seguro sem dependência de nuvem externa.
### Negativas / Mitigações
* Builds nativos para consoles ou mobile exigirão bridges de toolchain adicionais no futuro.

