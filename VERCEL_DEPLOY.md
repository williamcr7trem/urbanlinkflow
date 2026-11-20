# Guia de Publicação — UrbanLink Flow (Vercel + MySQL na Nuvem)

Este guia descreve o passo a passo completo para colocar o **UrbanLink Flow** no ar utilizando a **Vercel** (hospedagem da aplicação e API) e um banco de dados **MySQL remoto** (ex.: Aiven, TiDB ou Clever Cloud).

> **Importante:** O MySQL local do seu computador (`127.0.0.1`) funciona apenas para desenvolvimento na sua máquina. A aplicação publicada na Vercel exige um banco de dados hospedado na nuvem.

---

## 1. Preparação do Banco de Dados Remoto

Antes de configurar a Vercel, crie seu banco de dados na nuvem e monte a estrutura de tabelas:

1. **Crie o banco MySQL:** Cadastre-se em um provedor de banco de dados na nuvem (recomendado: **Aiven** no plano gratuito *Free*, selecionando **MySQL**) e anote as credenciais fornecidas: **Host**, **Porta**, **Nome do Banco** (ex.: `defaultdb`), **Usuário** e **Senha**.
2. **Conecte via MySQL Workbench:**
   - Crie uma nova conexão apontando para o **Host** e a **Porta** do provedor.
   - Na aba **SSL**, configure `Use SSL` como **Require** (obrigatório na maioria dos provedores em nuvem).
3. **Importe a estrutura (`database/schema.sql`):**
   - Abra o arquivo `database/schema.sql` no Workbench conectado ao banco remoto.
   - **Atenção:** Verifique as primeiras linhas do script. Se houver `CREATE DATABASE urbanlink_flow;` e `USE urbanlink_flow;`, substitua por `USE <NOME_DO_BANCO_REMOTO>;` (por exemplo, `USE defaultdb;`), garantindo que as tabelas sejam criadas dentro do banco que a aplicação vai acessar.
   - Execute o script (ícone do raio amarelo) e atualize a aba *Schemas* para confirmar que tabelas como `usuarios`, `veiculos` e `entregas` foram criadas.

---

## 2. Configuração do Projeto na Vercel

1. **Envie o código para o GitHub:** Suba os arquivos do projeto para um repositório no GitHub (certifique-se de que `.env` e `node_modules` estejam no `.gitignore` e não sejam enviados).
2. **Importe na Vercel:**
   - No painel da Vercel, clique em **Add New... → Project** e importe o repositório.
   - **Root Directory:** Mantenha `./` (ou aponte para a pasta raiz onde está o `package.json`).
   - **Application Preset (Framework):** Selecione **Other**. A Vercel identificará automaticamente a função serverless em `api/index.js` e as rotas estáticas em `public/` através do arquivo `vercel.json`.
   - *Nota:* Não clique em **Deploy** antes de preencher as variáveis de ambiente abaixo (ou faça um **Redeploy** após cadastrá-las).

---

## 3. Variáveis de Ambiente (Environment Variables)

Acesse **Project Settings → Environment Variables** e cadastre as chaves abaixo marcando os ambientes **Production**, **Preview** e **Development**:

### Conexão com o Banco de Dados
| Variável | Valor / Descrição |
| :--- | :--- |
| `DB_HOST` | Endereço do servidor fornecido pelo provedor (nunca use `127.0.0.1`) |
| `DB_PORT` | Porta do banco remoto (ex.: `3306` ou a porta customizada do provedor) |
| `DB_NAME` | Nome exato do banco onde as tabelas foram criadas (ex.: `defaultdb` ou `urbanlink_flow`) |
| `DB_USER` | Usuário do banco remoto (ex.: `avnadmin`) |
| `DB_PASSWORD` | Senha do banco remoto (cuidado com espaços em branco ao colar) |
| `DB_SSL` | `true` (se o provedor exigir conexão segura/TLS) ou `false` |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false` *(necessário para provedores que usam certificados autoassinados, como o Aiven)* |
| `DB_POOL_MAX` | `2` *(otimizado para funções serverless)* |
| `DB_SYNC` | `false` *(em produção, o schema deve ser gerenciado via SQL)* |

### Segurança, Administração e Atendimento
| Variável | Valor / Descrição |
| :--- | :--- |
| `JWT_SECRET` | Segredo aleatório forte com **no mínimo 24 caracteres** para assinar os tokens de login |
| `ADMIN_INVITE_CODE` | Código privado com **no mínimo 12 caracteres** para permitir o cadastro de administradores |
| `SUPPORT_PHONE` | Telefone exibido nos cartões de atendimento (ex.: `21999999999`) |
| `SUPPORT_EMAIL` | E-mail exibido nos cartões de atendimento |

### Geolocalização (Opcional — Padrão Gratuito)
| Variável | Valor / Descrição |
| :--- | :--- |
| `GEOCODING_ENABLED` | `true` |
| `GEOCODING_PROVIDER` | `nominatim` *(usa OpenStreetMap gratuito sem exigir chave de API)* |
| `GEOCODING_CONTACT_EMAIL` | Seu e-mail válido (exigido pela política de uso do Nominatim) |

> **O que NÃO configurar na Vercel:** Não adicione `NODE_ENV` (a Vercel já define `production` automaticamente) nem `PORT` (gerenciada pela infraestrutura). Sempre que alterar qualquer variável, vá em **Deployments → ... → Redeploy** para aplicar.

---

## 4. Checklist de Validação Pós-Deploy

Após o deploy finalizar com status **Ready**, execute os testes nesta ordem:

1. **Teste de Conexão (Health Check):**
   Acesse `https://SEU-DOMINIO.vercel.app/api/health`. O retorno deve ser um JSON com `"status": "ok"` e `"banco": "conectado"`.
   - *Se retornar `"indisponivel"`:* Verifique `DB_HOST`, `DB_PASSWORD` e se `DB_SSL_REJECT_UNAUTHORIZED=false` foi salvo antes do último deploy.
2. **Cadastro de Administrador:**
   Acesse a página inicial, vá para a tela de cadastro, escolha o perfil **Administrador** e utilize o código definido em `ADMIN_INVITE_CODE`.
3. **Fluxo Operacional:**
   Teste o login, a criação de entregas, o cadastro de veículos/motoristas e as permissões de cada perfil.
4. **Mapa e Rotas:**
   Abra a página de mapa, autorize a localização no navegador e valide se as entregas com latitude/longitude são exibidas e traçadas corretamente (teste tanto no computador quanto no celular).

---

## 5. Arquitetura e Limitações Conhecidas

- **Mapas e Traçados:** A interface utiliza **Leaflet**, mapas-base do **OpenStreetMap** e o serviço público **OSRM** para visualização viária. A disponibilidade e o tempo de resposta dependem desses serviços externos e da conexão com a internet. O cálculo de distância salvo no banco utiliza o algoritmo interno da API; o traçado OSRM é apenas visual.
- **Geolocalização no Navegador:** Exige acesso via **HTTPS** (fornecido automaticamente pela Vercel) e permissão explícita do usuário. Entregas sem coordenadas não aparecem no mapa.
- **Veículos no Mapa:** Só são exibidos após terem uma posição registrada por um motorista ou usuário autorizado.
- **Armazenamento de Arquivos e CNH:** O sistema salva o documento de CNH diretamente no banco de dados (verifique o limite de tamanho de pacotes `BLOB`/`TEXT` no seu provedor MySQL). Como a Vercel não possui disco persistente, a pasta local `uploads/` não deve ser usada em produção; caso precise salvar arquivos físicos no futuro, utilize um serviço externo (como AWS S3, Cloudflare R2 ou Cloudinary).