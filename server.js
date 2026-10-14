// Dashboard de usuários — servidor mínimo (Node 18+)
// Lê DATABASE_URL do .env, expõe GET /api/data e serve /public.
import 'dotenv/config';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('Defina DATABASE_URL no arquivo .env');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = join(fileURLToPath(new URL('.', import.meta.url)), 'public');

export async function loadData() {
  const [users, pending, qrcodes] = await Promise.all([
    sql`
      select u.id_user                               as id,
             u.nome,
             u.email,
             u.telefone,
             u.vinculo,
             u.is_admin                              as admin,
             u.email_verified_at is not null         as verificado,
             u.data_registro                         as registro,
             u.pontos,
             (select s.user_agent from sessions s
               where s.id_user = u.id_user
               order by s.created_at asc limit 1)    as ua,
             (select count(*)::int from sessions s where s.id_user = u.id_user)          as sessoes,
             (select count(*)::int from catch c where c.id_user = u.id_user)             as capturas,
             (select count(*)::int from friend_scans f where f.scanner_id = u.id_user)   as scans_feitos,
             (select count(*)::int from friend_scans f where f.scanned_id = u.id_user)   as scans_recebidos
        from users u
       order by u.data_registro desc`,
    sql`select payload->>'vinculo' as vinculo, created_at as criado, expires_at < now() as expirado
          from pending_registrations order by created_at desc`,
    sql`select q.local, q.pontos, q.ativo, count(c.*)::int as capturas
          from qrcodes q left join catch c using (code_hash)
         group by 1, 2, 3 order by capturas desc, q.local`,
  ]);

  return {
    geradoEm: new Date().toISOString(),
    users: users.map(({ ua, ...u }) => ({ ...u, dispositivo: deviceFrom(ua) })),
    pending,
    qrcodes,
  };
}

function deviceFrom(ua) {
  if (!ua) return 'Sem sessão';
  if (/iPhone|iPad|iOS/i.test(ua)) return 'iPhone / iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Outro';
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/data') {
      const data = await loadData();
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify(data));
    }
    const rel = normalize(url.pathname === '/' ? '/index.html' : url.pathname).replace(/^(\.\.[/\\])+/, '');
    const file = join(PUBLIC_DIR, rel);
    if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    if (err.code === 'ENOENT') { res.writeHead(404); return res.end('Não encontrado'); }
    console.error(err);
    res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ erro: 'Falha ao consultar o banco', detalhe: err.message }));
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => console.log(`Dashboard em http://localhost:${PORT}`));
}
