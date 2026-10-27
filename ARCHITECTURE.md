# Arquitetura do Monorepo

Monorepo do **Animal Helper**: **API NestJS** e **front Next**, com **npm workspaces** e **Turborepo**. As decisões específicas do produto estão no [prd.md](prd.md#11-arquitetura-técnica-monorepo).

| Documento                                            | Conteúdo                                                       |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| Este arquivo                                         | visão geral, regras entre apps e pacotes, contrato, infra e CI |
| [apps/api/ARCHITECTURE.md](apps/api/ARCHITECTURE.md) | camadas, convenções e checklist da api                         |
| [apps/web/ARCHITECTURE.md](apps/web/ARCHITECTURE.md) | SSR-first, estrutura, testes, Storybook e checklist do web     |

---

## 1. Requisitos

| #   | Requisito                                                                                     |
| --- | --------------------------------------------------------------------------------------------- |
| R1  | **npm em tudo**: sem yarn, pnpm ou bun (o `preinstall` bloqueia)                              |
| R2  | **api com 100% de cobertura** (statements, branches, functions e lines)                       |
| R3  | **web com 100% de cobertura**                                                                 |
| R4  | **web documentado no Storybook**                                                              |
| R5  | **web SSR-first**: Server Components por padrão; Client Components explícitos (`.client.tsx`) |

Os pacotes internos (`packages/*`) com código também têm 100% de cobertura.

---

## 2. Estrutura

```
.
├── apps/
│   ├── api/                  # NestJS + Prisma + PostgreSQL
│   └── web/                  # Next (App Router) + Tailwind + shadcn/ui + Storybook
├── packages/
│   ├── api-client/           # @repo/api-client: tipos + client HTTP gerados do OpenAPI da api
│   ├── tsconfig/             # @repo/tsconfig: base, nest, next e library
│   └── vitest-config/        # @repo/vitest-config: regra de cobertura (100%) compartilhada
├── .specs/                   # design (front/index.figcraft, previews/) e, depois, specs por feature + STATE.md
├── prd.md                    # produto: requisitos, modelo de dados e arquitetura do Animal Helper
├── .github/workflows/ci.yml  # CI
├── docker-compose.yml        # stack de desenvolvimento
├── turbo.json                # tarefas e dependências entre elas
├── package.json              # workspaces + scripts da raiz
├── package-lock.json         # ÚNICO lockfile
├── .npmrc                    # engine-strict, save-exact
├── .oxlintrc.json            # regras de lint base (os apps estendem)
├── .prettierrc
└── .env.example              # só infraestrutura do Compose
```

---

## 3. Regras do monorepo

1. **Um app não importa de outro app.** O que precisa ser compartilhado vira um pacote em `packages/`.
2. **Um pacote só existe se for usado por pelo menos dois apps.**
3. **O Prisma é exclusivo da `api`.** O `web` fala só com a api, que é a única dona das regras de negócio.
4. **Os pacotes não têm regra de negócio.** Só tipos, client HTTP e configuração.
5. **Os pacotes são consumidos como código-fonte** (`exports` apontando para `src`), sem build próprio. O Next e o Vitest transpilam direto.
6. **Cada app tem o próprio `.env`, validado com zod.** O `.env` da raiz é só do Compose.
7. **Um único `package-lock.json`, na raiz.** Não rode `npm install` dentro dos apps; use `--workspace`.
8. **Dependência interna usa a versão `"*"`** (o npm não suporta `workspace:`).

---

## 4. O contrato entre api e web

O **Swagger da api é a fonte da verdade**. Dele saem os tipos que o web usa:

```
apps/api (DTOs + @ApiProperty)
   │  npm run openapi:export (api)      → apps/api/openapi.json        (sem banco: modo preview do Nest)
   ▼
packages/api-client
   │  npm run generate (api-client)     → src/schema.d.ts              (openapi-typescript)
   │  createApiClient({ baseUrl })      → client tipado                (openapi-fetch)
   ▼
apps/web
   getApi().GET('/api/v1/examples', { params: { query: { page } } })   → tipado como o DTO
```

- `npm run generate` (na raiz) roda a cadeia inteira: build da api → export → tipos.
- O Turborepo faz `typecheck`, `test`, `build` etc. do web dependerem dessa geração.
- **Se um DTO mudar de forma incompatível, o typecheck/build do web quebra no CI**, antes de chegar a produção.
- `openapi.json` e `schema.d.ts` são gerados e não são versionados.

---

## 5. Comentários no código

Vale para **todo o monorepo**: api, web, pacotes e arquivos de configuração (`*.ts`, `*.tsx`, `*.mjs`, `Dockerfile`, `*.yml`, `.env.example`, `schema.prisma`, CSS).

### 5.1 Regras

| Regra                            | Detalhe                                                                                                                                                           |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Sempre em inglês**             | Comentários e JSDoc são escritos em inglês. A documentação (`*.md`) e os textos que o usuário vê (`dictionary`, mensagens de erro da api) continuam em português. |
| **Explique o porquê, não o quê** | Comente só o que o código não diz sozinho: um motivo, uma restrição, uma armadilha. Se um nome melhor resolve, renomeie em vez de comentar.                       |
| **Curto**                        | Uma linha é o padrão; três é o máximo. Explicação longa vai para o `ARCHITECTURE.md` do app, e o comentário pode só apontar para lá.                              |
| **JSDoc só quando agrega**       | Use em props e APIs públicas quando o tipo não basta (o Storybook mostra o JSDoc das props). Não repita o nome do parâmetro nem o tipo.                           |
| **Proibido**                     | Código comentado, comentário que repete o código, `TODO` sem referência (issue ou ticket) e blocos de "cabeçalho" explicando o arquivo inteiro.                   |

### 5.2 Exemplos

```ts
// ❌ Repete o código (e em português)
// Converte o model do Prisma no DTO de resposta
static toResponse(example: Example): ExampleResponseDto { ... }

// ❌ Longo demais: isso é documentação, não comentário
/**
 * Server Action: é um endpoint público (POST). Por isso valida a entrada aqui,
 * mesmo que o formulário já valide no navegador.
 * Esta base ainda não tem autenticação; quando tiver, a sessão é checada aqui.
 */

// ✅ Curto, em inglês, explica o porquê
// Public POST endpoint: always validate here. Check the session once auth exists.

// ✅ Restrição que não é óbvia
// ConfigModule validates env when AppModule is imported.
const { AppModule } = await import('./app.module.js');

// ✅ JSDoc que acrescenta informação ao tipo
/** Without /api/v1: it's already part of the paths. */
baseUrl: string;
```

Na revisão de PR, comentário fora destas regras é tratado como qualquer outro problema de código.

---

## 6. Reaproveitamento de código

Antes de escrever algo novo, procure se já existe. Quando algo for compartilhado, ele tem um lugar certo.

### 6.1 Onde fica o código compartilhado

| Escopo do reuso                               | Lugar                                              | Exemplos atuais                                                                                              |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Entre apps (api, web) e pacotes               | `packages/*`                                       | `@repo/api-client`, `@repo/tsconfig`, `@repo/vitest-config`                                                  |
| Entre módulos da api                          | `apps/api/src/common/`                             | `IBaseRepository`, `PaginationDto`, `PaginatedResponseDto`, `PrismaExceptionFilter`, `@ApiPaginatedResponse` |
| Entre features do web                         | `apps/web/src/components/ui/`, `apps/web/src/lib/` | `PaginationNav`, `Button`, `getApi()`, `parsePageParam()`                                                    |
| Dentro de um módulo/feature                   | a própria pasta do módulo/feature                  | `ExampleMapper`, `example.dictionary.ts`                                                                     |
| Entre testes (e stories) de um módulo/feature | `test-fixtures.ts` na raiz do módulo/feature       | `makeExample()` (api e web), `makeMeta()` (web)                                                              |
| Configuração de ferramentas                   | arquivo base na raiz + `extends`, ou pacote        | `.oxlintrc.json` da raiz, `@repo/tsconfig`, `@repo/vitest-config`                                            |

### 6.2 Quando extrair

| Situação                                                          | O que fazer                                                                                                                                                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A mesma lógica aparece em 2+ lugares **e muda pelo mesmo motivo** | Extraia para o lugar da tabela acima. Ex.: a regra de cobertura de 100% estava copiada em três `vitest.config.ts` e virou `@repo/vitest-config`                          |
| A semelhança é só de forma (os dois mudam por motivos diferentes) | Mantenha separado. Ex.: a validação de `.env` da api (`ConfigModule`) e a do web (`getEnv()` sob demanda) compartilham três linhas, mas se integram de jeitos diferentes |
| Uma abstração genérica para um único uso                          | Não crie. Espere o segundo ou terceiro uso real para enxergar o que é comum                                                                                              |
| Um tipo que já existe no contrato                                 | Nunca redeclare: use `Schemas['XDto']` do `@repo/api-client` no web e os tipos do Prisma na api                                                                          |
| Dados de teste repetidos entre specs ou stories                   | `make<Entidade>(overrides)` no `test-fixtures.ts` do módulo/feature                                                                                                      |

### 6.3 Regras

- **Pacotes:** só existem se forem usados por 2+ apps/pacotes, não têm regra de negócio e mantêm 100% de cobertura (ver [seção 3](#3-regras-do-monorepo)).
- **Direção das dependências:** `common/` (api) e `components/ui`/`lib/` (web) **não importam** de módulos/features. O compartilhado nunca depende do específico. No web, o lint garante isso.
- **Um módulo/feature não importa de outro.** Se dois precisam da mesma coisa, ela sobe para o lugar compartilhado. Na api, o módulo dono **exporta** o service, e o outro **importa o módulo**.
- **Configuração de ferramenta:** uma base na raiz ou num pacote, e os apps só acrescentam o que é deles.
- **Ao extrair, mova os testes junto**, e mantenha a cobertura em 100% no lugar novo.

---

## 7. Comandos (na raiz)

### 7.1 Makefile (uso do dia a dia)

| Comando                      | O que faz                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `make` / `make help`         | lista os comandos                                                                                                                                                                                                                     |
| **Setup e qualidade**        |                                                                                                                                                                                                                                       |
| `make install`               | cria os `.env` que faltam (a partir dos `.env.example`, trocando `<nome-do-projeto>` pelo `name` do `package.json`), roda `npm install`, instala o Chromium do Playwright e gera o contrato (`npm run generate`)                      |
| `make gate`                  | sobe o banco, aplica as migrations e roda `npm run check`. É exatamente o que o job "Qualidade" do CI roda. Não inclui o E2E                                                                                                          |
| `make e2e`                   | sobe a stack em segundo plano (`docker compose up -d --wait`) e roda o Playwright. É o que o job "E2E" do CI roda. A stack continua no ar depois (`make down` para parar)                                                             |
| `make smoke`                 | constrói as imagens `migrate`, `api` e `web` sem `.env`, aplica as migrations num Postgres vazio, sobe a api (demo fechada, sem SMTP) e o web, e confere `/health` e `/`. Remove tudo o que criou ([seção 9](#9-imagens-de-produção)) |
| **Ambiente local**           |                                                                                                                                                                                                                                       |
| `make dev`                   | `docker compose up --build`: database → migrations → api → web, com logs no terminal. O Ctrl+C só **para** os containers                                                                                                              |
| `make dev-railway`           | como o `make dev`, mas a api grava as fotos no bucket de `apps/api/.env.railway` ([seção 8](#8-ambiente-local)). Os testes nunca usam esse modo                                                                                       |
| `make down`                  | para e remove os containers. `make down v=1` apaga também o volume do banco                                                                                                                                                           |
| `make logs`                  | acompanha os logs da stack. `make logs s=api` mostra um serviço só                                                                                                                                                                    |
| `make storybook`             | Storybook do web em `http://localhost:6006`                                                                                                                                                                                           |
| **Banco de dados**           |                                                                                                                                                                                                                                       |
| `make migrate`               | sobe o banco (se não estiver rodando) e aplica as migrations pendentes                                                                                                                                                                |
| `make migration name=<nome>` | cria uma migration a partir das mudanças no `schema.prisma` (`prisma migrate dev`). Sem mudanças, avisa e não cria nada                                                                                                               |
| `make seeder`                | roda as migrations e depois os seeders                                                                                                                                                                                                |
| `make reset`                 | **apaga o banco local**, reaplica as migrations e roda os seeders. Pede confirmação (`make reset force=1` pula a pergunta). Só para o banco de desenvolvimento                                                                        |

Os `.env` **nunca são sobrescritos**: o `make` só cria o arquivo quando ele não existe.

> O Prisma bloqueia o `migrate reset` quando ele é executado por um agente de IA. Rodado por uma pessoa no terminal, o `make reset` funciona normalmente.

### 7.2 Scripts npm

| Comando                   | O quê                                                        |
| ------------------------- | ------------------------------------------------------------ |
| `npm install`             | instala tudo (só npm)                                        |
| `npm run generate`        | Prisma client + OpenAPI + tipos do api-client                |
| `npm run dev`             | todos os apps em modo dev                                    |
| `npm run build`           | build de todos os apps                                       |
| `npm run lint`            | lint + convenções                                            |
| `npm run typecheck`       | tipos                                                        |
| `npm test`                | testes unitários                                             |
| `npm run test:cov`        | cobertura; **falha abaixo de 100%** (a api precisa do banco) |
| `npm run test:storybook`  | stories como teste (Chromium)                                |
| `npm run build-storybook` | Storybook estático                                           |
| `npm run check`           | tudo que o CI roda, menos o E2E                              |
| `npm run format`          | Prettier                                                     |

Para um app: `npm run <script> --workspace=apps/<app>`. Para instalar uma dependência: `npm install <pacote> --workspace=apps/<app>`.

O Turborepo guarda cache por tarefa: rodar de novo sem mudanças leva segundos.

---

## 8. Ambiente local

```bash
make install
make dev
```

| Serviço      | Porta      | Perfil | O quê                                                                 |
| ------------ | ---------- | ------ | --------------------------------------------------------------------- |
| `web`        | 3000       | —      | Next em dev (`src/` montado)                                          |
| `api`        | 3333       | —      | Nest em watch (`src/` e `prisma/` montados)                           |
| `migrate`    | —          | —      | `prisma migrate deploy`, depois encerra                               |
| `database`   | 5432       | —      | Postgres                                                              |
| `minio`      | 9000, 9001 | —      | Armazenamento S3 de dev (API na 9000, console na 9001)                |
| `minio-init` | —          | —      | Cria o bucket `animal-helper-dev` e encerra                           |
| `mailpit`    | 1025, 8025 | —      | Captura os e-mails de dev (SMTP na 1025, UI em http://localhost:8025) |
| `mock-api`   | 4010       | `mock` | api fake (Prism) gerada do OpenAPI                                    |
| `storybook`  | 6006       | `docs` | Storybook do web                                                      |

A ordem de subida é: `database` (saudável) → `migrate` (concluído); `minio` (saudável) → `minio-init` (concluído); `mailpit` (saudável) → `api` (saudável) → `web` (saudável). No Compose, a api usa o MinIO e o Mailpit no lugar do bucket e do SMTP de `apps/api/.env`. As imagens do MinIO vêm da Chainguard, porque `minio/minio` saiu do Docker Hub. O `docker compose up --wait` espera a stack inteira ficar pronta.

**Variáveis:**

| Arquivo         | Conteúdo                                                                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env` (raiz)   | `POSTGRES_*`, `MINIO_*`, `MAILPIT_*`, portas (`WEB_PORT`, `API_PORT`, ...)                                                                                                                                                          |
| `apps/api/.env` | variáveis da api ([apps/api/ARCHITECTURE.md §7](apps/api/ARCHITECTURE.md#7-configuração-e-ambiente)): banco, `S3_*`, `SMTP_URL`, `INTERNAL_API_TOKEN`, `IP_HASH_SECRET`, Nominatim e `DEMO_*`; `DATABASE_URL` sempre em `localhost` |
| `apps/web/.env` | `API_URL` (sempre em `localhost`), `INTERNAL_API_TOKEN`, `PUBLIC_WEB_URL`, `TILE_URL`, `TILE_ATTRIBUTION` e `MAX_UPLOAD_MB` ([apps/web/ARCHITECTURE.md §7.5](apps/web/ARCHITECTURE.md#75-variáveis-de-ambiente))                    |

O `INTERNAL_API_TOKEN` tem o mesmo valor nos dois apps. Os `.env.example` trazem só valores falsos de desenvolvimento; os valores reais nunca entram no repositório nem na documentação (SEC-08).

No Compose, as URLs entre containers (`DATABASE_URL` → `database`, `API_URL` → `api`) são montadas automaticamente. Por isso os `.env` dos apps servem tanto para rodar no Docker quanto fora dele.

**Fotos no bucket do Railway (`make dev-railway`):** sobe a mesma stack, mas a api grava e lê as fotos de um bucket hospedado em vez do MinIO. O `docker-compose.railway.yml` troca só as `S3_*` da api, que vêm de `apps/api/.env.railway` (fora do git; modelo em `apps/api/.env.railway.example`). O banco, o Mailpit e as seeds continuam locais. Regras:

- Use um bucket **só de desenvolvimento**, nunca o de produção: o banco local não conhece os objetos do bucket de produção, e as fotos enviadas no dev ficariam órfãs lá.
- O `make dev`, o `make e2e` e o `make gate` nunca carregam esse arquivo, então os testes rodam sempre no MinIO. Rodar um deles depois do `make dev-railway` recria a api apontando de novo para o MinIO.
- As fotos enviadas no modo Railway só existem lá: de volta ao `make dev`, elas respondem 404 no `/img`, porque o MinIO não as tem.

---

## 9. Imagens de produção

As duas partem da **raiz** e usam `turbo prune` para levar só o necessário:

```bash
docker build -f apps/api/Dockerfile --target production -t api .
docker build -f apps/api/Dockerfile.migrate -t api-migrate .
docker build -f apps/web/Dockerfile --target production --build-arg MAX_UPLOAD_MB=5 -t web .
```

| Imagem  | Conteúdo                                                                                        | Usuário |
| ------- | ----------------------------------------------------------------------------------------------- | ------- |
| api     | `node_modules` de produção + `dist` (sem CLI do Prisma)                                         | `node`  |
| migrate | dependências completas + `prisma/` + `prisma.config.ts`; roda `prisma migrate deploy` e encerra | `node`  |
| web     | `.next/standalone` + estáticos                                                                  | `node`  |

As migrations de produção rodam na imagem `migrate`, que tem Dockerfile próprio (`apps/api/Dockerfile.migrate`): o Railway constrói o último estágio do Dockerfile apontado, e o `apps/api/Dockerfile` termina no `production`, sem a CLI do Prisma. A imagem lê só a `DATABASE_URL`; sem migration pendente, sai com 0 sem mudar nada, e duas execuções ao mesmo tempo esperam o lock do Prisma.

`make smoke` (`scripts/smoke.sh`) prova as três imagens antes de um deploy: constrói sem `.env`, confere que nenhuma leva `.env*`, aplica as migrations num Postgres vazio (e de novo, duas ao mesmo tempo), sobe a api em demo fechada sem SMTP e o web, e espera 200 em `/health` e `/` por até 60 s. Se algo falha, mostra o log do container e sai com erro; os containers e a rede são removidos nos dois casos.

- **As duas imagens são construídas sem `.env`.** O export do OpenAPI preenche valores de marcação só durante o export (T167). No web, o `npm run check` (e, portanto, o `make gate`) roda o `build:no-env`: `env -i … __NEXT_PROCESSED_ENV=true next build`. A `__NEXT_PROCESSED_ENV` é uma variável interna do Next que impede o `next build` de ler os `.env` do disco. **Ao atualizar o Next, confira que ela continua com o mesmo efeito** (apague o `apps/web/.env` de uma cópia e rode o `build:no-env`), porque uma mudança interna faria a checagem passar sem provar nada.
- **`MAX_UPLOAD_MB` no build do web.** O `next.config.ts` lê a variável no build para o `serverActions.bodySizeLimit` (MB + 1). O estágio `builder` do `apps/web/Dockerfile` declara `ARG MAX_UPLOAD_MB`, e o `turbo.json` a lista em `build.env` (o Turborepo, em modo estrito, não repassa variáveis não declaradas). Sem o arg, o limite fica em 11 MB.
- **sharp na imagem da api:** o estágio `prod-deps` usa `--omit=optional`, que também tira os binários nativos do sharp. O Dockerfile instala de volta só os da plataforma da imagem, `@img/sharp-linuxmusl-<arch>` e `@img/sharp-libvips-linuxmusl-<arch>`. Se a imagem base deixar de ser Alpine (musl), esses pacotes precisam mudar.

---

## 10. CI (`.github/workflows/ci.yml`)

**O CI roda os mesmos comandos `make` usados localmente.** Se `make gate` e `make e2e` passam na sua máquina, passam no CI.

| Job       | Passos                                              |
| --------- | --------------------------------------------------- |
| Qualidade | `npm ci` → Chromium do Playwright → **`make gate`** |
| E2E       | `npm ci` → Chromium do Playwright → **`make e2e`**  |
| Imagens   | build das imagens de produção da api e do web       |

- O banco do CI é o mesmo do ambiente local: o `make` sobe o Postgres pelo Docker Compose.
- Os `.env` são criados pelo `make` a partir dos `.env.example`.
- Os jobs rodam o projeto inteiro em todo PR (sem filtro de pacotes afetados), exatamente como o `make gate` local.

**Bloqueiam o merge:** erro de lint ou de convenção, erro de tipo, **cobertura abaixo de 100%**, falha de build, story quebrada ou com violação de acessibilidade, e falha no E2E.

Os artefatos publicados são a cobertura, o Storybook estático e o relatório do Playwright.

O CI não faz deploy: o Railway constrói a partir do GitHub ([seção 12.5](#125-deploy-no-railway)).

---

## 11. Dependências e segurança

- O `npm audit` acusa vulnerabilidades em dependências **das CLIs** do Prisma (`mysql2`, `deepmerge-ts`) e do shadcn (`braces`, `fast-glob`).
- Nenhuma delas vai para as imagens de produção: a CLI do Prisma é removida da imagem da api, e o shadcn é só devDependency.
- As correções sugeridas pelo `npm audit fix --force` são **downgrades de versão major** e não devem ser aplicadas. Acompanhe as versões novas do Prisma e do shadcn.

---

## 12. Operação da demo

O MVP roda como demonstração pública (`DEMO_MODE=true`): os dados de cada ONG são apagados depois de `DEMO_RETENTION_DAYS` dias, e as cotas `DEMO_*` limitam ONGs, animais, fotos e armazenamento.

Em produção, a demo roda **fechada** (`DEMO_LOCKED=true`, AD-008): uma conta de ONG pré-cadastrada e compartilhada, com e-mail e senha exibidos no `/entrar`. A api responde 403 "Indisponível na demo." ao cadastro de ONG, à recuperação de senha, à troca de senha, à edição do perfil e à exclusão da conta; as telas continuam visíveis, com o envio desativado. O visitante cadastra até `DEMO_MAX_ANIMALS_PER_NGO` animais na conta demo, o `/localizacao` leva direto ao `/mapa`, e o mapa abre na cidade da conta demo, enquadrando as ONGs de exemplo. Nenhum e-mail sai (o plano Hobby do Railway bloqueia SMTP), então `SMTP_URL` e `MAIL_FROM` são opcionais nesse modo. O web não tem variável própria: lê `locked`, as credenciais e o ponto inicial do mapa do `GET /demo`. Com `DEMO_LOCKED=false` (padrão, usado no dev e nos testes), tudo funciona como no MVP.

### 12.1 Serviços

| Serviço           | Onde roda                         | Observações                                                                                                          |
| ----------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| web               | serviço público                   | único ponto exposto à internet. Fala com a api pela rede privada                                                     |
| api               | **só na rede privada**            | toda rota (menos `/health`) exige o header `X-Internal-Token` igual ao `INTERNAL_API_TOKEN` (AD-002)                 |
| limpeza (cron)    | serviço cron, **uma vez por dia** | mesma imagem da api, comando `node dist/app/cleanup.cli.js` (AD-006). Sem agendador dentro da api                    |
| migrate           | serviço que roda e encerra        | imagem `apps/api/Dockerfile.migrate` (`prisma migrate deploy`). Roda antes do deploy da api quando há migration nova |
| Postgres e bucket | serviços gerenciados              | o bucket é S3 compatível e só a api tem as credenciais (AD-001)                                                      |

No ambiente local, o Compose troca o bucket pelo MinIO e o SMTP pelo Mailpit ([seção 8](#8-ambiente-local)).

### 12.2 Limpeza (`npm run cleanup`)

Cada execução apaga tudo o que já venceu, então uma execução que falhou é recuperada na seguinte (AD-006):

- ONGs vencidas, com horários, animais, sessões e os objetos do prefixo `ngos/{id}/` no bucket (DEMO-04, DEMO-05);
- fotos enviadas e nunca confirmadas há mais de 24 h (DEMO-15);
- linhas de limite de taxa com mais de 1 h, sessões vencidas e links de recuperação de senha vencidos;
- com `DEMO_LOCKED=true`, **todos os animais da conta demo** e as fotos deles (`ngos/{id}/images/`), para cada dia começar do zero (AD-008). A ONG demo, o logo dela e as ONGs de exemplo ficam. Se o bucket falha, os animais ficam para a próxima execução.

O comando sai com código 0 quando tudo deu certo e 1 quando algo falhou, para o cron do Railway registrar a falha.

No dev, a limpeza roda à mão: `npm run build --workspace=apps/api` e depois `npm run cleanup --workspace=apps/api`. Ela lê o `apps/api/.env`: antes de rodar, confira que `DATABASE_URL` e `S3_*` apontam para o banco local e para o MinIO, e não para um bucket real. Não existe alvo `make cleanup`.

### 12.3 Segurança da operação

- **Rede privada + `INTERNAL_API_TOKEN` (AD-002).** O web manda o token em toda chamada e repassa o IP do visitante em `X-Client-IP`. O IP serve só ao limite de taxa: nunca vai para log nem para o banco em claro (SEC-01; a cota de cadastros por IP usa um hash com `IP_HASH_SECRET`). A api não pode ser exposta a terceiros sem rever esta regra.
- **Logs sem query string nem dados sensíveis (SEC-02, SEC-08).** A api registra método, URL sem query, status e tempo. No web, o servidor de dev ignora `/map/ngos` no log de requisições (`logging.incomingRequests` do `next.config.ts`); o build de produção não registra requisições. O E2E `apps/web/e2e/privacy.spec.ts` confere nos `docker compose logs` que nem a `bbox` nem o IP do visitante aparecem.
- **Rotação de chaves pendente (PRD §14).** As chaves do bucket do Railway que estão no `apps/api/.env` local foram expostas e não podem ser usadas em produção: a produção usa um bucket próprio, com chaves geradas para ele ([12.5](#125-deploy-no-railway)). Gere também valores novos para `INTERNAL_API_TOKEN` e `IP_HASH_SECRET` (`openssl rand -base64 48`, diferentes dos `.env.example`) e grave-os só nas variáveis do Railway. Nenhuma rotação foi feita até aqui.
- **A senha da conta demo não é segredo.** Ela aparece no `/entrar` e sai no `GET /demo`, que só o web alcança. Mesmo assim fica fora do repositório (`DEMO_ACCOUNT_PASSWORD`), para poder ser trocada sem deploy de código.

### 12.4 Decisões do MVP

Registradas em `.specs/STATE.md` (fora do repositório) e resumidas aqui:

| Id     | Decisão                                                                                                                                                                                                                               |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AD-001 | As fotos vão do navegador para uma Server Action do web, que repassa à api. A api converte com sharp, grava só variantes WebP (sem original e sem EXIF) e o web as serve em `/img/[...key]`, com cache imutável. Sem URL pré-assinada |
| AD-002 | A api roda só na rede privada, exige `X-Internal-Token` em toda rota (menos `/health`) e usa o `X-Client-IP` enviado pelo web em todos os limites de taxa                                                                             |
| AD-003 | Sessão da ONG com token opaco de 32 bytes, guardado na api só como SHA-256, no cookie `ah_session` (`HttpOnly`, `Secure`, `SameSite=Lax`) e enviado à api como `Bearer`. Expira com 7 dias sem uso; o cookie dura 1 dia (AUTH-02)     |
| AD-004 | Toda cota da demo é checada na transação que cria o registro, depois de um `pg_advisory_xact_lock` do escopo da cota                                                                                                                  |
| AD-005 | Localização da ONG em duas colunas `double precision` (`lat`, `lng`) com índice B-tree; busca por bbox em SQL comum, sem PostGIS                                                                                                      |
| AD-006 | A limpeza da demo é um serviço cron do Railway que roda `node dist/app/cleanup.cli.js` uma vez por dia; a api não tem agendador interno                                                                                               |
| AD-008 | A demo pública roda fechada (`DEMO_LOCKED=true`): conta compartilhada, sem cadastro, sem recuperação de senha e sem e-mail; a limpeza diária zera os animais da conta demo                                                            |

### 12.5 Deploy no Railway

Referências: [monorepo](https://docs.railway.com/deployments/monorepo), [Dockerfiles](https://docs.railway.com/guides/dockerfiles), [rede privada](https://docs.railway.com/guides/private-networking), [cron](https://docs.railway.com/reference/cron-jobs).

Todos os serviços que constroem imagem têm **Root Directory vazio** (os Dockerfiles partem da raiz, com `turbo prune`) e escolhem o Dockerfile por `RAILWAY_DOCKERFILE_PATH`.

| Serviço   | `RAILWAY_DOCKERFILE_PATH`     | Domínio público | Outras configurações                                                                                |
| --------- | ----------------------------- | --------------- | --------------------------------------------------------------------------------------------------- |
| `web`     | `apps/web/Dockerfile`         | sim (HTTPS)     | `MAX_UPLOAD_MB` também como variável de build                                                       |
| `api`     | `apps/api/Dockerfile`         | **não**         | `PORT=3333`; healthcheck em `/health`                                                               |
| `migrate` | `apps/api/Dockerfile.migrate` | não             | sem restart automático: roda, aplica e encerra                                                      |
| `cleanup` | `apps/api/Dockerfile`         | não             | start command `node dist/app/cleanup.cli.js`; Cron Schedule em UTC, `0 6 * * *` (03:00 em Brasília) |
| Postgres  | gerenciado                    | não             | a `DATABASE_URL` **privada** vai para `api`, `migrate` e `cleanup`                                  |
| Bucket    | gerenciado                    | não             | bucket **só para produção**, com chaves próprias; as credenciais vão para `api` e `cleanup`         |

**Watch paths** (um commit num app não reconstrói o outro):

- `api`, `migrate` e `cleanup`: `apps/api/**`, `packages/**`, `package-lock.json`, `turbo.json`;
- `web`: `apps/web/**`, `packages/**`, `package-lock.json`, `turbo.json` e `apps/api/src/**` (o build do web exporta o OpenAPI da api).

**Variáveis** (só os nomes; os valores ficam no Railway):

| Serviço           | Variáveis                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api` e `cleanup` | `NODE_ENV=production`, `PORT`, `APP_NAME`, `LOG_LEVEL`, `CORS_ORIGIN`, `DATABASE_URL`, `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, `WEB_URL`, `INTERNAL_API_TOKEN`, `IP_HASH_SECRET`, `NOMINATIM_URL`, `NOMINATIM_USER_AGENT`, `DEMO_MODE`, `DEMO_*` das cotas, `DEMO_LOCKED=true`, `DEMO_ACCOUNT_EMAIL`, `DEMO_ACCOUNT_PASSWORD` |
| `migrate`         | `DATABASE_URL`                                                                                                                                                                                                                                                                                                                                                                                    |
| `web`             | `API_URL=http://<serviço-api>.railway.internal:3333`, `INTERNAL_API_TOKEN` (o mesmo da api), `PUBLIC_WEB_URL`, `TILE_URL`, `TILE_ATTRIBUTION`, `MAX_UPLOAD_MB` (igual a `DEMO_MAX_UPLOAD_MB`, também como variável de build)                                                                                                                                                                      |

**Primeiro deploy**, nesta ordem: Postgres e bucket → `migrate` (encerra com 0) → `api` → `web` → `cleanup`. Depois, o seed, uma vez ([12.6](#126-operação)).

### 12.6 Operação

- **Migration nova.** O Railway não ordena serviços entre si. Quando um commit traz migration, rode o `migrate` e espere o código 0 **antes** de promover o deploy da api. Se a api subir sem a migration, o healthcheck em `/health` falha e o Railway mantém o deploy anterior.
- **Seed de produção (uma vez).** Da máquina do mantenedor, com `DATABASE_URL` (URL pública do Postgres, só durante o seed), `SEED_S3_*` do bucket de produção, `DEMO_ACCOUNT_EMAIL` e `DEMO_ACCOUNT_PASSWORD`: `npm run prisma:seed --workspace=apps/api`. Cria as 5 ONGs de exemplo e a conta demo; rodar de novo atualiza as mesmas linhas, sem duplicar.
- **Trocar a senha da conta demo.** Mude `DEMO_ACCOUNT_PASSWORD` na api e no `cleanup` e rode o seed de novo com o valor novo: o seed grava o hash novo. O `/entrar` mostra o valor novo assim que a api reinicia.
- **Rotação do `INTERNAL_API_TOKEN`.** Troque na api e no web **juntos** e redeploy dos dois; entre um e outro, o web recebe 401 da api.
- **Rotação das chaves do bucket.** Gere chaves novas no Railway, troque `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY` na api e no `cleanup`, redeploy, e só então revogue as antigas.
- **Rollback de aplicação.** O Railway guarda os deploys anteriores: volte para o último saudável.
- **Rollback de banco.** As migrations do Prisma só vão para frente. Uma migration destrutiva exige plano próprio: backup antes e migration de reversão escrita à mão. Confira o backup que o plano do Railway oferece.
- **Memória da api.** A conversão de uma foto HEIC de 12 MP chega a ~190 MB de pico: dimensione a api com folga.
