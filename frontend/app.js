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
const COR_EVENTO = ["var(--laranja)", "var(--magenta)", "var(--azul)"];

const $ = (id) => document.getElementById(id);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const REDES = { 1: "Ethereum Mainnet", 10: "Optimism", 56: "BNB Chain", 137: "Polygon", 8453: "Base", 42161: "Arbitrum", 17000: "Holesky", 31337: "rede local", 1337: "rede local" };
const paraEth = (wei) => web3.utils.fromWei(wei, "ether");
const curto = (txt, ini = 6, fim = 4) => (txt.length > ini + fim + 1 ? `${txt.slice(0, ini)}…${txt.slice(-fim)}` : txt);
const FECHO = `<svg class="fecho" viewBox="0 0 40 24" aria-hidden="true"><rect class="fecho-a" x="1.5" y="4" width="15" height="16" fill="none" stroke="currentColor" stroke-width="3"/><path class="fecho-b" d="M23 4h15.5v16H23M24 12h-10" fill="none" stroke="currentColor" stroke-width="3"/></svg>`;
const icone = (nome) => `<svg class="ico" aria-hidden="true"><use href="#i-${nome}"/></svg>`;
const linkTx = (hash) =>
  `<a class="link-tx" href="${SEPOLIA.explorer}/tx/${hash}" target="_blank" rel="noopener">${hash.slice(0, 10)}…${icone("externo")}</a>`;

// Guarda o último estado visto de cada ingresso, para animar só o que mudou
const ingressosVistos = new Map();
let primeiraCarga = true;
let timerStatus;

function mostrarStatus(texto, tipo = "") {
  const el = $("status");
  el.textContent = texto;
  el.className = tipo;
  clearTimeout(timerStatus);
  if (!texto) return;
  requestAnimationFrame(() => el.classList.add("visivel"));
  timerStatus = setTimeout(() => el.classList.remove("visivel"), tipo === "erro" ? 9000 : 5000);
}

