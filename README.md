# Minha FT — Login e perfis com Supabase

Este projeto contém uma página de acesso com:
- login e cadastro por e-mail/senha;
- perfis separados para Administrador e Usuário;
- aprovação de contas;
- atualização de senha dentro do perfil;
- recuperação de senha por e-mail;
- Supabase Auth e tabela `profiles` com Row Level Security (RLS).

## 1. Criar o projeto Supabase
1. Entre em https://supabase.com e crie um projeto.
2. Abra **SQL Editor** e execute todo o conteúdo de `schema.sql`.
3. Em **Project Settings → API** (ou Connect), copie a Project URL e a chave publicável/anon.
4. Cole esses valores no arquivo `config.js`. Não coloque a `service_role` no navegador.

## 2. Publicar a página
Os arquivos `index.html`, `app.js`, `styles.css` e `config.js` devem ficar na mesma pasta.
Pode publicar em Netlify, Cloudflare Pages ou GitHub Pages. Faça upload da pasta/arquivos conforme o serviço escolhido.
Depois de publicar, copie o link gerado e compartilhe.

No Supabase, configure **Authentication → URL Configuration**:
- Site URL: URL pública do site;
- Redirect URLs: inclua a URL pública do site, por exemplo `https://seu-site.netlify.app/**`.

Para testar localmente, use um servidor estático (por exemplo, a extensão Live Server do VS Code); não abra apenas por `file://`.

## 3. Como funciona a aprovação e os perfis
Por segurança, o cadastro público sempre cria um perfil `user` com status `pending`, independentemente do tipo escolhido no formulário. Isso impede que qualquer pessoa se torne administradora selecionando uma opção no navegador.

Para aprovar uma conta de usuário:
1. A pessoa cria a conta e confirma o e-mail, se a confirmação estiver habilitada.
2. No Supabase, abra **SQL Editor** e execute, substituindo o e-mail:
```sql
update public.profiles p
set approval_status = 'approved'
from auth.users u
where p.id = u.id and lower(u.email) = lower('usuario@exemplo.com');
```

Para criar o primeiro administrador, cadastre uma conta com o e-mail escolhido. Depois de confirmar a identidade da pessoa, execute:
```sql
update public.profiles p
set role = 'admin', approval_status = 'approved'
from auth.users u
where p.id = u.id and lower(u.email) = lower('admin@exemplo.com');
```
O perfil de administrador e o perfil de usuário usam a mesma tela-base, mas exibem rótulos e descrições diferentes conforme o papel autorizado no banco.

## 4. Atualizar senha
Depois de entrar, o perfil contém o formulário **Atualizar senha**. O usuário informa e confirma a nova senha; o Supabase Auth salva a alteração.

## 5. Segurança importante
- Nunca publique a chave `service_role` no HTML, JavaScript ou repositório.
- A chave `anon`/publicável pode aparecer no frontend quando as políticas RLS estão corretas.
- O SQL deste pacote impede que usuários autenticados alterem seu próprio `role` ou `approval_status` pelo cliente.
- Para um sistema institucional ou com dados sensíveis, habilite confirmação de e-mail, use senhas fortes, limite tentativas e faça uma revisão de segurança antes de produção.
- A interface não implementa ainda um painel administrativo para aprovar usuários; a aprovação inicial é feita pelo SQL Editor. Um painel desse tipo deve usar funções de backend/Edge Functions e autorização validada no servidor, nunca uma chave `service_role` no navegador.

## Estrutura
- `index.html`: interface
- `styles.css`: visual
- `app.js`: login, cadastro, perfis e atualização de senha
- `config.js`: URL e chave pública do Supabase
- `schema.sql`: tabela, trigger e políticas de segurança
