# Ícone global do Web App

O proprietário pode alterar o ícone em **Administração → Ícone global do VARYNTH**. A alteração é compartilhada pela plataforma inteira; não é uma preferência local do navegador.

O controle aceita somente PNG quadrado entre 192 × 192 e 1024 × 1024 pixels, com até 512 KB. A imagem é salva no Redis compartilhado da plataforma e servida pelo endpoint público `/api/app-icon`, usado pelo favicon, pelo ícone Apple e pelo manifesto `/manifest.json`. O endpoint administrativo `/api/admin/app-icon` exige perfil de proprietário e valida a origem das mutações. Sem personalização, o ícone padrão volta a ser servido.

O manifesto mantém a identidade `/dashboard` e recebe uma URL versionada para o ícone. Navegadores e instalações Android/desktop refletem a imagem global conforme voltam a sincronizar o manifesto. O sistema operacional não oferece à aplicação web um comando para substituir imediatamente todo atalho já instalado. No iPhone e iPad, pode ser necessário remover o atalho antigo e adicioná-lo novamente.

Em desenvolvimento local, a configuração fica em `.varynth-data/app-icon.json`; na Vercel, a escrita depende do Redis compartilhado já usado pelo cadastro de contas. Falha de persistência não troca silenciosamente o ícone publicado.