// Evita que o nome de um evento seja interpretado como HTML
function escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function formatarData(segundos) {
  const n = Number(segundos);
  if (!n) return "";
  return new Date(n * 1000).toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function mostrarTelaConectada(conectada) {
  $("intro").classList.toggle("oculto", conectada);
  $("app").classList.toggle("oculto", !conectada);
  // Com a carteira já conectada (rede errada), a tela inicial não pede para conectar de novo
  $("btn-conectar-intro").classList.toggle("oculto", Boolean(conta));
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
    $("info-conta").innerHTML = "";
    $("painel-dono").classList.add("oculto");
    $("btn-conectar").classList.remove("oculto");
    mostrarTelaConectada(false);
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
    $("info-conta").innerHTML =
      `<span class="rede errada">Rede errada: ${REDES[chainId] || `chain ${chainId}`}</span>` +
      `<span class="conta"><span title="${conta}">${curto(conta)}</span></span>`;
    mostrarTelaConectada(false);
    return;
  }
  $("aviso-rede").classList.add("oculto");

  contrato = new web3.eth.Contract(CONTRATO_ABI, CONTRATO_ENDERECO);
  mostrarTelaConectada(true);
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

// Cache dos eventos lidos (usado na compra e nos ingressos)
let eventosLidos = [];

async function atualizarTela() {
  const saldo = await web3.eth.getBalance(conta);
  $("info-conta").innerHTML =
    `<span class="rede">Sepolia</span>` +
    `<span class="conta"><span title="${conta}">${curto(conta)}</span><span>${Number(paraEth(saldo)).toFixed(4)} ETH</span></span>`;

  // Interface diferenciada para o dono
  const dono = await contrato.methods.dono().call();
  const souDono = dono.toLowerCase() === conta.toLowerCase();
  $("painel-dono").classList.toggle("oculto", !souDono);

  // Eventos
  const total = Number(await contrato.methods.totalEventos().call());
  eventosLidos = [];
  let linhas = "";
  let ativos = 0;
  for (let id = 0; id < total; id++) {
    const ev = await contrato.methods.eventos(id).call();
    eventosLidos[id] = ev;
    const st = Number(ev.status);
    if (st === 0) ativos++;
    const vendidos = Number(ev.vendidos);
    const capacidade = Number(ev.capacidade);
    const pct = capacidade ? Math.min(100, (vendidos / capacidade) * 100) : 0;
    const avaliacao = Number(ev.saldoAvaliacoes);
    const extra = [];
    if (st === 2 || avaliacao !== 0) extra.push(`Avaliação <b>${avaliacao > 0 ? "+" : ""}${avaliacao}</b>`);
    if (souDono) extra.push(`Arrecadado <b>${paraEth(ev.arrecadado)} ETH</b>`);
    linhas += `<div class="evento st-${st}" role="listitem" data-id="${id}" tabindex="0" aria-label="Evento ${id}: ${escapar(ev.nome)}, ${STATUS_EVENTO[st]}">
      <div class="evento-faixa"></div>
      <div class="evento-id">#${String(id).padStart(2, "0")}</div>
      <div class="evento-nome"><strong>${escapar(ev.nome)}</strong><small>${formatarData(ev.data)}</small></div>
      <div class="evento-preco evento-num">${paraEth(ev.preco)}<small>ETH por ingresso</small></div>
      <div class="evento-vend"><div class="evento-num">${vendidos}<small>${vendidos >= capacidade ? "Esgotado · " : ""}de ${capacidade} vendidos</small></div><div class="medidor"><i style="width:${pct}%"></i></div></div>
      <span class="selo">${STATUS_EVENTO[st]}</span>
      ${extra.length ? `<div class="evento-extra">${extra.map((e) => `<span>${e}</span>`).join("")}</div>` : ""}
    </div>`;
  }
  $("tabela-eventos").innerHTML =
    linhas ||
    `<div class="vazio"><strong>Nenhum evento ainda.</strong>${souDono ? "Crie o primeiro no painel do organizador, logo abaixo." : "Quando o organizador criar um evento, ele aparece aqui."}</div>`;
  $("eventos-resumo").textContent = total ? `${plural(total, "evento", "eventos")} no contrato · ${ativos} à venda` : "";
  // Sem seleção ainda: escolhe o primeiro evento à venda
  if ($("compra-evento").value === "") {
    const primeiro = eventosLidos.findIndex((e) => Number(e.status) === 0);
    if (primeiro >= 0) $("compra-evento").value = primeiro;
  }
  marcarEventoSelecionado();

  // Meus ingressos
  const ids = await contrato.methods.meusIngressos().call({ from: conta });
  linhas = "";
  const contagem = [0, 0, 0];
  for (const id of ids) {
    const ing = await contrato.methods.ingressos(id).call();
    const evId = Number(ing.eventoId);
    const ev = eventosLidos[evId];
    const stIng = Number(ing.status);
    const stEv = ev ? Number(ev.status) : 0;
    contagem[stIng]++;

    // A cor da pulseira conta o estado: usado e reembolsado vencem o estado do evento
    let classe = "est-valido";
    let acoes = "";
    if (stIng === 1) {
      classe = "est-usado";
      if (stEv === 2) {
        const jaAvaliou = await contrato.methods.avaliou(evId, conta).call().catch(() => false);
        acoes = jaAvaliou
          ? `<span class="nota">${icone("ok")} Você já avaliou este evento</span>`
          : `<button class="btn btn-pequeno" data-acao="avaliar" data-id="${id}" data-positivo="1">${icone("gostei")}Gostei</button>
             <button class="btn btn-pequeno" data-acao="avaliar" data-id="${id}" data-positivo="0">${icone("nao-gostei")}Não gostei</button>`;
      }
    } else if (stIng === 2) {
      classe = "est-reembolsado";
    } else if (stEv === 1) {
      classe = "est-cancelado";
      acoes = `<button class="btn btn-pequeno" data-acao="reembolso" data-id="${id}">Pedir reembolso</button>`;
    } else if (stEv === 2) {
      classe = "est-encerrado";
      acoes = `<span class="nota">Evento encerrado sem check-in</span>`;
    }

    // Animação: pulseira nova é "impressa"; pulseira que mudou de estado estala o lacre
    const chave = String(id);
    const anterior = ingressosVistos.get(chave);
    let anima = "";
    if (!primeiraCarga && anterior === undefined) anima = " nova";
    else if (anterior !== undefined && anterior !== classe) anima = " mudou";
    ingressosVistos.set(chave, classe);

    const codigo = String(ing.codigo);
    linhas += `<article class="pulseira ${classe}${anima}" role="listitem">
      <div class="holo"></div>
      <div class="pulseira-corpo">
        <div class="pulseira-titulo">${escapar(ev ? ev.nome : `Evento ${evId}`)}</div>
        <div class="pulseira-codigo"><code title="${codigo}">${codigo.slice(0, 14)}…${codigo.slice(-10)}</code>
          <button class="copiar" data-codigo="${codigo}" aria-label="Copiar código do ingresso ${id}">${icone("copiar")}</button></div>
        ${acoes ? `<div class="pulseira-acoes">${acoes}</div>` : ""}
      </div>
      <div class="lacre" aria-label="Ingresso ${id}, ${STATUS_INGRESSO[stIng]}"><b class="serial">${String(id).padStart(2, "0")}</b>${FECHO}<span>${STATUS_INGRESSO[stIng]}</span></div>
    </article>`;
  }
  primeiraCarga = false;
  $("tabela-ingressos").innerHTML =
    linhas || `<div class="vazio"><strong>Nenhum ingresso nesta conta.</strong>Escolha um evento à venda e compre o primeiro.</div>`;
  $("ingressos-resumo").textContent = ids.length
    ? [plural(ids.length, "pulseira", "pulseiras"), contagem[0] && plural(contagem[0], "válida", "válidas"), contagem[1] && plural(contagem[1], "usada", "usadas"), contagem[2] && plural(contagem[2], "reembolsada", "reembolsadas")]
        .filter(Boolean)
        .join(" · ")
    : "";

  atualizarTotalCompra();
  await carregarHistorico();
}

// ---------------------------------------------------------------------
// 4. Escrita no contrato (.send) com hash e estado da transação
// ---------------------------------------------------------------------

function linhaTx(descricao, hash, estado) {
  const rotulos = { assinatura: "aguardando assinatura", pendente: "pendente", confirmada: "confirmada", falhou: "falhou" };
  const classe = estado === "assinatura" ? "pendente" : estado;
  return `<span>${escapar(descricao)}</span>${hash ? linkTx(hash) : "<span></span>"}<span class="estado-tx ${classe}">${
    estado === "confirmada" ? icone("ok") : ""
  }${rotulos[estado]}</span>`;
}

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

  $("lista-tx").querySelector(".vazio-li")?.remove();
  const item = document.createElement("li");
  item.innerHTML = linhaTx(descricao, null, "assinatura");
  $("lista-tx").prepend(item);

  try {
    const recibo = await metodo.send(opcoes).on("transactionHash", (hash) => {
      item.innerHTML = linhaTx(descricao, hash, "pendente");
    });
    item.innerHTML = linhaTx(descricao, recibo.transactionHash, "confirmada");
    mostrarStatus(`${descricao}: confirmada!`, "ok");
    await atualizarTela();
  } catch (erro) {
    item.innerHTML = linhaTx(descricao, null, "falhou");
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

const NOMES_LOG = {
  EventoCriado: "Evento criado",
  IngressoComprado: "Ingresso comprado",
  CheckInRealizado: "Check-in",
  EventoCancelado: "Evento cancelado",
  EventoEncerrado: "Evento encerrado",
  Reembolsado: "Reembolso",
  EventoAvaliado: "Avaliação",
  Saque: "Saque",
};
const COR_LOG = {
  EventoCriado: "var(--laranja)",
  IngressoComprado: "var(--laranja)",
  CheckInRealizado: "var(--tinta)",
  EventoCancelado: "var(--magenta)",
  Reembolsado: "var(--magenta)",
  EventoEncerrado: "var(--azul)",
  EventoAvaliado: "var(--azul)",
  Saque: "var(--verde)",
};

// Traduz os argumentos do evento do contrato para uma frase em português
function descreverLog(nome, v) {
  const evNome = (id) => (eventosLidos[Number(id)] ? `${eventosLidos[Number(id)].nome} (#${id})` : `Evento #${id}`);
  const quem = (a) => (a && conta && a.toLowerCase() === conta.toLowerCase() ? "você" : curto(String(a)));
  switch (nome) {
    case "EventoCriado": return `${v.nome} · ${paraEth(v.preco)} ETH · ${v.capacidade} lugares · ${formatarData(v.data)}`;
    case "IngressoComprado": return `Ingresso #${v.ingressoId} de ${evNome(v.eventoId)} para ${quem(v.comprador)}`;
    case "CheckInRealizado": return `Ingresso #${v.ingressoId} entrou em ${evNome(v.eventoId)}`;
    case "EventoCancelado": return `${evNome(v.eventoId)} cancelado · reembolsos liberados`;
    case "EventoEncerrado": return `${evNome(v.eventoId)} encerrado · saque e avaliações liberados`;
    case "Reembolsado": return `Ingresso #${v.ingressoId} · ${paraEth(v.valor)} ETH devolvido a ${quem(v.comprador)}`;
    case "EventoAvaliado": return `${evNome(v.eventoId)} · ${v.positivo ? "gostou" : "não gostou"} (${quem(v.avaliador)})`;
    case "Saque": return `${paraEth(v.valor)} ETH sacado de ${evNome(v.eventoId)}`;
    default:
      return Object.entries(v)
        .filter(([k]) => isNaN(k) && k !== "__length__")
        .map(([k, x]) => `${k}: ${String(x).length > 20 ? String(x).slice(0, 10) + "…" : x}`)
        .join(", ");
  }
}

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
        const dados = descreverLog(ev.event, ev.returnValues);
        return `<li style="--cor-ev:${COR_LOG[ev.event] || "var(--tinta)"}">
          <span class="bloco">Bloco ${ev.blockNumber}</span>
          <span class="nome-ev">${NOMES_LOG[ev.event] || escapar(ev.event)}</span>
          <span class="dados">${escapar(dados)}</span>
          ${linkTx(ev.transactionHash)}</li>`;
      })
      .join("") || `<li class="vazio-li">Nenhum evento ainda.</li>`;
}

