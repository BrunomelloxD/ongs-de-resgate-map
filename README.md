# Animal Helper

Mapa de ONGs que resgatam e cuidam de animais: o visitante encontra ONGs perto de casa, conhece os animais e fala com a ONG pelo WhatsApp; a ONG mantém o perfil e os animais disponíveis.

> ⚠️ **Em desenvolvimento, ainda não está pronto para uso.**
> As telas do MVP estão implementadas na api e no web. Falta: a validação final contra o spec, as metas de performance em celular (LCP da página da ONG e tempo até o mapa ficar interativo), o alvo de toque dos pinos do mapa, a rotação das chaves expostas do bucket e o deploy da demo no Railway. Pode haver mudanças que quebram compatibilidade. Não use em produção.
>
> Produto em [prd.md](prd.md).

| Caminho                  | O quê                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `apps/api`               | API NestJS ([README](apps/api/README.md), [ARCHITECTURE](apps/api/ARCHITECTURE.md)) |
| `apps/web`               | Front Next ([README](apps/web/README.md), [ARCHITECTURE](apps/web/ARCHITECTURE.md)) |
| `packages/api-client`    | client tipado da api, gerado do OpenAPI                                             |
| `packages/tsconfig`      | configurações base do TypeScript                                                    |
| `packages/vitest-config` | regra de cobertura (100%) compartilhada pelos testes                                |

Visão geral, regras e infraestrutura: [ARCHITECTURE.md](ARCHITECTURE.md).

## Primeiros passos

Requisitos: Node, npm, Docker e `make`.

```bash
make install    # dependências, arquivos .env, navegador de testes e contrato da api
make dev        # sobe database, migrations, api e web
make seeder     # (opcional, em outro terminal) dados de exemplo
```

| URL                                 | O quê                         |
| ----------------------------------- | ----------------------------- |
| `http://localhost:3000`             | web                           |
| `http://localhost:3333/api/v1/...`  | api                           |
| `http://localhost:3333/swagger-api` | Swagger (só fora de produção) |
| `http://localhost:3333/health`      | health check da api           |

O `make install` cria os `.env` que faltam a partir dos `.env.example` (nunca sobrescreve um existente).

## Comandos

| Comando                      | O quê                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `make`                       | lista os comandos                                                                |
| `make install`               | instala as dependências (api, web e pacotes) e prepara o ambiente                |
| `make dev`                   | sobe o projeto localmente no Docker                                              |
| `make dev-railway`           | como o `make dev`, com as fotos no bucket do Railway (`apps/api/.env.railway`)   |
| `make down`                  | para e remove os containers (`v=1` apaga também o banco)                         |
| `make logs`                  | logs da stack (`s=api` para um serviço)                                          |
| `make migrate`               | aplica as migrations pendentes                                                   |
| `make migration name=<nome>` | cria uma migration a partir do schema                                            |
| `make seeder`                | popula o banco com dados de exemplo (idempotente)                                |
| `make reset`                 | apaga o banco local, reaplica as migrations e roda os seeders (pede confirmação) |
| `make gate`                  | tudo que o CI roda: formatação, lint, tipos, testes (100%), build e Storybook    |
| `make e2e`                   | testes E2E (Playwright) contra a stack                                           |
| `make smoke`                 | constrói as imagens de produção sem `.env` e confere que sobem                   |
| `make storybook`             | Storybook do web                                                                 |

Lista completa em [ARCHITECTURE.md](ARCHITECTURE.md#7-comandos-na-raiz).

## Demonstração

O MVP roda em modo demonstração: os dados de cada ONG são apagados depois de alguns dias (`DEMO_RETENTION_DAYS`), e há cotas de ONGs, animais e fotos. A limpeza roda uma vez por dia como serviço cron (`node dist/app/cleanup.cli.js`); no dev, rode à mão com `npm run build --workspace=apps/api && npm run cleanup --workspace=apps/api`, com o `apps/api/.env` apontando para o banco local e o MinIO.

Em produção, a demo é **fechada** (`DEMO_LOCKED=true`): uma conta de ONG compartilhada, com as credenciais exibidas na tela de login, sem cadastro de ONG nem recuperação de senha. O visitante cadastra até 10 animais, e a limpeza diária zera a conta.

A api fica só na rede privada e aceita apenas chamadas do web, com o `INTERNAL_API_TOKEN`. Deploy no Railway, variáveis, serviços, limpeza e operação: [ARCHITECTURE.md §12](ARCHITECTURE.md#12-operação-da-demo).
