# Altis Games — painel simplificado

## Publicar

1. No Supabase, abra SQL Editor e execute **supabase-painel-simples.sql** (execute novamente mesmo se ja usou a V13, para criar o bucket de imagens).
2. Envie os arquivos do projeto ao GitHub Pages, mantendo a pasta `assets`.
3. Abra `admin.html`, digite o código `Altistas123` e gerencie os jogos.

O código é **mockado** e está no arquivo `admin.js`; pode ser alterado na constante `ACCESS_CODE`. O código apenas oculta a interface: **não protege os dados**. O SQL permite leitura e escrita anônimas em `public.games`, inclusive pela API, sem o código. Não use para informações confidenciais. Para um ambiente público com controle de acesso real, será necessário autenticação ou um backend.

A tabela `games` e seus dados são preservados. O SQL remove tabelas e função antigas de login (`game_admins`, `game_usernames`, `is_game_admin`), se existirem. As contas de `auth.users` não são apagadas. O SQL também substitui as políticas RLS de `games`.

**Arquivos SQL:** há apenas um, o script de migração necessário. Nenhum script legado de autenticação foi mantido.

## Filtros por categoria (V13)

O catalogo cria automaticamente os botoes de filtro a partir de `games.categories` dos jogos publicados. Clique em Todos para restaurar a lista completa. Categorias com diferencas apenas de maiusculas/minusculas ou acentos sao agrupadas. Nao e necessario executar SQL adicional.


## Upload de imagens (V14)

No painel, escolha uma imagem no computador (PNG/JPG/WEBP/GIF/AVIF ate 8 MB), veja a previa e clique em Salvar. O arquivo vai para o bucket publico `game-images` do Supabase Storage, e o caminho e salvo automaticamente em `games.image_path`. Imagens locais antigas (`assets/...`) continuam funcionando. Ao editar, nao e preciso reenviar a imagem se ela nao mudou. As imagens antigas nao sao apagadas automaticamente ao substituir/excluir um jogo.

**Atencao:** o acesso anonimo ao bucket permite uploads por qualquer pessoa que conheca a URL e chave publica, podendo consumir a cota de Storage. Para uso publico de longo prazo, substitua por autenticacao real. Nao compartilhe a chave service_role no site.