// ---------------------------------------------------------------------
// 7. Formulários e ações
// ---------------------------------------------------------------------

$("btn-conectar").onclick = conectar;
$("btn-conectar-intro").onclick = conectar;
$("btn-trocar-rede").onclick = trocarParaSepolia;
$("lista-tx").innerHTML = `<li class="vazio-li">As transações que você enviar aparecem aqui, com o hash e o estado.</li>`;
if (Web3.utils.isAddress(CONTRATO_ENDERECO)) {
  $("link-contrato").href = `${SEPOLIA.explorer}/address/${CONTRATO_ENDERECO}`;
}

// Clicar em um evento preenche a compra (e o painel do organizador)
function selecionarEvento(id) {
  $("compra-evento").value = id;
  $("gerenciar-id").value = id;
  marcarEventoSelecionado();
  atualizarTotalCompra();
}
function marcarEventoSelecionado() {
  const id = $("compra-evento").value;
  document.querySelectorAll(".evento").forEach((el) => el.classList.toggle("selecionado", el.dataset.id === id));
  const ev = id === "" ? null : eventosLidos[Number(id)];
  const sel = $("compra-selecao");
  if (!ev) {
    sel.className = "compra-selecao";
    sel.innerHTML = id === "" ? "" : `<div class="evento-faixa" style="background:var(--tinta)"></div><strong>Evento ${escapar(id)} não existe<small>Escolha um evento da lista</small></strong>`;
    return;
  }
  const st = Number(ev.status);
  sel.className = `compra-selecao st-${st}`;
  sel.innerHTML = `<div class="evento-faixa"></div><strong>${escapar(ev.nome)}<small>#${String(id).padStart(2, "0")} · ${paraEth(ev.preco)} ETH por ingresso · ${Number(ev.capacidade) - Number(ev.vendidos)} restantes</small></strong><span class="selo">${STATUS_EVENTO[st]}</span>`;
}
$("tabela-eventos").addEventListener("click", (e) => {
  const linha = e.target.closest(".evento");
  if (linha) selecionarEvento(linha.dataset.id);
});
$("tabela-eventos").addEventListener("keydown", (e) => {
  const linha = e.target.closest(".evento");
  if (linha && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    selecionarEvento(linha.dataset.id);
    $("compra-qtd").focus();
  }
});

