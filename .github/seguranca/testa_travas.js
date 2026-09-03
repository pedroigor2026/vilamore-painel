// PROVA QUE AS 3 TRAVAS PEGAM DE VERDADE (02/09/2026).
//
// POR QUE ISTO EXISTE: fechadura que nunca foi testada tambem termina o dia com zero
// arrombamento. Uma trava que passou a nao pegar mais nada continuaria dando "tudo certo"
// para sempre, e seria pior que nao ter trava — porque compra confianca sem entregar nada.
// Aqui a gente joga o problema DE PROPOSITO em cima dela e cobra que ela reprove.
//
// Os "segredos" abaixo sao INVENTADOS. Nenhum vale nada em lugar nenhum.
// Esta pasta e' pulada pela varredura, entao eles nao acusam falso.
//
// Roda sozinho:  node .github/seguranca/testa_travas.js
'use strict';
const assert = require('node:assert');
const { varrerTexto } = require('./varre_seguranca.js');

let feitos = 0;
function caso(nome, fn) {
  try { fn(); feitos++; console.log('  ok   ' + nome); }
  catch (e) { console.log('  FALHOU  ' + nome + '\n         ' + e.message); process.exitCode = 1; }
}
function pega(texto, trava) {
  const a = varrerTexto('teste.js', texto);
  assert.ok(a.some(x => x.trava === trava), 'a trava ' + trava + ' deixou passar: ' + texto.slice(0, 60));
}
function naoPega(texto) {
  const a = varrerTexto('teste.js', texto);
  assert.strictEqual(a.length, 0, 'acusou sem motivo (' + JSON.stringify(a) + ') em: ' + texto.slice(0, 60));
}

console.log('provando as 3 travas:');

// ---- TRAVA 1: senha vazada
caso('pega token do GitHub', () => pega('const t = "ghp_' + 'A'.repeat(36) + '";', 1));
caso('pega token do GitHub no formato novo', () => pega('TOKEN=github_pat_' + 'B'.repeat(40), 1));
caso('pega senha escrita no codigo', () => pega('const senha = "confeitaria2026";', 1));
caso('pega chave privada de certificado', () => pega('-----BEGIN RSA PRIVATE KEY-----', 1));
caso('pega chave da AWS', () => pega('AKIAIOSFODNN7EXAMPLE', 1));

// ---- TRAVA 2: banco de dados aberto
caso('pega chave de administrador do banco', () => pega('{"role":"service_role"}', 2));
caso('pega chave secreta do Supabase', () => pega('KEY=sb_secret_' + 'c'.repeat(30), 2));
caso('pega token de gestao do Supabase', () => pega('sbp_' + 'a1b2c3d4'.repeat(6), 2));
caso('pega senha dentro da linha de conexao do banco', () => pega('postgres://usuario:senhaforte@servidor:5432/banco', 2));

// ---- TRAVA 3: dado pessoal
caso('pega CPF', () => pega('cliente: 123.456.789-01', 3));
caso('pega CNPJ', () => pega('empresa 12.345.678/0001-99', 3));
caso('pega telefone de celular', () => pega('whatsapp (21) 99999-1234', 3));
caso('pega e-mail de pessoa', () => pega('avisar joao.silva@gmail.com', 3));

// ---- o que NAO pode acusar (falso alarme trava o Pedro sem motivo)
caso('a chave publica do navegador NAO e vazamento', () => naoPega('const A = "sb_publishable_5EbpdievXaj7uw_Cdul2QQ_Mo77EgXg";'));
caso('texto comum passa limpo', () => naoPega('<h1>Painel Vilamore</h1><p>Bem-vindo</p>'));
caso('e-mail de exemplo em documentacao passa', () => naoPega('use seu-email@exemplo.com para entrar'));
caso('numero comum nao vira telefone', () => naoPega('total de vendas: 12345 6789'));

// ---- a liberacao com motivo escrito
caso('linha liberada COM motivo nao acusa', () => naoPega('const senha = "abc12345"; // seguranca-ok: exemplo da documentacao'));
caso('liberacao SEM motivo nao vale', () => pega('const senha = "abc12345"; // seguranca-ok:', 1));

// ---- a trava tem que apontar onde
caso('diz o arquivo e a linha', () => {
  const a = varrerTexto('index.html', 'linha boa\nconst senha = "abcdef123";');
  assert.strictEqual(a[0].arquivo, 'index.html');
  assert.strictEqual(a[0].linha, 2);
});
caso('nao repete o segredo inteiro na tela', () => {
  const a = varrerTexto('t.js', 'const t = "ghp_' + 'A'.repeat(36) + '";');
  assert.ok(a[0].trecho.includes('escondido'), 'o achado nao pode imprimir o segredo todo');
});

console.log('\n' + feitos + ' prova(s) passaram.');
if (process.exitCode) console.log('ALGUMA TRAVA PAROU DE PEGAR — nao publique ate consertar.');
