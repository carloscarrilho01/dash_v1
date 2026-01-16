# Configuração do Supabase - Autenticação

Este guia mostra como configurar a autenticação com Supabase no projeto.

## 1. Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha:
   - **Name**: Nome do seu projeto (ex: "dash-v1")
   - **Database Password**: Crie uma senha forte
   - **Region**: Escolha a região mais próxima (ex: South America - São Paulo)
5. Clique em "Create new project"

## 2. Obter Credenciais

Após o projeto ser criado:

1. No menu lateral, clique em **Settings** (ícone de engrenagem)
2. Clique em **API**
3. Copie as seguintes informações:
   - **Project URL** (em "Project URL")
   - **anon public** key (em "Project API keys")

## 3. Configurar Variáveis de Ambiente

1. Crie um arquivo `.env` na raiz do projeto
2. Copie o conteúdo de `.env.example`
3. Preencha as variáveis do Supabase:

```env
VITE_SUPABASE_URL=sua_project_url_aqui
VITE_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

## 4. Criar Usuário de Teste

1. No Supabase, vá em **Authentication** → **Users**
2. Clique em "Add user" → "Create new user"
3. Preencha:
   - **Email**: seu@email.com
   - **Password**: sua_senha_segura
   - **Auto Confirm User**: ✅ Marque esta opção
4. Clique em "Create user"

## 5. Configurar Políticas de Segurança (RLS)

O Supabase usa Row Level Security (RLS) para proteger os dados. Por padrão, a autenticação já funciona sem configuração adicional.

Se você quiser adicionar uma tabela de perfis de usuários futuramente:

```sql
-- Criar tabela de perfis
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver apenas seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

## 6. Testar a Autenticação

1. Inicie o projeto: `npm run dev`
2. A tela de login deve aparecer
3. Use as credenciais criadas no passo 4
4. Você deve ser redirecionado para o dashboard

## 7. Configurações Adicionais (Opcional)

### Email Templates

Customize os emails de confirmação e recuperação de senha:

1. Vá em **Authentication** → **Email Templates**
2. Edite os templates conforme necessário

### Providers Sociais

Para adicionar login com Google, GitHub, etc:

1. Vá em **Authentication** → **Providers**
2. Ative o provider desejado
3. Configure as credenciais OAuth

### URL de Redirecionamento

Configure as URLs permitidas para redirecionamento:

1. Vá em **Authentication** → **URL Configuration**
2. Adicione suas URLs em "Redirect URLs":
   - `http://localhost:5173` (desenvolvimento)
   - `https://seu-dominio.com` (produção)

## Solução de Problemas

### Erro: "Invalid API credentials"

- Verifique se as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estão corretas no `.env`
- Certifique-se de usar a **anon** key, não a **service_role** key

### Erro: "Email not confirmed"

- No Supabase, vá em Authentication → Users
- Encontre o usuário e clique em "..."
- Clique em "Confirm email"

### Login não funciona

- Verifique se o arquivo `.env` está na raiz do projeto
- Reinicie o servidor de desenvolvimento após alterar o `.env`
- Verifique o console do navegador para mensagens de erro

## Estrutura de Arquivos Criados

```
src/
├── lib/
│   └── supabase.js          # Cliente do Supabase
├── contexts/
│   └── AuthContext.jsx      # Contexto de autenticação
├── components/
│   ├── Login.jsx            # Tela de login
│   └── Login.css            # Estilos da tela de login
└── App.jsx                  # Atualizado com lógica de autenticação
```

## Próximos Passos

- [ ] Adicionar recuperação de senha
- [ ] Implementar registro de novos usuários
- [ ] Criar perfis de usuário
- [ ] Adicionar controle de permissões (admin, agent, etc)
- [ ] Integrar autenticação com backend (enviar token JWT)
