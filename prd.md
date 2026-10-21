# PRD — Animal Helper

> Documento de produto para estudo e continuidade. Versão 0.2 · 19/10/2026 · Status: rascunho para discussão.
> Design: `.specs/front/index.figcraft` (FigCraft) · Prévias: `.specs/front/previews/`
> **Natureza: demonstração pública** hospedada no Railway (plano Hobby), com limites de uso e **dados apagados automaticamente** (ver §6.5 e §11.8).
> Código: monorepo nesta pasta (`apps/api`, `apps/web`, `packages/*`), derivado da base [web-hook-nestjs-observe](https://github.com/BrunomelloxD/web-hook-nestjs-observe). **Base pronta, nenhuma feature implementada** (ver §11).

---

## 1. Visão, problema e objetivo

### Visão

Ser o jeito mais simples de encontrar, perto de casa, uma ONG que resgata animais — e chegar até ela com um animal específico em mente.

### Problema

- **Quem quer adotar** não sabe quais ONGs existem no bairro, quando estão abertas nem quais animais estão disponíveis. A informação está espalhada em perfis de Instagram, grupos de WhatsApp e feiras de adoção.
- **ONGs pequenas** (muitas vezes 2–5 voluntários) não têm site nem equipe para manter um. Elas já atendem pelo WhatsApp e precisam de algo que dê visibilidade sem criar mais um canal para administrar.
- O resultado: animais ficam mais tempo esperando e quem quer adotar desiste ou compra.

### Objetivo do MVP

Ligar o visitante à ONG certa em poucos toques:
**encontrar a ONG no mapa → conhecer os animais → falar com a ONG pelo WhatsApp**, com uma mensagem pronta que já cita o animal.

### Métricas de sucesso (propostas)

| Métrica                                                    | Como medir                                                            | Meta inicial (a validar)                     |
| ---------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| Cliques em “Quero adotar” / “Falar no WhatsApp” por visita | Evento sem dados pessoais                                             | ≥ 8% das sessões que abrem uma página de ONG |
| ONGs ativas                                                | ONG com ≥ 1 animal disponível e perfil atualizado nos últimos 60 dias | 30 ONGs na cidade piloto em 3 meses          |
| Tempo até o primeiro animal cadastrado                     | Cadastro da ONG → 1º animal                                           | Mediana < 24 h                               |
| Animais com disponibilidade atualizada                     | % de animais editados nos últimos 30 dias                             | ≥ 70%                                        |

---

## 2. Personas

### Visitante que quer adotar — “Júlia, 29”

- Mora em apartamento na Vila Mariana, trabalha em horário comercial, usa o celular para tudo.
- Quer um cão de porte médio, adulto, e prefere adotar de alguém perto para conseguir visitar.
- **Não quer criar conta.** Desconfia de sites que pedem localização sem explicar por quê.
- Sucesso para ela: ver em 1 minuto quem está perto, quem está aberto agora e mandar mensagem sobre um animal específico.

### Voluntário/gestor da ONG — “Marcos, 46”

- Coordena a Patas do Bairro com 4 voluntários; atende interessados pelo WhatsApp da ONG.
- Usa o celular no abrigo, entre uma tarefa e outra; desktop só à noite.
- Precisa: cadastrar um animal em poucos minutos, com fotos tiradas na hora, e marcar como indisponível quando a adoção está em andamento — sem apagar o animal.
- Medo: receber contato sobre animal que já foi adotado; dar trabalho extra para a equipe.

---

## 3. Escopo do MVP

### Dentro do escopo

- Área pública sem login: boas-vindas, pré-permissão de localização, mapa de ONGs (com lista), página da ONG, detalhe do animal, contato via WhatsApp.
- Busca manual por cidade/CEP quando a localização é negada ou falha.
- Área da ONG com login: cadastro em 5 etapas, login, recuperação de senha, painel de animais, cadastrar/editar/excluir animal, editar perfil.
- Toggle de disponibilidade do animal direto na lista.
- Responsivo: mobile-first (390px) e desktop (1440px).
- **Modo demonstração:** cotas de uso, aviso claro ao usuário e exclusão automática das ONGs, animais e imagens após o período de retenção (§6.5, RF-40 a RF-44).

### Fora do escopo (MVP)

- Conta para visitante, favoritos, alertas de novos animais.
- Formulário de adoção, agendamento de visita, contratos ou acompanhamento pós-adoção.
- Chat interno (o contato é sempre pelo WhatsApp da ONG).
- Doações/pagamentos, voluntariado, lar temporário.
- Moderação/aprovação manual de ONGs e denúncias (ver questões em aberto).
- Vários usuários por ONG, papéis e permissões.
- App nativo; notificações push.
- Multi-idioma (somente pt-BR).
- Operação como produto real: dados permanentes, SLA, suporte, backups de longo prazo. O MVP é **uma demo**.

---

## 4. Jornadas principais

### 4.1 Visitante (protótipo: fluxo “Visitante · mobile/desktop”)

1. **Boas-vindas** → entende a proposta e toca em “Encontrar ONGs perto de mim”.
2. **Pré-permissão** → lê por que a localização é pedida e toca em “Usar minha localização”; o navegador mostra o prompt nativo.
   - Negou → tela “Busque pela cidade ou CEP”.
3. **Mapa** → vê pinos das ONGs num raio de 5 km, a lista ordenada por distância (bottom sheet no celular, lateral no desktop). Toca num pino → card de prévia (foto, nome, “aberta agora”, horário, distância).
   - Estados: carregando · nenhuma ONG na região · erro de localização.
4. **Página da ONG** → descrição, WhatsApp, endereço com mini mapa e “Como chegar”, horário, grade de animais com filtros.
5. **Detalhe do animal** → galeria, dados, descrição, “Quero adotar o Caramelo”.
6. **WhatsApp** abre com: “Olá! Vi o Caramelo no Animal Helper e quero saber como adotar.”
   - Animal indisponível: botão desabilitado + explicação + link para outros animais da ONG.

### 4.2 ONG (protótipo: fluxo “ONG · mobile/desktop”)

1. **Cadastro** (5 etapas): Sobre a ONG → Contato e acesso → Endereço (confirma o pino) → Horário → Revisão → conta criada.
2. **Primeiro acesso** ao painel: estado vazio com chamada para cadastrar o primeiro animal e checklist.
3. **Cadastrar animal**: fotos (reordenar, escolher capa), dados, disponibilidade → salvar → aparece no mapa e na página.
4. **Rotina**: entrar → painel → liga/desliga “Disponível” na lista; edita animal; exclui com confirmação.
5. **Editar perfil**: imagem, dados, contato, endereço (com pino), horários.
6. **Esqueci a senha**: informa o e-mail → recebe link válido por 1 hora.

---

## 5. Requisitos funcionais

Prioridade: **M** = obrigatório no MVP · **D** = desejável.

### 5.1 Área pública

| ID    | Requisito                                                                                                                                                                                         | Tela                             | Pri. |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ---- |
| RF-01 | Exibir a proposta do produto, o “como funciona” em 3 passos, o CTA “Encontrar ONGs perto de mim” e o acesso discreto “Sou uma ONG”.                                                               | 01                               | M    |
| RF-02 | Mostrar uma vitrine de animais disponíveis cadastrados (sem depender da localização).                                                                                                             | 01                               | D    |
| RF-03 | Antes de pedir a localização ao navegador, exibir a tela de pré-permissão com o motivo, o que **não** é feito com o dado e a alternativa manual.                                                  | 02                               | M    |
| RF-04 | Só chamar `navigator.geolocation` após ação explícita do visitante (“Usar minha localização”).                                                                                                    | 02                               | M    |
| RF-05 | Se a permissão for negada ou indisponível, oferecer busca por cidade ou CEP com sugestões, e instrução de como reativar a permissão.                                                              | 02-negada                        | M    |
| RF-06 | Exibir mapa (Leaflet + tiles OSM) centralizado na posição do visitante (ou na cidade/CEP buscado), com pinos das ONGs num raio padrão de 5 km.                                                    | 03                               | M    |
| RF-07 | Diferenciar pino de ONG aberta agora, fechada agora, selecionada e a posição do visitante; agrupar pinos próximos (cluster).                                                                      | 03                               | M    |
| RF-08 | Ao tocar num pino, abrir card de prévia: imagem, nome, selo “aberta agora/fechada”, horário de hoje, distância e botão “Ver ONG e animais”.                                                       | 03                               | M    |
| RF-09 | Lista de ONGs ordenada por distância: bottom sheet arrastável no celular (recolhido/aberto) e coluna lateral no desktop; selecionar na lista destaca o pino e vice-versa.                         | 03, 03-lista                     | M    |
| RF-10 | Filtros do mapa: “Aberta agora”, raio (5/10/25 km), “Com cães”, “Com gatos”.                                                                                                                      | 03                               | D    |
| RF-11 | Estados do mapa: carregando (skeleton + mensagem), nenhuma ONG (sugerir ampliar raio / outra cidade) e erro de localização (tentar de novo / buscar).                                             | 03-carregando, 03-vazio, 03-erro | M    |
| RF-12 | Página da ONG: imagem, nome, status de funcionamento, descrição, botão WhatsApp, endereço com mini mapa, “Como chegar” (abre rota no app de mapas) e horário da semana com o dia atual destacado. | 04                               | M    |
| RF-13 | Grade de animais da ONG com filtros por espécie, sexo, porte e “só disponíveis” (padrão ligado). Indisponíveis aparecem com selo quando o filtro é desligado.                                     | 04                               | M    |
| RF-14 | Estado vazio quando a ONG não tem animais, com convite para falar pelo WhatsApp.                                                                                                                  | 04-sem-animais                   | M    |
| RF-15 | Detalhe do animal: galeria (capa primeiro, contador, miniaturas), nome, selo de disponibilidade, espécie, raça, sexo, porte, idade estimada, descrição e card da ONG.                             | 05                               | M    |
| RF-16 | “Quero adotar o {nome}” abre `wa.me` da ONG com mensagem pronta citando o animal e a ONG.                                                                                                         | 05                               | M    |
| RF-17 | Animal indisponível: botão desabilitado com explicação e link para outros animais da ONG.                                                                                                         | 05-indisponível                  | M    |
| RF-18 | Compartilhar página da ONG e do animal (Web Share API, com fallback “copiar link”).                                                                                                               | 04, 05                           | D    |
| RF-19 | URLs próprias e indexáveis para ONG (`/ong/{slug}`) e animal (`/ong/{slug}/animais/{id}`), com metadados para prévia em redes sociais.                                                            | 04, 05                           | D    |

### 5.2 Área da ONG

| ID    | Requisito                                                                                                                                                                            | Tela               | Pri.     |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ | -------- |
| RF-20 | Login com e-mail e senha; mensagens de erro genéricas (“e-mail ou senha incorretos”); link “Esqueci minha senha” e para cadastro.                                                    | 06                 | M        |
| RF-21 | Cadastro em 5 etapas com indicador de progresso; dados de cada etapa preservados ao voltar.                                                                                          | 07a–e              | M        |
| RF-22 | Etapa “Sobre a ONG”: CNPJ com máscara e validação de dígito verificador (e consulta externa, ver §9), razão social, descrição (até 600 caracteres, com contador) e upload de imagem. | 07a                | M        |
| RF-23 | Bloquear CNPJ inválido ou já cadastrado, com mensagem que diz como corrigir.                                                                                                         | 07a-erro           | M        |
| RF-24 | Etapa “Contato e acesso”: e-mail, WhatsApp com máscara (DDD obrigatório), senha com regras visíveis e confirmação.                                                                   | 07b                | M        |
| RF-25 | E-mail já cadastrado: erro no campo + atalhos “Entrar com este e-mail” e “Recuperar senha”.                                                                                          | 07b-erro           | M        |
| RF-26 | Etapa “Endereço”: CEP preenche rua, bairro, cidade e UF; número e complemento manuais; prévia do pino no mapa, que a ONG pode arrastar para corrigir.                                | 07c                | M        |
| RF-27 | Etapa “Horário”: por dia da semana, aberta/fechada e intervalo de horas; ação “copiar o horário de segunda para todos os dias”.                                                      | 07d                | M        |
| RF-28 | Etapa “Revisão”: resumo com “Editar” por seção e aceite dos Termos de uso e da Política de privacidade.                                                                              | 07e                | M        |
| RF-29 | Recuperar senha: solicitar link por e-mail (resposta idêntica exista ou não a conta), confirmação de envio e reenviar após 60 s. Link expira em 1 h e é de uso único.                | 08                 | M        |
| RF-30 | Painel: lista dos animais da ONG com foto, nome, espécie e dados; toggle “Disponível para adoção” direto na lista (salva na hora, com feedback).                                     | 09                 | M        |
| RF-31 | Painel: busca pelo nome e filtros (todos, cães, gatos, disponíveis, indisponíveis); botão “Cadastrar animal”.                                                                        | 09                 | M        |
| RF-32 | Painel: estado de primeiro acesso com CTA e checklist do perfil.                                                                                                                     | 09-primeiro-acesso | M        |
| RF-33 | Cadastrar/editar animal com todos os campos do modelo; upload de 1 a 8 fotos com reordenação (arrastar + alternativa por teclado/botões) e escolha da capa.                          | 10                 | M        |
| RF-34 | Excluir animal com diálogo de confirmação que sugere apenas marcar como indisponível.                                                                                                | 10-excluir         | M        |
| RF-35 | Editar perfil da ONG: mesmos dados do cadastro, exceto CNPJ (somente leitura). Alterar endereço exige reconfirmar o pino.                                                            | 11                 | M        |
| RF-36 | Alterar senha (com senha atual) a partir do perfil.                                                                                                                                  | 11                 | M        |
| RF-37 | Sair da conta; sessão expira após inatividade.                                                                                                                                       | 09–11              | M        |
| RF-38 | Avisar antes de sair de um formulário com alterações não salvas.                                                                                                                     | 07, 10, 11         | D        |
| RF-39 | Excluir a conta da ONG (e todos os dados e imagens), pedido pela própria ONG.                                                                                                        | 11                 | M (LGPD) |
| RF-40 | **Aviso de demonstração** visível em todas as páginas (faixa discreta no topo/rodapé) com link para uma página “Sobre a demo” explicando limites e exclusão automática.              | todas              | M (demo) |
| RF-41 | No cadastro (etapa Revisão), checkbox obrigatório: “Entendi que esta é uma demonstração e que a ONG, os animais e as fotos serão apagados em {N} dias.”                              | 07e                | M (demo) |
| RF-42 | No painel e no perfil, mostrar a data de exclusão (“Seus dados serão apagados em 26/10/2026 — faltam 5 dias”).                                                                       | 09, 10, 11         | M (demo) |
| RF-43 | Quando uma cota for atingida, explicar o motivo e o que fazer (ex.: “A demo atingiu o limite de ONGs. Tente de novo depois da próxima limpeza.”), sem erro genérico.                 | 07, 10             | M (demo) |
| RF-44 | Exclusão automática: ONGs e tudo que depende delas (animais, imagens no bucket, horários, sessões) são apagados ao fim do período de retenção. Dados de exemplo (seed) não expiram.  | —                  | M (demo) |

---

## 6. Requisitos não funcionais

### 6.1 Privacidade e LGPD

- **RNF-01 Geolocalização só com consentimento.** O prompt do navegador só aparece depois da pré-permissão e de um toque explícito. Negar não bloqueia o uso (busca manual).
- **RNF-02 Não armazenar a localização do visitante.** As coordenadas ficam no navegador. Para buscar ONGs, a API recebe uma **caixa do mapa (bbox) ou um ponto arredondado** (ex.: 2 casas decimais ≈ 1 km), sem identificador do visitante; não pode ser gravada em banco, logs de aplicação, logs de acesso do proxy/CDN (remover query string dos logs) nem ferramentas de analytics. A distância exibida é calculada no cliente.
- **RNF-03 Sem rastreamento do visitante.** Sem cookies de terceiros; analytics, se houver, sem cookies e sem dados de localização (ex.: contagem agregada de cliques em “Quero adotar”).
- **RNF-04 Dados da ONG.** Bases legais: execução de contrato (conta e perfil) e legítimo interesse/consentimento para a publicação. Dados públicos por escolha da ONG: nome, descrição, imagem, endereço, horário, WhatsApp. **Não públicos:** e-mail, senha, CNPJ (exibir só se a ONG optar — ver questões em aberto).
- **RNF-05 Direitos do titular.** Exportar e excluir conta e dados (RF-39); apagar imagens do armazenamento junto com o animal/conta; política de privacidade e canal do encarregado (DPO).
- **RNF-06 Segurança.** Senhas com hash forte (Argon2id ou bcrypt), HTTPS obrigatório, limite de tentativas de login e de recuperação de senha, token de recuperação de uso único, cookies de sessão `HttpOnly`/`Secure`/`SameSite`. Remover metadados EXIF (inclui GPS) das fotos enviadas.

### 6.2 Acessibilidade (WCAG 2.2 AA)

- **RNF-07** Contraste mínimo 4,5:1 para texto e 3:1 para bordas de componentes e ícones informativos (paleta já verificada — ver Design System).
- **RNF-08** Alvos de toque ≥ 44×44 px; foco visível em todos os controles (anel de 3px, `:focus-visible`).
- **RNF-09** Todo campo com rótulo visível; erros inline com ícone + texto + como corrigir; resumo de erros no topo; foco no primeiro erro ao enviar; mensagens assíncronas em `aria-live="polite"`.
- **RNF-10** Botões só com ícone e toggles sem rótulo visível têm `aria-label` (ex.: “Disponível para adoção: Caramelo”); toggle com `role="switch"`.
- **RNF-11** O mapa nunca é o único caminho: a lista de ONGs é a alternativa completa por teclado e leitor de tela. Pinos acessíveis por teclado.
- **RNF-12** Reordenar fotos tem alternativa sem arrastar (teclado e botões “mover”).
- **RNF-13** Respeitar `prefers-reduced-motion` (animações do bottom sheet e do mapa); zoom da página nunca bloqueado.
- **RNF-14** Imagens de animais com texto alternativo (gerado a partir de nome + espécie + porte, editável no futuro).

### 6.3 Performance do mapa

- **RNF-15** Carregar Leaflet e o código do mapa só na rota do mapa (code splitting).
- **RNF-16** Buscar ONGs por bbox com limite (ex.: 200 resultados) e _debounce_ ao mover o mapa; agrupar pinos com clustering (ex.: Leaflet.markercluster).
- **RNF-17** A API retorna para o mapa só o necessário (id, nome, lat/lng, status, miniatura); detalhes no clique.
- **RNF-18** Imagens servidas em WebP/AVIF em tamanhos fixos (miniatura 160px, card 600px, galeria 1200px), com `width`/`height` declarados e `loading="lazy"` abaixo da dobra.
- **RNF-19** Metas em 4G móvel: LCP < 2,5 s na boas-vindas e na página da ONG; mapa interativo < 3,5 s; INP < 200 ms.
- **RNF-20** Cache: tiles pelo navegador conforme a política do provedor; respostas de ONGs com cache curto (ex.: 60 s) na CDN, sem nunca cachear por coordenada exata do visitante.

### 6.4 Responsividade e plataforma

- **RNF-21** Mobile-first a partir de 360px; layouts de referência em 390px e 1440px. Bottom sheet no celular; coluna lateral a partir de 1024px.
- **RNF-22** Navegadores: duas últimas versões de Chrome, Safari (iOS), Firefox e Edge. Respeitar `safe-area-inset` no iOS.
- **RNF-23** Datas, horários e números via `Intl` (pt-BR); fuso horário da ONG para calcular “aberta agora”.

---

### 6.5 Custos e limites da demo (Railway Hobby)

**Por que limitar:** o plano Hobby do Railway inclui um valor mensal de uso; o que passar disso é cobrado à parte (CPU, memória, rede e armazenamento de volumes/buckets — conferir a página de preços do Railway). Numa demo aberta, qualquer pessoa pode criar ONGs e subir fotos, e o bucket e o banco cresceriam sem limite. Os limites abaixo mantêm o consumo previsível e dentro do plano. **Objetivo: custo extra zero.**

- **RNF-24 Cotas aplicadas na api** (nunca só no front), configuráveis por variável de ambiente:

| Cota                                       | Variável                      | Valor inicial proposto                            |
| ------------------------------------------ | ----------------------------- | ------------------------------------------------- |
| Modo demo ligado                           | `DEMO_MODE`                   | `true`                                            |
| Retenção de ONGs e animais                 | `DEMO_RETENTION_DAYS`         | 7 dias                                            |
| ONGs ativas ao mesmo tempo (fora as seeds) | `DEMO_MAX_NGOS`               | 30                                                |
| Cadastros de ONG por IP por dia            | `DEMO_SIGNUPS_PER_IP_PER_DAY` | 2                                                 |
| Animais por ONG                            | `DEMO_MAX_ANIMALS_PER_NGO`    | 10                                                |
| Fotos por animal                           | `DEMO_MAX_IMAGES_PER_ANIMAL`  | 3 (em vez de 8)                                   |
| Tamanho máximo do arquivo enviado          | `DEMO_MAX_UPLOAD_MB`          | 5 MB (convertido para WebP, ~200 KB por variante) |
| Armazenamento total no bucket              | `DEMO_MAX_STORAGE_MB`         | 500 MB (uploads recusados acima disso)            |

- **RNF-25 Limpeza garantida:** um job diário apaga as ONGs vencidas e, **no mesmo processo**, os objetos do bucket (por prefixo da ONG). Ele também remove objetos “órfãos” (upload iniciado e nunca confirmado há mais de 24 h). Cada execução registra quantos registros e bytes foram removidos.
- **RNF-26 Consumo baixo:** imagens só em WebP com 2 variantes (miniatura e card/galeria), sem guardar o original; serviços do Railway configurados para dormir sem tráfego quando possível; limite de uso (_usage limit_) configurado no painel do Railway como trava final.
- **RNF-27 Segredos:** credenciais (bucket, banco, e-mail) só em `.env` local (ignorado pelo git) e nas variáveis do Railway. Nunca no código, no `prd.md`, em commits, logs ou mensagens de erro. O `.env.example` traz só os nomes, com valores de exemplo.

## 7. Modelo de dados (rascunho)

Convenções: `uuid` como id, `timestamptz` em UTC, textos em UTF-8. Banco: **PostgreSQL 18 + PostGIS**, via Prisma 7 (ver §11.5). Os nomes abaixo são os do produto; no código (models, colunas, rotas) usamos inglês — ver o glossário em §11.6.

### 7.1 ONG

| Campo                     | Tipo             | Obrig.     | Validação / observação                                                                                                                                                                                                                 |
| ------------------------- | ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                        | uuid             | sim        |                                                                                                                                                                                                                                        |
| cnpj                      | char(14)         | sim, único | Sem máscara. Validar dígitos verificadores (módulo 11). **Atenção:** desde julho/2026 a Receita emite CNPJ **alfanumérico** (12 primeiros caracteres A–Z/0–9; DV numéricos calculados com valor ASCII − 48). Aceitar os dois formatos. |
| razao_social              | varchar(150)     | sim        | Usado como nome exibido no MVP (ver questão sobre “nome fantasia”).                                                                                                                                                                    |
| slug                      | varchar(160)     | sim, único | Gerado a partir do nome; usado na URL pública.                                                                                                                                                                                         |
| descricao                 | text             | sim        | 30–600 caracteres.                                                                                                                                                                                                                     |
| imagem_url                | text             | não        | JPG/PNG/WebP até 5 MB; recorte quadrado; sem EXIF.                                                                                                                                                                                     |
| email                     | citext           | sim, único | Formato válido; não público.                                                                                                                                                                                                           |
| whatsapp                  | varchar(13)      | sim        | E.164 sem “+”: `55` + DDD (2) + número (8–9). Ex.: `5511987654321`.                                                                                                                                                                    |
| senha_hash                | text             | sim        | Mínimo 8 caracteres, com letras e números.                                                                                                                                                                                             |
| cep                       | char(8)          | sim        | 8 dígitos.                                                                                                                                                                                                                             |
| logradouro                | varchar(150)     | sim        |                                                                                                                                                                                                                                        |
| numero                    | varchar(10)      | sim        | Aceita “s/n”.                                                                                                                                                                                                                          |
| complemento               | varchar(60)      | não        |                                                                                                                                                                                                                                        |
| bairro                    | varchar(80)      | sim        |                                                                                                                                                                                                                                        |
| cidade                    | varchar(80)      | sim        |                                                                                                                                                                                                                                        |
| uf                        | char(2)          | sim        | Lista das 27 UFs.                                                                                                                                                                                                                      |
| localizacao               | geography(Point) | sim        | lat/lng gerados por geocodificação e **confirmados/ajustados pela ONG** no pino.                                                                                                                                                       |
| localizacao_confirmada_em | timestamptz      | sim        |                                                                                                                                                                                                                                        |
| fuso_horario              | varchar(40)      | sim        | Padrão `America/Sao_Paulo`; derivado da UF/cidade.                                                                                                                                                                                     |
| status                    | enum             | sim        | `ativa`, `suspensa`, `excluida` (futuro: `pendente_aprovacao`).                                                                                                                                                                        |
| expires_at                | timestamptz      | sim (demo) | `criado_em + DEMO_RETENTION_DAYS`; usado pelo job de limpeza e mostrado ao usuário (RF-42). Nulo só para seeds.                                                                                                                        |
| is_seed                   | boolean          | sim        | `true` nas ONGs de exemplo, que nunca expiram (RF-44).                                                                                                                                                                                 |
| aceite_termos_em          | timestamptz      | sim        | Versão dos termos aceita em `aceite_termos_versao`.                                                                                                                                                                                    |
| criado_em / atualizado_em | timestamptz      | sim        |                                                                                                                                                                                                                                        |

### 7.2 HorarioFuncionamento

| Campo      | Tipo       | Obrig.    | Validação                                                            |
| ---------- | ---------- | --------- | -------------------------------------------------------------------- |
| id         | uuid       | sim       |                                                                      |
| ong_id     | uuid → ONG | sim       |                                                                      |
| dia_semana | smallint   | sim       | 0 = domingo … 6 = sábado; único por ONG (MVP: um intervalo por dia). |
| fechado    | boolean    | sim       | Se `true`, horários nulos.                                           |
| abre_as    | time       | se aberto |                                                                      |
| fecha_as   | time       | se aberto | `fecha_as > abre_as` (sem virar a meia-noite no MVP).                |

“Aberta agora” = horário atual no `fuso_horario` da ONG dentro de `[abre_as, fecha_as)` do dia. Feriados ficam fora do MVP.

### 7.3 Animal

| Campo                     | Tipo        | Obrig. | Validação                                                            |
| ------------------------- | ----------- | ------ | -------------------------------------------------------------------- |
| id                        | uuid        | sim    |                                                                      |
| ong_id                    | uuid → ONG  | sim    | Dono do registro.                                                    |
| nome                      | varchar(60) | sim    |                                                                      |
| especie                   | enum        | sim    | `cao`, `gato`, `outro`                                               |
| raca                      | varchar(60) | não    | Padrão sugerido “SRD (vira-lata)”.                                   |
| sexo                      | enum        | sim    | `macho`, `femea` (futuro: `nao_informado`).                          |
| porte                     | enum        | sim    | `pequeno`, `medio`, `grande`                                         |
| idade_estimada_valor      | smallint    | sim    | 0–30                                                                 |
| idade_estimada_unidade    | enum        | sim    | `meses`, `anos` (exibir “Cerca de 3 anos”).                          |
| descricao                 | text        | não    | Até 1000 caracteres.                                                 |
| disponivel                | boolean     | sim    | Padrão `true`.                                                       |
| disponivel_alterado_em    | timestamptz | sim    | Para métricas e ordenação.                                           |
| criado_em / atualizado_em | timestamptz | sim    |                                                                      |
| excluido_em               | timestamptz | não    | Exclusão lógica por 30 dias antes da remoção definitiva (a decidir). |

### 7.4 ImagemAnimal

| Campo                                   | Tipo          | Obrig. | Validação                                                                                                                                   |
| --------------------------------------- | ------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| id                                      | uuid          | sim    |                                                                                                                                             |
| animal_id                               | uuid → Animal | sim    |                                                                                                                                             |
| url_original / url_card / url_miniatura | text          | sim    | Variantes geradas no upload (WebP).                                                                                                         |
| ordem                                   | smallint      | sim    | 0..7, único por animal; `ordem = 0` é a capa.                                                                                               |
| storage_key                             | text          | sim    | Chave do objeto no bucket: `ngos/{ongId}/animals/{animalId}/{imagemId}-{variante}.webp` (o prefixo por ONG permite apagar tudo de uma vez). |
| bytes                                   | int           | sim    | Soma usada na cota `DEMO_MAX_STORAGE_MB`.                                                                                                   |
| largura / altura                        | int           | sim    | Para evitar CLS.                                                                                                                            |
| alt                                     | varchar(200)  | não    | Gerado e editável no futuro.                                                                                                                |
| criado_em                               | timestamptz   | sim    |                                                                                                                                             |

Regras: 1 a 8 imagens por animal; JPG/PNG/WebP/HEIC até 10 MB cada (convertidas); EXIF removido.

---

## 8. Regras de negócio

- **RN-01** Animal **indisponível continua visível** na página da ONG (quando o filtro “só disponíveis” está desligado) e no próprio link, com selo “Indisponível” e **sem** o botão de adoção.
- **RN-02** Uma ONG **só lê e edita os próprios** animais, imagens e perfil; toda rota da área da ONG verifica `ong_id` do token (não confiar no id vindo do cliente).
- **RN-03** Só ONGs com status `ativa` aparecem no mapa e nas buscas.
- **RN-04** CNPJ é único e não pode ser alterado depois do cadastro (troca só pelo suporte).
- **RN-05** E-mail é único por conta; recuperação de senha responde sempre da mesma forma (não revela se o e-mail existe).
- **RN-06** O pino da ONG é obrigatório e precisa ser confirmado no cadastro; mudar o endereço exige nova confirmação.
- **RN-07** A primeira imagem (`ordem = 0`) é a capa usada em cards, mapa e compartilhamento.
- **RN-08** A mensagem do WhatsApp é gerada pelo sistema: “Olá! Vi o {animal} no Animal Helper e quero saber como adotar.” (ou, na página da ONG, “Olá! Vi a {ONG} no Animal Helper.”).
- **RN-09** Raio padrão de busca: 5 km; opções de 10 e 25 km; resultados ordenados por distância e, em empate, “aberta agora” primeiro.
- **RN-10** Uma ONG sem nenhum animal disponível continua no mapa (pode ter animais chegando); a página mostra o estado vazio.
- **RN-11** Excluir animal remove do público imediatamente; as imagens são apagadas do armazenamento.
- **RN-12** Visitantes nunca fazem login nem deixam dados no sistema.
- **RN-13 (demo)** Toda ONG criada pelo cadastro expira em `DEMO_RETENTION_DAYS`; a exclusão apaga banco **e** bucket. O prazo não é renovado por edição.
- **RN-14 (demo)** Cotas são checadas na api, dentro da mesma transação que cria o registro (sem “checa e depois grava”); estouro de cota responde `409`/`429` com mensagem em português.
- **RN-15 (demo)** ONGs e animais de exemplo (`is_seed = true`) mantêm o mapa populado; não podem ser editados pelo público e não contam nas cotas.
- **RN-16 (demo)** O aviso de demonstração (RF-40) e o aceite no cadastro (RF-41) são obrigatórios enquanto `DEMO_MODE=true`.

---

## 9. Integrações e riscos

### 9.1 Leaflet + tiles OpenStreetMap

- **Uso:** Leaflet como biblioteca de mapa; tiles raster OSM.
- **Política:** os servidores `tile.openstreetmap.org` são doados e **não** servem para uso de produção com volume: exigem atribuição visível (“© OpenStreetMap contributors”), `User-Agent`/`Referer` válidos, nada de baixar tiles em massa ou pré-carregar áreas, e o acesso pode ser bloqueado sem aviso.
- **Risco:** bloqueio ou lentidão quando o tráfego crescer.
- **Mitigação:** usar desde o início um provedor de tiles baseado em OSM com plano gratuito/pago e SLA (ex.: MapTiler, Stadia Maps, Thunderforest, Carto) ou servir tiles próprios; manter a atribuição sempre visível (já está nos layouts).

### 9.2 Geocodificação do endereço da ONG

- **Uso:** transformar o endereço em lat/lng **uma vez**, no cadastro/edição; a ONG confirma ou ajusta o pino.
- **Nominatim (OSM):** gratuito, mas a política pública permite **no máximo 1 requisição por segundo**, exige `User-Agent` identificável, atribuição e cache, e **proíbe autocomplete** do lado do cliente. Precisão variável em endereços brasileiros (número da casa nem sempre existe).
- **Alternativas:** Photon (komoot) ou Nominatim auto-hospedado; serviços pagos com melhor cobertura no Brasil (Google Geocoding, Mapbox, LocationIQ, OpenCage).
- **CEP:** ViaCEP ou BrasilAPI (`/api/cep/v2/{cep}`) para preencher logradouro/bairro/cidade/UF; a v2 da BrasilAPI às vezes retorna coordenadas, mas não é garantido.
- **Busca do visitante por cidade/CEP:** CEP → BrasilAPI/ViaCEP + geocodificação no servidor (com cache); cidade → lista de municípios do IBGE com coordenadas pré-carregadas (evita chamar geocodificador a cada tecla).
- **Risco:** pino no lugar errado → visitante vai ao endereço errado. **Mitigação:** confirmação obrigatória do pino (RN-06) e “Como chegar” usando o endereço textual + coordenada.

### 9.3 Link do WhatsApp (`wa.me`)

- Formato: `https://wa.me/5511987654321?text=<mensagem codificada com encodeURIComponent>`.
- Número em formato internacional, só dígitos (sem `+`, espaços ou traços).
- **Riscos:** número digitado errado ou que não é WhatsApp. **Mitigação:** máscara + validação de DDD; botão “Testar meu link” no perfil (desejável); mensagem curta para não estourar limites de URL.
- No desktop o link abre o WhatsApp Web/desktop; em navegadores in-app pode exigir confirmação extra.

### 9.4 Validação de CNPJ

- **Local:** dígitos verificadores (módulo 11) para os formatos numérico e alfanumérico (novo modelo da Receita, vigente desde julho/2026).
- **Externa (desejável):** BrasilAPI (`/api/cnpj/v1/{cnpj}`) para conferir situação cadastral “ATIVA” e sugerir a razão social. Serviço comunitário sem SLA e com limites; alternativas: ReceitaWS (plano gratuito limitado), CNPJá, APIs pagas.
- **Risco:** API fora do ar travando o cadastro. **Mitigação:** a validação local é bloqueante; a externa é assíncrona e não bloqueia (marca para revisão).
- **Observação:** muitas ONGs atuam sem CNPJ (coletivos, protetores independentes). Exigir CNPJ reduz fraude, mas exclui parte do público — ver questões em aberto.

### 9.5 Outros

- **Envio de e-mail** (recuperação de senha): provedor transacional (ex.: SES, Postmark, Resend) com SPF/DKIM.
- **Armazenamento de imagens:** bucket compatível com S3 + CDN; processamento de variantes no upload.

---

### 9.6 Railway (hospedagem da demo)

- **Serviços previstos:** `api` (Nest), `web` (Next), PostgreSQL com PostGIS (template do Railway ou imagem `postgis/postgis`), **Storage Bucket** (S3-compatível, já criado) e o job de limpeza (cron do Railway ou agendamento na api — ver D-09).
- **Bucket:** endpoint S3 do Railway, região `auto`. Credenciais e nome do bucket ficam **só** em `apps/api/.env` (local) e nas variáveis do serviço `api` no Railway (ver §11.8). Os buckets do Railway são privados: as imagens são servidas por **URL pré-assinada de leitura** com expiração curta, ou por um Route Handler do web com cache (a validar no spike de storage).
- **Riscos:** estourar o valor do plano (mitigado pelas cotas do §6.5 e pelo _usage limit_ do Railway); serviço dormindo causa a primeira requisição lenta (aceitável numa demo); credenciais vazadas (rotacionar, ver §14).

## 10. Telas e prévias

Arquivo de design: `.specs/front/index.figcraft` — páginas **Design System**, **Área pública** e **Área da ONG** (frames mobile 390px e desktop 1440px, componentes/instâncias, auto layout e fluxos de protótipo).

| #   | Tela / estado                          | Mobile                                                                   | Desktop                                                                   |
| --- | -------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 00  | Design System                          | —                                                                        | `.specs/front/previews/00-design-system.png`                              |
| 01  | Boas-vindas                            | `.specs/front/previews/01-boas-vindas-mobile.png`                        | `.specs/front/previews/01-boas-vindas-desktop.png`                        |
| 02  | Permissão de localização               | `.specs/front/previews/02-permissao-de-localizacao-mobile.png`           | `.specs/front/previews/02-permissao-de-localizacao-desktop.png`           |
| 02  | Permissão negada (busca manual)        | `.specs/front/previews/02-permissao-negada-mobile.png`                   | `.specs/front/previews/02-permissao-negada-desktop.png`                   |
| 03  | Mapa de ONGs (prévia do pino)          | `.specs/front/previews/03-mapa-de-ongs-mobile.png`                       | `.specs/front/previews/03-mapa-de-ongs-desktop.png`                       |
| 03  | Mapa · lista aberta (bottom sheet)     | `.specs/front/previews/03-mapa-lista-aberta-mobile.png`                  | (lista lateral já no 03 desktop)                                          |
| 03  | Mapa · carregando                      | `.specs/front/previews/03-mapa-carregando-mobile.png`                    | `.specs/front/previews/03-mapa-carregando-desktop.png`                    |
| 03  | Mapa · nenhuma ONG                     | `.specs/front/previews/03-mapa-nenhuma-ong-mobile.png`                   | `.specs/front/previews/03-mapa-nenhuma-ong-desktop.png`                   |
| 03  | Mapa · erro de localização             | `.specs/front/previews/03-mapa-erro-de-localizacao-mobile.png`           | `.specs/front/previews/03-mapa-erro-de-localizacao-desktop.png`           |
| 04  | Página da ONG                          | `.specs/front/previews/04-pagina-da-ong-mobile.png`                      | `.specs/front/previews/04-pagina-da-ong-desktop.png`                      |
| 04  | Página da ONG · sem animais            | `.specs/front/previews/04-pagina-da-ong-sem-animais-mobile.png`          | `.specs/front/previews/04-pagina-da-ong-sem-animais-desktop.png`          |
| 05  | Detalhe do animal                      | `.specs/front/previews/05-detalhe-do-animal-mobile.png`                  | `.specs/front/previews/05-detalhe-do-animal-desktop.png`                  |
| 05  | Detalhe do animal · indisponível       | `.specs/front/previews/05-detalhe-do-animal-indisponivel-mobile.png`     | `.specs/front/previews/05-detalhe-do-animal-indisponivel-desktop.png`     |
| 06  | Login da ONG                           | `.specs/front/previews/06-login-da-ong-mobile.png`                       | `.specs/front/previews/06-login-da-ong-desktop.png`                       |
| 07a | Cadastro · Sobre a ONG                 | `.specs/front/previews/07a-cadastro-sobre-a-ong-mobile.png`              | `.specs/front/previews/07a-cadastro-sobre-a-ong-desktop.png`              |
| 07a | Cadastro · Sobre a ONG · CNPJ inválido | `.specs/front/previews/07a-cadastro-sobre-a-ong-erro-mobile.png`         | `.specs/front/previews/07a-cadastro-sobre-a-ong-erro-desktop.png`         |
| 07b | Cadastro · Contato e acesso            | `.specs/front/previews/07b-cadastro-contato-e-acesso-mobile.png`         | `.specs/front/previews/07b-cadastro-contato-e-acesso-desktop.png`         |
| 07b | Cadastro · e-mail já cadastrado        | `.specs/front/previews/07b-cadastro-contato-e-acesso-erro-mobile.png`    | `.specs/front/previews/07b-cadastro-contato-e-acesso-erro-desktop.png`    |
| 07c | Cadastro · Endereço (pino)             | `.specs/front/previews/07c-cadastro-endereco-mobile.png`                 | `.specs/front/previews/07c-cadastro-endereco-desktop.png`                 |
| 07d | Cadastro · Horário                     | `.specs/front/previews/07d-cadastro-horario-de-funcionamento-mobile.png` | `.specs/front/previews/07d-cadastro-horario-de-funcionamento-desktop.png` |
| 07e | Cadastro · Revisão                     | `.specs/front/previews/07e-cadastro-revisao-mobile.png`                  | `.specs/front/previews/07e-cadastro-revisao-desktop.png`                  |
| 08  | Recuperar senha                        | `.specs/front/previews/08-recuperar-senha-mobile.png`                    | `.specs/front/previews/08-recuperar-senha-desktop.png`                    |
| 08  | Recuperar senha · e-mail enviado       | `.specs/front/previews/08-recuperar-senha-e-mail-enviado-mobile.png`     | `.specs/front/previews/08-recuperar-senha-e-mail-enviado-desktop.png`     |
| 09  | Painel da ONG                          | `.specs/front/previews/09-painel-da-ong-mobile.png`                      | `.specs/front/previews/09-painel-da-ong-desktop.png`                      |
| 09  | Painel · primeiro acesso               | `.specs/front/previews/09-painel-da-ong-primeiro-acesso-mobile.png`      | `.specs/front/previews/09-painel-da-ong-primeiro-acesso-desktop.png`      |
| 10  | Cadastrar animal                       | `.specs/front/previews/10-cadastrar-animal-mobile.png`                   | `.specs/front/previews/10-cadastrar-animal-desktop.png`                   |
| 10  | Editar animal                          | `.specs/front/previews/10-editar-animal-mobile.png`                      | `.specs/front/previews/10-editar-animal-desktop.png`                      |
| 10  | Excluir animal · confirmação           | `.specs/front/previews/10-excluir-animal-confirmacao-mobile.png`         | `.specs/front/previews/10-excluir-animal-confirmacao-desktop.png`         |
| 11  | Editar perfil da ONG                   | `.specs/front/previews/11-editar-perfil-da-ong-mobile.png`               | `.specs/front/previews/11-editar-perfil-da-ong-desktop.png`               |

**Protótipo navegável** (FigCraft, _flows_):

- “Visitante · mobile/desktop”: Boas-vindas → Permissão → Mapa → (prévia) ONG → (card Caramelo) Animal → “Quero adotar” abre `wa.me`.
- “ONG · mobile/desktop”: Login → Painel → Cadastrar animal.

**Direção visual (“Pino no bairro”)**: fundo papel `#F5F3EE`, tinta `#17241E`, verde-mata `#1F4D3A`, destaque amarelo-gema `#F5B82E`, WhatsApp `#157A43`. O pino do mapa é o motivo do sistema (máscara de fotos, marcador, etapa atual, estados vazios). Tipografia de produção: Bricolage Grotesque (títulos) + Figtree (texto); no arquivo usamos Nunito Sans como substituta, pois as fontes não estão instaladas no FigCraft.

**Imagens de exemplo**: fotos reais de Wikimedia Commons (CC0, domínio público, CC BY 2.0 e CC BY-SA 4.0), baixadas em `.specs/front/assets/` com créditos em `.specs/front/assets/credits.json`. São **ilustrativas** — não representam ONGs ou animais reais do produto; ONGs, nomes, endereços, CNPJs e telefones nas telas são fictícios. As licenças CC BY/BY-SA exigem crédito se forem usadas em material público.

---

## 11. Arquitetura técnica (monorepo)

A arquitetura segue a base [web-hook-nestjs-observe](https://github.com/BrunomelloxD/web-hook-nestjs-observe), já copiada para esta pasta **sem o domínio de exemplo** (chat, webhooks, SSE e sessão do chat foram removidos). As regras gerais estão em `ARCHITECTURE.md` (raiz), `apps/api/ARCHITECTURE.md` e `apps/web/ARCHITECTURE.md`; esta seção registra só o que é específico do Animal Helper.

### 11.1 Estado da base

| Item                                                                                                                                               | Estado                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Estrutura `apps/api`, `apps/web`, `packages/api-client`, `packages/tsconfig`, `packages/vitest-config`                                             | pronta                                                                                                                                                                         |
| api: só o módulo `health` + `common/` (config com zod, logger pino, filtro de erros do Prisma, paginação, `IBaseRepository`)                       | pronta                                                                                                                                                                         |
| `schema.prisma` sem models; `prisma/migrations/` vazio (só o lock)                                                                                 | pronto para o primeiro model                                                                                                                                                   |
| web: layout com tema claro/escuro, `components/ui` (button, input, label, table, avatar, pagination-nav, theme-toggle), página inicial placeholder | pronta                                                                                                                                                                         |
| Contrato OpenAPI → `@repo/api-client` gerado                                                                                                       | funcionando (sem rotas de domínio ainda)                                                                                                                                       |
| Docker Compose (Postgres, migrate, api, web; perfis `mock` e `docs`), Makefile e CI                                                                | prontos; **ainda sem PostGIS, MinIO e Mailpit** (ver §11.5)                                                                                                                    |
| Validação local feita em 19/10/2026                                                                                                                | `lint`, `typecheck`, `format:check`, `build`, testes unitários da api (44) e do web (162, 100% de cobertura), pacotes a 100%                                                   |
| Não validado nesta máquina                                                                                                                         | cobertura da api com e2e e `make e2e` (precisam de Docker/Postgres); testes do Storybook (o WSL não tem as libs do Chromium: rode `sudo npx playwright install-deps chromium`) |

### 11.2 Stack

| Camada             | Escolha                                                                                                           | Versão na base                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Monorepo           | npm workspaces + Turborepo (só npm; lockfile único)                                                               | turbo 2.11                                  |
| API                | NestJS (REST, `/api/v1`, Swagger fora de produção), class-validator, helmet, throttler, nestjs-pino               | Nest 12                                     |
| Banco              | PostgreSQL + Prisma (`prisma-client`, ESM, adapter `pg`)                                                          | Postgres 18, Prisma 7.10                    |
| Web                | Next.js App Router, SSR-first (Cache Components/PPR), React, Tailwind v4, shadcn/ui + Base UI, lucide             | Next 16.4, React 19.3, Tailwind 4.3         |
| Contrato           | Swagger da api → `openapi.json` → `openapi-typescript` → `openapi-fetch`                                          | —                                           |
| Qualidade          | Vitest (100% de cobertura obrigatória), Storybook (stories como teste + a11y), Playwright (E2E), oxlint, Prettier | Vitest 4.1, Storybook 10.6, Playwright 1.64 |
| Mapa (a adicionar) | Leaflet + react-leaflet + markercluster, num Client Component                                                     | —                                           |

### 11.3 Princípios herdados que guiam o produto

- **O navegador nunca chama a api direto.** O web chama a api no servidor (`getApi()` é `server-only`): Server Components/queries para leitura, Server Actions para escrita. Interações que precisam de dados no cliente (mover o mapa, toggle de disponibilidade) passam por **Route Handlers do Next** como BFF (ex.: `GET /map/ngos?bbox=` no web → `GET /api/v1/ngos?bbox=` na api).
- **A api é a única dona das regras de negócio e do Prisma.** O web só valida formulários (zod) para dar retorno rápido; a api valida de novo (class-validator).
- **Um módulo/feature não importa de outro**; o compartilhado sobe para `common/` (api) ou `components/ui`/`lib/` (web). Pacote em `packages/` só com 2+ consumidores.
- **Textos em português no `dictionary` de cada feature**; código, comentários e rotas em inglês (ver §11.6).
- **Server Components por padrão**; interatividade em arquivos `.client.tsx`. Páginas públicas de ONG e animal são renderizadas no servidor (SEO e prévia em redes sociais — RF-19).

### 11.4 Mapa de módulos (api) e features (web)

| Área do PRD             | Telas  | api — `src/modules/`                                                         | web — `src/features/` + rota                                                                    |
| ----------------------- | ------ | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Boas-vindas             | 01     | `animals` (destaques)                                                        | `home` · `/`                                                                                    |
| Localização             | 02     | `geo` (cidade/CEP → centro)                                                  | `location` · `/localizacao`                                                                     |
| Mapa                    | 03     | `ngos` (bbox/raio, aberta agora)                                             | `map` · `/mapa` (Leaflet em `.client.tsx` via `next/dynamic`, `ssr: false`) + Route Handler BFF |
| Página da ONG           | 04     | `ngos`, `animals`                                                            | `ngo-page` · `/ong/[slug]`                                                                      |
| Detalhe do animal       | 05     | `animals`                                                                    | `animal-page` · `/ong/[slug]/animais/[id]`                                                      |
| Login / recuperar senha | 06, 08 | `auth` (sessão, reset por e-mail), `mail`                                    | `auth` · `/entrar`, `/recuperar-senha`                                                          |
| Cadastro                | 07a–e  | `ngos` (criação), `auth`, `geo` (CEP, geocodificação), `integrations` (CNPJ) | `signup` · `/cadastro/[etapa]`                                                                  |
| Painel                  | 09     | `animals` (escopo da ONG)                                                    | `dashboard` · `/painel`                                                                         |
| Cadastrar/editar animal | 10     | `animals`, `storage` (imagens)                                               | `animal-form` · `/painel/animais/novo`, `/painel/animais/[id]`                                  |
| Perfil                  | 11     | `ngos`, `auth` (alterar senha, excluir conta)                                | `ngo-profile` · `/painel/perfil`                                                                |

`health` já existe. `geo`, `integrations`, `mail` e `storage` encapsulam serviços externos atrás de um contrato (classe abstrata), como o `IBaseRepository` faz com o banco — assim os testes não dependem de rede.

### 11.5 Decisões técnicas propostas (a registrar em `.specs/STATE.md` ao implementar)

| #    | Decisão                                                                                                                                                                                                                                                                       | Motivo / trade-off                                                                                                                                                                                                                                                            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-01 | **PostGIS**: coluna `location geography(Point, 4326)` declarada no Prisma como `Unsupported(...)`; buscas por bbox/raio com `$queryRaw` no repositório; índice GiST criado em SQL na migration.                                                                               | O Prisma não modela tipos geográficos. O SQL fica isolado no repositório (`ngos`) e coberto por testes e2e. Trocar a imagem do Compose por uma `postgis/postgis` compatível com o Postgres 18 (confirmar a tag) e habilitar `CREATE EXTENSION postgis` na primeira migration. |
| D-02 | **Sessão da ONG**: a api emite um token opaco aleatório (guardado só como hash, mesmo padrão do token da base de exemplo) com expiração; o web guarda em cookie `httpOnly`/`Secure`/`SameSite=Lax`; `proxy.ts` faz a checagem otimista e as páginas validam na api.           | Mantém a api sem estado de navegador e permite revogar sessões (logout, troca de senha). Alternativa: JWT curto + refresh. A base deixava autenticação "em aberto".                                                                                                           |
| D-03 | **Imagens**: upload via URL pré-assinada para o **Railway Storage Bucket** (S3-compatível) em produção e MinIO no Compose de dev (ou um bucket/prefixo separado — nunca misturar dados de dev com os da demo); a api gera variantes WebP e remove EXIF ao confirmar o upload. | Arquivos grandes não passam pelo Next nem pela api; o mesmo código funciona com S3, R2 ou similar em produção.                                                                                                                                                                |
| D-04 | **E-mail**: contrato `IMailer` na api; Mailpit no Compose de dev; provedor transacional em produção (§9.5).                                                                                                                                                                   | Recuperação de senha testável localmente sem enviar e-mails reais.                                                                                                                                                                                                            |
| D-05 | **Geocodificação e CNPJ só no servidor** (módulos `geo` e `integrations`), com cache e limite de taxa.                                                                                                                                                                        | Respeita as políticas do Nominatim/BrasilAPI (§9.2, §9.4) e não expõe chaves.                                                                                                                                                                                                 |
| D-06 | **Localização do visitante nunca chega à api**: o cliente envia só o bbox do mapa (RNF-02). Logs de acesso não gravam query string nas rotas do mapa.                                                                                                                         | LGPD; também melhora o cache.                                                                                                                                                                                                                                                 |
| D-07 | **Design tokens**: as cores e tipos do Design System (`.specs/front/index.figcraft`) substituem os tokens do `globals.css` da base; fontes Bricolage Grotesque + Figtree via `next/font`.                                                                                     | O script `check-conventions` já obriga as features a usarem só tokens do tema.                                                                                                                                                                                                |
| D-08 | **"Aberta agora"** calculado na api (fuso da ONG) e devolvido nos DTOs; o web não recalcula.                                                                                                                                                                                  | Uma regra só, testável, sem divergência entre servidor e navegador.                                                                                                                                                                                                           |
| D-09 | **Modo demo e limpeza**: `DEMO_MODE` liga avisos, cotas e expiração. A limpeza roda uma vez por dia — de preferência como **cron service do Railway** executando um comando da api, para não manter timers no processo da api (lição do AD-005 da base).                      | Um processo curto só roda quando agendado; se falhar, a próxima execução recupera (a consulta é sempre “tudo vencido”).                                                                                                                                                       |
| D-10 | **Cotas no banco e na api**: contadores calculados por consulta (`count`, `sum(bytes)`) dentro da transação de criação; limite por IP com o throttler da base, na rota de cadastro.                                                                                           | Garante a regra mesmo com várias requisições simultâneas; sem tabela extra de contadores.                                                                                                                                                                                     |
| D-11 | **Segredos fora do repositório**: variáveis do bucket adicionadas ao `env.schema.ts` (zod) e ao `.env.example` só com nomes/valores falsos; valores reais no `.env` local e no Railway.                                                                                       | Atende RNF-27; o app falha ao subir se faltar variável (comportamento da base).                                                                                                                                                                                               |

### 11.6 Glossário: produto → código

| Produto (PRD)          | Código (model / módulo / rota)                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------ |
| ONG                    | `Ngo` · `ngos` · `/api/v1/ngos`                                                                        |
| HorarioFuncionamento   | `OpeningHours` (tabela `opening_hours`)                                                                |
| Animal                 | `Animal` · `animals` · `/api/v1/animals`                                                               |
| ImagemAnimal           | `AnimalImage` (tabela `animal_images`)                                                                 |
| Espécie / Sexo / Porte | enums `Species` (`DOG`, `CAT`, `OTHER`), `Sex` (`MALE`, `FEMALE`), `Size` (`SMALL`, `MEDIUM`, `LARGE`) |
| Disponível para adoção | `available: boolean`                                                                                   |

Os textos que o usuário vê continuam em português (dictionaries no web, mensagens de erro da api).

### 11.7 Fluxo de trabalho

Cada feature segue o fluxo spec-driven da base: `.specs/features/<feature>/spec.md` → `design.md` → `tasks.md` → `validation.md`, com as decisões em `.specs/STATE.md` (skill `tlc-spec-driven`). O gate é o mesmo do CI: `make gate` (formatação, lint, tipos, 100% de cobertura, build, Storybook) e `make e2e`.

---

### 11.8 Variáveis de ambiente da api (storage e demo)

A adicionar ao `apps/api/src/common/config/env.schema.ts` e ao `apps/api/.env.example` **quando o módulo `storage` for implementado**. Hoje os valores reais do bucket já estão no `apps/api/.env` local (ignorado pelo git) e precisam ser cadastrados também nas variáveis do serviço `api` no Railway.

| Variável                                                                        | Exemplo no `.env.example`      | Observação                    |
| ------------------------------------------------------------------------------- | ------------------------------ | ----------------------------- |
| `S3_ENDPOINT`                                                                   | `https://<endpoint-do-bucket>` | Endpoint S3 do Railway Bucket |
| `S3_REGION`                                                                     | `auto`                         |                               |
| `S3_BUCKET`                                                                     | `<nome-do-bucket>`             |                               |
| `S3_ACCESS_KEY_ID`                                                              | `<access-key-id>`              | **Segredo**                   |
| `S3_SECRET_ACCESS_KEY`                                                          | `<secret-access-key>`          | **Segredo**                   |
| `DEMO_MODE`, `DEMO_RETENTION_DAYS`, `DEMO_MAX_*`, `DEMO_SIGNUPS_PER_IP_PER_DAY` | valores do §6.5                | Cotas da demo                 |

**Regra:** nenhuma credencial aparece no código, no `prd.md`, em commits, logs ou respostas de erro. As credenciais atuais serão **trocadas** pelo responsável antes da demo pública (ver §14).

---

## 12. Sugestões de endpoints (rascunho para estudo)

REST/JSON da **api** (NestJS), prefixo `/api/v1` (já configurado na base: prefixo global + versionamento por URI). Rotas em inglês (§11.6). O navegador não chama estas rotas: o web chama no servidor, e o mapa usa um Route Handler do web como BFF (§11.3). Autenticação da ONG: token de sessão da D-02, enviado pelo web no header `Authorization: Bearer <token>`.

### Público (sem autenticação)

| Método | Rota                                                              | Uso                                                                                  |
| ------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| GET    | `/ngos?bbox=minLng,minLat,maxLng,maxLat&openNow=true&species=DOG` | Pinos do mapa (campos mínimos). Preferir bbox a lat/lng do visitante (RNF-02, D-06). |
| GET    | `/ngos/{slug}`                                                    | Página da ONG (perfil + horários + `openNow`).                                       |
| GET    | `/ngos/{slug}/animals?species=&sex=&size=&available=true&page=`   | Grade de animais com filtros e paginação (`PaginationDto` da base).                  |
| GET    | `/animals/{id}`                                                   | Detalhe do animal + resumo da ONG + link `wa.me` pronto.                             |
| GET    | `/animals/featured?limit=8`                                       | Vitrine da boas-vindas.                                                              |
| GET    | `/geo/search?q=04101`                                             | Cidade/CEP → centro do mapa (cache no servidor).                                     |

### Autenticação e cadastro

| Método | Rota                            | Uso                                                            |
| ------ | ------------------------------- | -------------------------------------------------------------- |
| POST   | `/auth/sessions`                | Login (e-mail + senha) → token de sessão.                      |
| DELETE | `/auth/sessions/current`        | Logout (revoga o token).                                       |
| POST   | `/auth/password-resets`         | Envia o link (resposta sempre 202).                            |
| POST   | `/auth/password-resets/{token}` | Define a nova senha.                                           |
| POST   | `/ngos/validations/cnpj`        | DV + duplicidade + (opcional) consulta externa.                |
| POST   | `/ngos/validations/email`       | Disponibilidade (com limite de taxa).                          |
| POST   | `/ngos`                         | Cria a ONG com os dados de todas as etapas.                    |
| POST   | `/geo/geocode`                  | Endereço → lat/lng sugerido (respeita os limites do provedor). |

### Área da ONG (autenticado; sempre no escopo da ONG da sessão)

| Método               | Rota                                      | Uso                                                                                   |
| -------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------- |
| GET / PATCH          | `/me/ngo`                                 | Ler/editar perfil (CNPJ somente leitura).                                             |
| PUT                  | `/me/ngo/opening-hours`                   | Substitui os 7 dias.                                                                  |
| PUT                  | `/me/ngo/location`                        | Confirma/ajusta o pino.                                                               |
| POST                 | `/me/ngo/image/upload-url`                | URL pré-assinada para a imagem da ONG (D-03).                                         |
| PUT                  | `/me/password`                            | Alterar senha (senha atual + nova).                                                   |
| DELETE               | `/me/ngo`                                 | Excluir conta e dados (LGPD).                                                         |
| GET                  | `/me/animals?search=&species=&available=` | Painel.                                                                               |
| POST                 | `/me/animals`                             | Criar animal.                                                                         |
| GET / PATCH / DELETE | `/me/animals/{id}`                        | Ler, editar, excluir.                                                                 |
| PATCH                | `/me/animals/{id}/availability`           | Toggle da lista `{ "available": false }`.                                             |
| POST                 | `/me/animals/{id}/images/upload-url`      | URL pré-assinada; depois `POST /me/animals/{id}/images` confirma e gera as variantes. |
| PUT                  | `/me/animals/{id}/images/order`           | `{ "ids": [...] }` — o primeiro vira capa.                                            |
| DELETE               | `/me/animals/{id}/images/{imageId}`       | Remover foto.                                                                         |

### Rotas do web (Next) que não são páginas

| Método | Rota                 | Uso                                                                                          |
| ------ | -------------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/map/ngos?bbox=...` | BFF do mapa: repassa à api sem registrar o bbox em log.                                      |
| GET    | `/session/end`       | Apaga um cookie de sessão inválido (padrão da base: Server Components não escrevem cookies). |

---

## 13. Questões em aberto e decisões futuras

1. **Moderação/aprovação de ONGs:** publicar na hora ou só após revisão manual? Como evitar perfis falsos (golpes de “adoção” com cobrança)?
2. **CNPJ obrigatório?** Aceitar protetores independentes/coletivos (CPF ou sem documento) com outro nível de verificação?
3. **Denúncias:** botão “denunciar” em ONG e animal (maus-tratos, golpe, cobrança indevida) e fluxo de suspensão.
4. **Nome de exibição:** usar razão social ou permitir “nome fantasia” (mais amigável no mapa)?
5. **Exibir CNPJ publicamente** para dar confiança ao visitante?
6. **Compartilhamento de animais:** cards para redes sociais (Open Graph), link curto, QR code para feiras de adoção.
7. **Vários usuários por ONG** e papéis (coordenador, voluntário).
8. **Mais de um intervalo por dia** (ex.: 9h–12h e 14h–18h), feriados e “aberta só com agendamento”.
9. **Animais em feiras/lares temporários** cujo endereço difere do da ONG.
10. **Status intermediário** “em processo de adoção” além de disponível/indisponível? Histórico de adotados (prova social)?
11. ~~**Stack a definir**~~ **Decidido:** monorepo da base (NestJS + Prisma/PostgreSQL + PostGIS, Next.js SSR-first) — §11. **Continuam em aberto:** hospedagem (api, web, banco gerenciado com PostGIS), storage de imagens em produção (decidido: Railway Bucket), provedor de tiles/geocodificação e de e-mail, e a confirmação das decisões D-01 a D-11.
12. **Domínio, marca e jurídico:** nome definitivo, Termos de uso, Política de privacidade, encarregado de dados.
13. **Métricas sem rastrear o visitante:** quais eventos agregados coletar e com qual ferramenta.
14. **Cidade piloto** e estratégia de onboarding das primeiras ONGs.
15. **Demo:** período de retenção final (7 dias?) e valores das cotas; quais seeds manter permanentes; a recuperação de senha envia e-mail de verdade na demo (provedor gratuito) ou fica desligada?
16. **Imagens privadas do bucket:** servir por URL pré-assinada (mais simples) ou por proxy do web com cache (menos requisições ao bucket)? Validar num spike antes do módulo `storage`.

---

## 14. Próximos passos

1. ~~**Base do monorepo**~~ **Feito (19/10/2026):** base copiada e limpa (sem chat/webhooks), renomeada para `animal-helper`, com lint, tipos, build e testes unitários passando. Falta validar nesta máquina a cobertura da api com e2e e o `make e2e` (precisam de Docker) e os testes do Storybook (`sudo npx playwright install-deps chromium`).
2. **Segurança das credenciais:** as chaves do bucket foram compartilhadas em conversa; **rotacioná-las** no Railway antes da demo pública e atualizar só o `.env` local e as variáveis do Railway.
3. **Railway:** configurar o _usage limit_ do plano Hobby, criar os serviços (api, web, Postgres com PostGIS, cron de limpeza) e cadastrar as variáveis.
4. **Versionar:** `git init`, primeiro commit da base e repositório remoto (o CI do GitHub Actions já está pronto).
5. **Validar com usuários:** testar o protótipo com 3–5 ONGs e 5 pessoas que querem adotar (achar uma ONG aberta, mandar mensagem sobre um animal, cadastrar um animal pelo celular).
6. **Decidir as questões 1 e 2** (moderação e CNPJ) e confirmar D-01 a D-11 — elas mudam o cadastro, o modelo e a infraestrutura.
7. **Infraestrutura de dev:** trocar a imagem do Postgres por PostGIS, adicionar MinIO e Mailpit ao `docker-compose.yml` e as variáveis novas aos `.env.example` (validadas com zod).
8. **Design no código:** levar os tokens e as fontes do Design System para o `globals.css` (D-07) e criar no Storybook os componentes base do DS (pino, selos, chips, toggle, uploader, stepper).
9. **Specs por feature** (`tlc-spec-driven`), na ordem das fatias verticais: (a) `ngos` + `animals` leitura pública com seeds → páginas 04 e 05; (b) `geo` + mapa (03) e localização (02); (c) `auth` + cadastro (06–08); (d) painel, formulário de animal e perfil (09–11); (e) boas-vindas final (01).
10. **Escolher provedores** de tiles, geocodificação, storage e e-mail; estimar custos para 100 ONGs e 50 mil visitas/mês.
11. **Antes do lançamento:** auditoria de acessibilidade (axe + leitor de tela), teste de performance em 4G, revisão LGPD e créditos das imagens (substituir as fotos de exemplo por fotos reais das ONGs).
