// Gera public/index.html (versão ao vivo) a partir de src/app.html.
// Com --snapshot, também grava dist/snapshot.html com os dados atuais embutidos
// (e-mails mascarados e telefones removidos), para compartilhar sem servidor.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const fragment = await readFile(new URL('./src/app.html', import.meta.url), 'utf8');

const page = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
</head>
<body>
${fragment}
</body>
</html>
`;
await mkdir(new URL('./public/', import.meta.url), { recursive: true });
await writeFile(new URL('./public/index.html', import.meta.url), page);
console.log('public/index.html gerado');

if (process.argv.includes('--snapshot')) {
  const { loadData } = await import('./server.js');
  const data = await loadData();
  const mask = (e) => { if (!e) return e; const [u, d] = e.split('@'); return `${u.slice(0, 3)}•••@${d ?? ''}`; };
  data.users = data.users.map(({ id, email, telefone, ...u }) => ({ ...u, email: mask(email), telefone: telefone ? '•' : null }));
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const out = `${fragment.replace('<script>', `<script>window.__SNAPSHOT__ = ${json};</script>\n<script>`)}`;
  await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
  await writeFile(new URL('./dist/snapshot.html', import.meta.url), out);
  console.log(`dist/snapshot.html gerado (${data.users.length} usuários)`);
}
