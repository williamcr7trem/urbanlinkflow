'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const root = path.resolve(__dirname, '..');

async function iniciarComBancoSimulado(t, port) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'urbanlink-start-'));
  const preload = path.join(tmp, 'banco.cjs');
  fs.writeFileSync(preload, `const db = require(${JSON.stringify(path.join(root, 'src/config/database.js'))});\ndb.authenticate = async () => {};\n`);
  const child = spawn(process.execPath, ['--require', preload, 'src/app.js'], {
    cwd: root, env: { ...process.env, NODE_ENV: 'development', HOST: '127.0.0.1', PORT: String(port), DB_SYNC: 'false', JWT_SECRET: 'Teste-local-123456789!abcdEF' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const closed = once(child, 'close');
  t.after(async () => { if (child.exitCode === null) child.kill(); await closed; fs.rmSync(tmp, { recursive: true, force: true }); });
  return new Promise((resolve, reject) => {
    let log = '';
    const timeout = setTimeout(() => reject(new Error('Servidor não iniciou: ' + log)), 10000);
    const receive = chunk => {
      log += chunk.toString();
      const match = log.match(/UrbanLink Flow disponível em (http:\/\/127\.0\.0\.1:\d+\/)/);
      if (match) { clearTimeout(timeout); resolve({ url: match[1], log }); }
    };
    child.stdout.on('data', receive); child.stderr.on('data', receive);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('close', code => { clearTimeout(timeout); reject(new Error(`Servidor terminou (${code}): ${log}`)); });
  });
}

async function conferirPaginas(url) {
  const home = await fetch(url);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /UrbanLink/i);
  for (const route of ['index.html', 'login.html', 'cadastro-cliente.html', 'css/interface.css', 'js/app.js']) {
    const result = await fetch(new URL(route, url));
    assert.equal(result.status, 200, route);
    await result.arrayBuffer();
  }
  const missing = await fetch(new URL('pagina-inexistente-teste', url));
  assert.equal(missing.status, 404);
  await missing.arrayBuffer();
}

test('inicialização anuncia a porta efetivamente aberta e serve o frontend', async t => {
  const { url } = await iniciarComBancoSimulado(t, 0);
  assert.notEqual(new URL(url).port, '0');
  await conferirPaginas(url);
});

test('porta ocupada não é anunciada como se fosse do UrbanLink', async t => {
  const occupied = http.createServer((_req, res) => { res.statusCode = 404; res.end('Outro servidor'); });
  occupied.listen(0, '127.0.0.1');
  await once(occupied, 'listening');
  t.after(() => new Promise(resolve => occupied.close(resolve)));
  const port = occupied.address().port;
  const { url, log } = await iniciarComBancoSimulado(t, port);
  assert.match(log, /Porta \d+ ocupada/);
  assert.notEqual(Number(new URL(url).port), port);
  await conferirPaginas(url);
});
