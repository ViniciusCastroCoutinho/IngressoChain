// =====================================================================
//  app.js — IngressoChain
//  Conexão com a MetaMask, leitura (.call), escrita (.send),
//  eventos (getPastEvents) e tratamento de erros.
// =====================================================================

let web3;
let contrato;
let conta;

const STATUS_EVENTO = ["Ativo", "Cancelado", "Encerrado"];
const STATUS_INGRESSO = ["Válido", "Usado", "Reembolsado"];

const $ = (id) => document.getElementById(id);
const paraEth = (wei) => web3.utils.fromWei(wei, "ether");
const linkTx = (hash) => `<a href="${SEPOLIA.explorer}/tx/${hash}" target="_blank">${hash.slice(0, 10)}…</a>`;

function mostrarStatus(texto, tipo = "") {
  $("status").textContent = texto;
  $("status").className = tipo;
}

// Evita que o nome de um evento seja interpretado como HTML
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// ---------------------------------------------------------------------
// 1. Conexão com a carteira
// ---------------------------------------------------------------------

async function conectar() {
  if (!window.ethereum) {
    mostrarStatus("MetaMask não encontrada. Instale a extensão.", "erro");
    return;
  }
  try {
    const contas = await window.ethereum.request({ method: "eth_requestAccounts" });
    await iniciar(contas[0]);
  } catch (erro) {
    mostrarStatus(traduzirErro(erro), "erro");
  }
}

async function iniciar(novaConta) {
  conta = novaConta;
  if (!conta) {
    $("info-conta").textContent = "";
    $("painel-dono").classList.add("oculto");
    $("btn-conectar").classList.remove("oculto");
    return;
  }
  if (!Web3.utils.isAddress(CONTRATO_ENDERECO)) {
    mostrarStatus("Configure CONTRATO_ENDERECO em contrato.js com o endereço do deploy.", "erro");
    return;
  }
  $("btn-conectar").classList.add("oculto");
  web3 = new Web3(window.ethereum);

  // 2. Verificação da rede
  const chainId = Number(await web3.eth.getChainId());
  if (chainId !== SEPOLIA.chainIdDecimal) {
    $("aviso-rede").classList.remove("oculto");
    $("painel-dono").classList.add("oculto");
    $("info-conta").textContent = `Conta: ${conta} | Rede errada (${chainId})`;
    return;
  }
  $("aviso-rede").classList.add("oculto");

  contrato = new web3.eth.Contract(CONTRATO_ABI, CONTRATO_ENDERECO);
  await atualizarTela();
}

async function trocarParaSepolia() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA.chainIdHex }],
    });
  } catch (erro) {
    mostrarStatus(traduzirErro(erro), "erro");
  }
}

// ---------------------------------------------------------------------
// 3. Leitura do contrato (.call)
// ---------------------------------------------------------------------

async function atualizarTela() {
  const saldo = await web3.eth.getBalance(conta);
  $("info-conta").textContent = `Conta: ${conta} | Saldo: ${Number(paraEth(saldo)).toFixed(4)} ETH | Rede: Sepolia`;

  // Interface diferenciada para o dono
  const dono = await contrato.methods.dono().call();
  $("painel-dono").classList.toggle("oculto", dono.toLowerCase() !== conta.toLowerCase());

  // Eventos
  const total = Number(await contrato.methods.totalEventos().call());
  const nomes = [];
  let linhas = "";
  for (let id = 0; id < total; id++) {
    const ev = await contrato.methods.eventos(id).call();
    nomes[id] = ev.nome;
    linhas += `<tr>
      <td>${id}</td><td>${escapar(ev.nome)}</td><td>${paraEth(ev.preco)} ETH</td>
      <td>${ev.vendidos} / ${ev.capacidade}</td><td>${STATUS_EVENTO[Number(ev.status)]}</td>
      <td>${ev.saldoAvaliacoes}</td></tr>`;
  }
  $("tabela-eventos").innerHTML = linhas || '<tr><td colspan="6">Nenhum evento.</td></tr>';

  // Meus ingressos
  const ids = await contrato.methods.meusIngressos().call({ from: conta });
  linhas = "";
  for (const id of ids) {
    const ing = await contrato.methods.ingressos(id).call();
    linhas += `<tr>
      <td>${id}</td><td>${escapar(nomes[Number(ing.eventoId)])}</td>
      <td>${STATUS_INGRESSO[Number(ing.status)]}</td><td><code>${ing.codigo}</code></td></tr>`;
  }
  $("tabela-ingressos").innerHTML = linhas || '<tr><td colspan="4">Nenhum ingresso.</td></tr>';

  await carregarHistorico();
}

