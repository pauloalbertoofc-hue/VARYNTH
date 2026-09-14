# Sincronização de conversas da Athena

As conversas permanecem **local-first**: cada dispositivo guarda uma cópia local e continua utilizável sem rede. Quando o titular entra na mesma conta em outro dispositivo, a aplicação concilia uma cópia privada no armazenamento persistente configurado.

- A identificação da conta vem da sessão autenticada; chaves de conversas são isoladas por usuário.
- Edições de conversas diferentes são preservadas. Para a mesma conversa, prevalece a edição mais recente.
- Exclusões permanentes geram um marcador de remoção, impedindo que um aparelho antigo restaure indevidamente uma conversa apagada.
- Sem autenticação segura ou armazenamento persistente configurado, a interface permanece local e informa que o histórico está somente no aparelho.

O mecanismo usa um route handler interno do VARYNTH e Redis persistente. Ele não chama modelos de IA nem exige APIs comerciais de IA; essa exceção é necessária exclusivamente para manter dados privados disponíveis entre dispositivos.

## Ativação em produção

Na implantação, configure Redis persistente, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` e um provedor de login, então ative `VARYNTH_AUTH_ENABLED=true`. Todos os dispositivos devem entrar com a mesma conta. Sem isso, a sincronização entre aparelhos é deliberadamente bloqueada para evitar mistura de históricos.
