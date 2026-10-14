# AltiGames - Portfolio v17

Publicar os arquivos desta pasta no repositorio GitHub Pages do portfolio.

## Alteracoes
- Painel admin com login Supabase Auth, verificando public.altigames_admins.
- Upload de banners PNG/JPG/WebP (ate 5 MB) pelo Worker altigames-media-api, game=portfolio.
- URLs existentes do R2 e antigas URLs do Supabase continuam aceitas na leitura.
- Banners existentes nao sao apagados automaticamente ao editar/excluir registros.

## Seguranca
**Obrigatorio:** configurar RLS da tabela public.games para escrita exclusiva dos administradores.
Enquanto permissões anonimas de escrita existirem, login no painel nao protege a API diretamente.
Nao excluir os arquivos originais do Supabase antes de testar todo o fluxo.
