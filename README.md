# Painel de cadastros

Dashboard interativo dos usuários do banco Neon (Postgres): quantos são, como se dividem por vínculo e como se cadastraram (etapas, aparelho, campos preenchidos, dia e hora).

## Rodar

```bash
npm install
npm start          # http://localhost:3000
```

A conexão vem de `DATABASE_URL` no arquivo `.env` (já preenchido). Os dados são lidos ao vivo e atualizados a cada 60 s ou pelo botão **Atualizar**.

## Estrutura

- `server.js` — servidor Node sem framework; `GET /api/data` consulta `users`, `sessions`, `pending_registrations`, `catch`, `friend_scans` e `qrcodes`.
- `src/app.html` — o painel (HTML, CSS e JS puros, sem dependências no navegador).
- `build.mjs` — gera `public/index.html` a partir de `src/app.html`. Rode `node build.mjs` depois de editar o painel. Com `--snapshot`, também gera `dist/snapshot.html`, uma cópia com os dados embutidos (e-mails mascarados, sem telefones) para compartilhar sem servidor.

## O que o painel mostra

- **Divisão por vínculo**: faixa em que cada bloco é um usuário; clicar num grupo filtra todo o painel.
- **Etapas do cadastro**: iniciaram (inclui cadastros pendentes de código), concluíram, verificaram o e-mail.
- **Aparelho usado**: dispositivo da primeira sessão de cada usuário.
- **Dados informados**: e-mail, telefone e vínculo preenchidos.
- **Cadastros por dia e por hora** (horário de Fortaleza).
- **Tabela de usuários** com busca, filtros e ordenação.
  