// Total da compra no próprio botão
let timerTotal;
function atualizarTotalCompra() {
  clearTimeout(timerTotal);
  timerTotal = setTimeout(async () => {
    const ev = eventosLidos[Number($("compra-evento").value)];
    const qtd = Number($("compra-qtd").value);
    if (!contrato || !ev || $("compra-evento").value === "" || qtd < 1 || qtd > 5) {
      $("compra-total").textContent = "";
      return;
    }
    const total = await contrato.methods.calcularTotal(ev.preco, qtd).call().catch(() => null);
    $("compra-total").textContent = total === null ? "" : `${paraEth(total)} ETH`;
  }, 150);
}
$("compra-evento").addEventListener("input", () => {
  marcarEventoSelecionado();
  atualizarTotalCompra();
});
$("compra-qtd").addEventListener("input", atualizarTotalCompra);

// Ações na própria pulseira
$("tabela-ingressos").addEventListener("click", async (e) => {
  const copiar = e.target.closest(".copiar");
  if (copiar) {
    try {
      await navigator.clipboard.writeText(copiar.dataset.codigo);
      mostrarStatus("Código copiado. Cole no check-in do organizador.", "ok");
    } catch {
      mostrarStatus("Não foi possível copiar. Selecione o código e copie manualmente.", "erro");
    }
    return;
  }
  const botao = e.target.closest("button[data-acao]");
  if (!botao) return;
  const id = botao.dataset.id;
  if (botao.dataset.acao === "reembolso") {
    await enviar(`Reembolso do ingresso ${id}`, contrato.methods.pedirReembolso(id));
  }
  if (botao.dataset.acao === "avaliar") {
    await avaliar(id, botao.dataset.positivo === "1");
  }
});

