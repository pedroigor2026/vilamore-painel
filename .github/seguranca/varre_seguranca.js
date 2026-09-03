// AS 3 TRAVAS DE SEGURANCA DA PAGINA PUBLICA (02/09/2026).
//
// Este repositorio e PUBLICO: qualquer pessoa na internet le tudo que esta aqui. Estas tres
// travas olham cada mudanca ANTES de ela ficar publicada, e sao as unicas que machucam se
// passarem. Capricho (estilo, tamanho de arquivo, organizacao) ficou de fora de proposito:
// nao protege ninguem e traz pecas de programas de fora para dentro do projeto.
//
//   1. SENHA VAZADA .......... chave, token ou senha escrita por engano dentro do codigo
//   2. BANCO DE DADOS ABERTO . chave de ADMINISTRADOR do banco publicada aqui
//   3. DADO PESSOAL .......... CPF, telefone ou e-mail de cliente dentro do codigo
//
// NAO USA NENHUM PACOTE DE FORA. E' Node puro, de proposito.
//
// COMO LIBERAR UM CASO LEGITIMO: escreva na MESMA LINHA o comentario  seguranca-ok: <motivo>
// (o motivo e obrigatorio; liberacao sem motivo escrito nao vale).
//
// Roda tambem na sua maquina:  node .github/seguranca/varre_seguranca.js
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = process.argv[2] || process.cwd();

// Pastas que nao sao codigo do projeto.
const PULAR_PASTA = new Set(['.git', 'node_modules', '.github/seguranca']);
// So texto: arquivo binario nao tem segredo legivel e enche a varredura de lixo.
const EXT_TEXTO = new Set(['.html', '.js', '.mjs', '.cjs', '.json', '.css', '.txt', '.md', '.yml', '.yaml', '.bat', '.sh', '.env']);
const TAMANHO_MAX = 3 * 1024 * 1024;

// Marca que libera uma linha, com motivo obrigatorio.
const LIBERADO = /seguranca-ok:\s*\S+/;

// A chave publica do Supabase (anon) PODE ficar aqui: e ela que o navegador usa, e o banco se
// protege por RLS, nao por esconder essa chave. Ela comeca com sb_publishable_.
const CHAVE_PUBLICA_OK = /sb_publishable_[A-Za-z0-9_-]+/;

const REGRAS = [
  // ---- TRAVA 1: senha vazada -------------------------------------------------
  { trava: 1, nome: 'token do GitHub', re: /\bgh[pousr]_[A-Za-z0-9]{20,}/ },
  { trava: 1, nome: 'token do GitHub (formato novo)', re: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { trava: 1, nome: 'chave da AWS', re: /\bAKIA[0-9A-Z]{16}\b/ },
  { trava: 1, nome: 'chave privada (arquivo de certificado)', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { trava: 1, nome: 'senha escrita no codigo', re: /\b(?:senha|password|passwd|pwd)\s*[:=]\s*["'][^"'\s]{6,}["']/i },
  { trava: 1, nome: 'token generico escrito no codigo', re: /\b(?:token|api[_-]?key|secret)\s*[:=]\s*["'][A-Za-z0-9_\-.]{20,}["']/i },

  // ---- TRAVA 2: banco de dados aberto ---------------------------------------
  // A chave de administrador do Supabase le e escreve TUDO, ignorando as regras de acesso.
  // Publicada aqui, qualquer pessoa le os dados de clientes e vendas.
  { trava: 2, nome: 'chave de ADMINISTRADOR do banco (service_role)', re: /service_role/ },
  { trava: 2, nome: 'chave secreta do Supabase', re: /\bsb_secret_[A-Za-z0-9_-]+/ },
  { trava: 2, nome: 'token de gestao do Supabase', re: /\bsbp_[a-f0-9]{40,}/ },
  { trava: 2, nome: 'senha do banco na linha de conexao', re: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/ },

  // ---- TRAVA 3: dado pessoal -------------------------------------------------
  { trava: 3, nome: 'CPF', re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/ },
  { trava: 3, nome: 'CNPJ', re: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/ },
  { trava: 3, nome: 'telefone de celular', re: /(?:\(\d{2}\)\s?|\b\d{2}\s)9\d{4}[-\s]?\d{4}\b/ },
  { trava: 3, nome: 'e-mail de pessoa', re: /\b[A-Za-z0-9._%+-]+@(?!exemplo|example|dominio|seudominio|vilamore\.com\.br\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
];

const NOME_TRAVA = {
  1: 'SENHA VAZADA',
  2: 'BANCO DE DADOS ABERTO',
  3: 'DADO PESSOAL',
};

function listar(dir, base) {
  const saida = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const cheio = path.join(dir, item.name);
    const rel = path.relative(base, cheio).split(path.sep).join('/');
    if (item.isDirectory()) {
      if (PULAR_PASTA.has(item.name) || PULAR_PASTA.has(rel)) continue;
      saida.push(...listar(cheio, base));
    } else if (item.isFile()) {
      if (!EXT_TEXTO.has(path.extname(item.name).toLowerCase())) continue;
      let st;
      try { st = fs.statSync(cheio); } catch { continue; }
      if (st.size > TAMANHO_MAX) continue;
      saida.push({ rel, cheio });
    }
  }
  return saida;
}

// Nucleo puro: dado o texto de um arquivo, devolve os achados. Sem disco, sem rede.
function varrerTexto(rel, texto) {
  const achados = [];
  const linhas = String(texto).split(/\r?\n/);
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (LIBERADO.test(linha)) continue;
    for (const regra of REGRAS) {
      const m = linha.match(regra.re);
      if (!m) continue;
      // a chave publica do navegador nao e vazamento
      if (CHAVE_PUBLICA_OK.test(m[0])) continue;
      achados.push({
        trava: regra.trava, tipo: regra.nome, arquivo: rel, linha: i + 1,
        trecho: m[0].length > 24 ? m[0].slice(0, 8) + '...(escondido)' : m[0],
      });
    }
  }
  return achados;
}

function main() {
  const arquivos = listar(RAIZ, RAIZ);
  const achados = [];
  for (const a of arquivos) {
    let txt;
    try { txt = fs.readFileSync(a.cheio, 'utf8'); } catch { continue; }
    achados.push(...varrerTexto(a.rel, txt));
  }

  console.log('varri ' + arquivos.length + ' arquivo(s) de texto em ' + RAIZ);
  if (!achados.length) {
    console.log('\nNENHUM PROBLEMA DE SEGURANCA ENCONTRADO.');
    console.log('(as 3 travas olharam: senha vazada, banco aberto, dado pessoal)');
    return 0;
  }

  console.log('\n' + achados.length + ' PROBLEMA(S) — a publicacao deve PARAR:\n');
  for (const t of [1, 2, 3]) {
    const doTipo = achados.filter(a => a.trava === t);
    if (!doTipo.length) continue;
    console.log('  TRAVA ' + t + ' — ' + NOME_TRAVA[t]);
    for (const a of doTipo) console.log('    ' + a.arquivo + ':' + a.linha + '  ' + a.tipo + '  ->  ' + a.trecho);
    console.log('');
  }
  console.log('Se algum destes for legitimo, escreva na mesma linha:  seguranca-ok: <motivo>');
  return 1;
}

module.exports = { varrerTexto, REGRAS, NOME_TRAVA };

if (require.main === module) process.exitCode = main();