// ---------------------------------------------------------------------
// 4. Escrita no contrato (.send) com hash e estado da transação
// ---------------------------------------------------------------------

async function enviar(descricao, metodo, valorWei = "0") {
  const opcoes = { from: conta, value: valorWei.toString() };

  // Falta de saldo
  const saldo = await web3.eth.getBalance(conta);
  if (BigInt(saldo) < BigInt(valorWei)) {
    return mostrarStatus(`Saldo insuficiente: você precisa de ${paraEth(valorWei)} ETH + gas.`, "erro");
  }

  // Simula antes: se o contrato for reverter, mostra o motivo sem abrir a MetaMask
  try {
    await metodo.call(opcoes);
  } catch (erro) {
    mostrarStatus(traduzirErro(erro), "erro");
    return;
  }

  // Desabilita os botões enquanto a transação está pendente (evita envio duplicado)
  document.querySelectorAll("main button").forEach((btn) => (btn.disabled = true));

  const item = document.createElement("li");
  item.textContent = `${descricao}: aguardando assinatura…`;
  $("lista-tx").prepend(item);

  try {
    const recibo = await metodo.send(opcoes).on("transactionHash", (hash) => {
      item.innerHTML = `${escapar(descricao)}: ${linkTx(hash)} — ⏳ pendente`;
    });
    item.innerHTML = `${escapar(descricao)}: ${linkTx(recibo.transactionHash)} — ✅ confirmada`;
    mostrarStatus(`${descricao}: confirmada!`, "ok");
    await atualizarTela();
  } catch (erro) {
    item.innerHTML = `${escapar(descricao)} — ❌ falhou`;
    mostrarStatus(traduzirErro(erro), "erro");
  } finally {
    document.querySelectorAll("main button").forEach((btn) => (btn.disabled = false));
  }
}

// ---------------------------------------------------------------------
// 5. Tratamento de erros
// ---------------------------------------------------------------------

// Procura os dados do revert (0x...) dentro do objeto de erro
function acharDadosRevert(erro, nivel = 0) {
  if (!erro || typeof erro !== "object" || nivel > 5) return null;
  for (const chave of ["data", "cause", "innerError", "error"]) {
    const v = erro[chave];
    if (chave === "data" && typeof v === "string" && v.startsWith("0x") && v.length >= 10) return v;
    const achado = acharDadosRevert(v, nivel + 1);
    if (achado) return achado;
  }
  return null;
}

function traduzirErro(erro) {
  console.error(erro);
  const texto = String(erro?.message) + JSON.stringify(erro, (_, v) => (typeof v === "bigint" ? String(v) : v));

  // Transação rejeitada pelo usuário
  if (erro?.code === 4001 || /user (denied|rejected)/i.test(texto)) {
    return "Você rejeitou a transação na MetaMask.";
  }

  // Revert com erro personalizado ou require
  const dados = acharDadosRevert(erro);
  if (dados) {
    const seletor = dados.slice(0, 10);
    const corpo = "0x" + dados.slice(10);
    if (seletor === "0x08c379a0") {
      return "Contrato: " + web3.eth.abi.decodeParameter("string", corpo); // require(..., "mensagem")
    }
    for (const item of CONTRATO_ABI.filter((x) => x.type === "error")) {
      const assinatura = `${item.name}(${item.inputs.map((i) => i.type).join(",")})`;
      if (web3.eth.abi.encodeFunctionSignature(assinatura) === seletor) {
        const a = web3.eth.abi.decodeParameters(item.inputs, corpo);
        if (item.name === "IngressosEsgotados") return `Ingressos insuficientes: restam ${a[0]} e você pediu ${a[1]}.`;
        if (item.name === "ValorIncorreto") return `Valor incorreto: esperado ${paraEth(a[0])} ETH, enviado ${paraEth(a[1])} ETH.`;
        if (item.name === "EventoNaoEncontrado") return `O evento ${a[0]} não existe.`;
        if (item.name === "IngressoInvalido") return "Código de ingresso inválido.";
      }
    }
  }

  // Falta de saldo
  if (/insufficient funds/i.test(texto)) {
    return "Saldo insuficiente para pagar o valor e o gas.";
  }

  return "Erro: " + (erro?.message || "desconhecido");
}