async function avaliar(id, positivo) {
  const ing = await contrato.methods.ingressos(id).call().catch(() => null);
  if (!ing) return mostrarStatus(`O ingresso ${id} não existe.`, "erro");
  await enviar(`Avaliar evento ${ing.eventoId}`, contrato.methods.avaliarEvento(ing.eventoId, id, positivo));
}

$("form-comprar").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("compra-evento").value;
  const qtd = $("compra-qtd").value;
  const ev = await contrato.methods.eventos(id).call().catch(() => null);
  if (!ev) return mostrarStatus(`O evento ${id} não existe.`, "erro");
  const total = await contrato.methods.calcularTotal(ev.preco, qtd).call();
  await enviar(`Comprar ${plural(Number(qtd), "ingresso", "ingressos")} · ${ev.nome}`, contrato.methods.comprarIngresso(id, qtd), total);
};

$("form-reembolso").onsubmit = async (e) => {
  e.preventDefault();
  const id = $("reembolso-id").value;
  await enviar(`Reembolso do ingresso ${id}`, contrato.methods.pedirReembolso(id));
};

$("form-avaliar").onsubmit = async (e) => {
  e.preventDefault();
  await avaliar($("avaliar-id").value, e.submitter.dataset.positivo === "1");
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
  window.ethereum.on("accountsChanged", (contas) => {
    ingressosVistos.clear();
    primeiraCarga = true;
    iniciar(contas[0]);
  });
  window.ethereum.on("chainChanged", async () => {
    const contas = await window.ethereum.request({ method: "eth_accounts" });
    iniciar(contas[0]);
  });
}