// ---------------------------------------------------------------------
// 6. Histórico de eventos (getPastEvents)
// ---------------------------------------------------------------------

async function carregarHistorico() {
  let eventos;
  try {
    eventos = await contrato.getPastEvents("allEvents", { fromBlock: BLOCO_DEPLOY, toBlock: "latest" });
  } catch {
    // Alguns RPCs limitam o intervalo de blocos: busca só os últimos 5000
    const atual = await web3.eth.getBlockNumber();
    eventos = await contrato.getPastEvents("allEvents", { fromBlock: atual > 5000n ? atual - 5000n : 0n, toBlock: "latest" });
  }
  $("historico").innerHTML =
    eventos
      .reverse()
      .map((ev) => {
        const dados = Object.entries(ev.returnValues)
          .filter(([k]) => isNaN(k) && k !== "__length__")
          .map(([k, v]) => `${k}: ${typeof v === "string" && v.length > 20 ? v.slice(0, 10) + "…" : v}`)
          .join(", ");
        return `<li>Bloco ${ev.blockNumber} — <b>${ev.event}</b> (${escapar(dados)}) ${linkTx(ev.transactionHash)}</li>`;
      })
      .join("") || "<li>Nenhum evento ainda.</li>";
}

// ---------------------------------------------------------------------
// 7. Formulários
// ---------------------------------------------------------------------

$("btn-conectar").onclick = conectar;
$("btn-trocar-rede").onclick = trocarParaSepolia;

$("form-comprar").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("compra-evento").value;
  const qtd = $("compra-qtd").value;
  const ev = await contrato.methods.eventos(id).call().catch(() => null);
  if (!ev) return mostrarStatus(`O evento ${id} não existe.`, "erro");
  const total = await contrato.methods.calcularTotal(ev.preco, qtd).call();
  await enviar(`Comprar ${qtd} ingresso(s) do evento ${id}`, contrato.methods.comprarIngresso(id, qtd), total);
};

$("form-reembolso").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("reembolso-id").value;
  await enviar(`Reembolso do ingresso ${id}`, contrato.methods.pedirReembolso(id));
};

$("form-avaliar").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("avaliar-id").value;
  const positivo = e.submitter.dataset.positivo === "1";
  const ing = await contrato.methods.ingressos(id).call().catch(() => null);
  if (!ing) return mostrarStatus(`O ingresso ${id} não existe.`, "erro");
  await enviar(`Avaliar evento ${ing.eventoId}`, contrato.methods.avaliarEvento(ing.eventoId, id, positivo));
};

$("form-criar").onsubmit = async (e) => {
  e.preventDefault();
  const nome = $("ev-nome").value;
  const preco = web3.utils.toWei($("ev-preco").value, "ether");
  const capacidade = $("ev-capacidade").value;
  const data = Math.floor(new Date($("ev-data").value).getTime() / 1000);
  await enviar(`Criar evento "${nome}"`, contrato.methods.criarEvento(nome, preco, capacidade, data));
};

$("form-checkin").onsubmit = async (e) => {
  e.preventDefault();
  const codigo = $("checkin-codigo").value.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(codigo)) return mostrarStatus("Código inválido: use 0x + 64 caracteres.", "erro");
  await enviar("Check-in", contrato.methods.fazerCheckIn(codigo));
};

$("form-gerenciar").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("gerenciar-id").value;
  const acao = e.submitter.dataset.acao;
  if (acao === "encerrar") await enviar(`Encerrar evento ${id}`, contrato.methods.encerrarEvento(id));
  if (acao === "cancelar") await enviar(`Cancelar evento ${id}`, contrato.methods.cancelarEvento(id));
  if (acao === "sacar") await enviar(`Sacar do evento ${id}`, contrato.methods.sacar(id));
};

// ---------------------------------------------------------------------
// 8. Troca de conta ou de rede na MetaMask
// ---------------------------------------------------------------------

if (window.ethereum) {
  window.ethereum.on("accountsChanged", (contas) => iniciar(contas[0]));
  window.ethereum.on("chainChanged", async () => {
    const contas = await window.ethereum.request({ method: "eth_accounts" });
    iniciar(contas[0]);
  });
}
