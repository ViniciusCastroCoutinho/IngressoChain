# 🎟️ IngressoChain — venda de ingressos na Ethereum

dApp de venda de ingressos com **check-in por código**, **reembolso garantido** em caso de cancelamento e **avaliação** do evento por quem compareceu. Contrato em Solidity implantado na **Sepolia** e frontend em HTML, CSS e JavaScript com **Web3.js 4** e **MetaMask**.

| | |
|---|---|
| **dApp (Vercel)** | https://ingresso-chain-front.vercel.app/ |
| **Contrato** | `0x11430AA58ee149215CA45A09c53f4Fc43895D1f1` |
| **Etherscan** | https://sepolia.etherscan.io/address/0x11430AA58ee149215CA45A09c53f4Fc43895D1f1 |
| **Vídeo de demonstração** | LINK_DO_VIDEO |
| **Slides** | [docs/slides.pdf](docs/slides.pdf) |

---

## 1. Tema e problema resolvido

**Tema:** venda de ingressos para eventos (shows, peças, festivais).

**Problema:** na venda tradicional, o comprador depende da confiança na empresa:

- **Ingressos falsos ou duplicados**: o mesmo ingresso pode ser vendido ou usado mais de uma vez.
- **Reembolso incerto**: quando um evento é cancelado, o dinheiro pode demorar meses ou nunca voltar.
- **Pouca transparência**: o público não tem como conferir quantos ingressos foram vendidos nem o histórico das operações.

**Solução com blockchain:**

- Cada ingresso é um registro no contrato, com um **código único** (`bytes32`) e um **estado** (Válido, Usado ou Reembolsado). Um ingresso usado não pode ser usado de novo.
- O **ETH fica guardado no contrato**, separado por evento. Se o evento for cancelado, o comprador pede o reembolso e o contrato devolve o valor **sem depender do organizador**.
- O organizador só pode sacar o dinheiro **depois de encerrar o evento**.
- Todas as operações emitem **eventos** públicos, que podem ser auditados no Etherscan.

**Atores:**

- **Dono (organizador)**: a conta que fez o deploy. Cria, encerra e cancela eventos, faz o check-in e saca o valor arrecadado.
- **Comprador**: qualquer conta. Compra ingressos, pede reembolso e avalia eventos.

### Diagrama de estados

```
Evento:    Ativo ──cancelarEvento──▶ Cancelado   (libera pedirReembolso)
             └────encerrarEvento───▶ Encerrado   (libera sacar e avaliarEvento)

Ingresso:  Válido ──fazerCheckIn────▶ Usado        (pode avaliar o evento)
             └────pedirReembolso──▶ Reembolsado  (ETH devolvido)
```

---

## 2. Integrantes e papéis

| Integrante | Papel |
|---|---|
| Rubens Takashi Maruoka Vieira| Desenvolvedor do contrato |
| Matheus Takashi Maruoka Vieira | Desenvolvedor frontend |
| Vinícius Castro Coutinho | Documentação e QA |

---

## 3. Contrato na Sepolia

| Item | Valor |
|---|---|
| Endereço | `0x11430AA58ee149215CA45A09c53f4Fc43895D1f1` |
| Transação de deploy | `0x5934cd3d8a4714adea1d697e95934fe024aa0bc30c0449d4e1dd7e155116fd77` |
| Bloco do deploy | `12143849` |
| Etherscan | https://sepolia.etherscan.io/address/0x11430AA58ee149215CA45A09c53f4Fc43895D1f1 |
| Compilador | Solidity 0.8.24, otimização desativada |
| Código verificado | Sim (aba *Contract* no Etherscan) |

---

## 4. Funções do contrato

Arquivo: [`contracts/VendaDeIngressos.sol`](contracts/VendaDeIngressos.sol)

### Funções com regra de negócio

| Função | Quem pode chamar | O que faz | Eventos | Erros possíveis |
|---|---|---|---|---|
| `criarEvento(nome, preco, capacidade, data)` | Somente o dono | Cadastra um evento Ativo. `preco` em wei, `data` = timestamp limite para vendas | `EventoCriado` | `require`: nome vazio, preço 0, capacidade 0, data no passado; acesso negado |
| `comprarIngresso(eventoId, quantidade)` **payable** | Qualquer conta | Compra de 1 a 5 ingressos. O ETH enviado precisa ser exatamente `preco × quantidade` | `IngressoComprado` (um por ingresso) | `IngressosEsgotados(disponivel, solicitado)`, `ValorIncorreto(esperado, enviado)`, `EventoNaoEncontrado(id)`; `require`: quantidade inválida, vendas encerradas, evento não ativo |
| `fazerCheckIn(codigo)` | Somente o dono | Valida o ingresso na entrada: Válido → Usado | `CheckInRealizado` | `IngressoInvalido(codigo)`; `require`: ingresso já usado ou reembolsado, evento não ativo |
| `cancelarEvento(eventoId)` | Somente o dono | Ativo → Cancelado. Libera os reembolsos | `EventoCancelado` | `EventoNaoEncontrado`; `require`: estado diferente de Ativo |
| `encerrarEvento(eventoId)` | Somente o dono | Ativo → Encerrado. Libera saque e avaliações | `EventoEncerrado` | `EventoNaoEncontrado`; `require`: estado diferente de Ativo |
| `sacar(eventoId)` | Somente o dono | Envia ao dono o ETH arrecadado por um evento Encerrado | `Saque` | `require`: nada a sacar, estado diferente de Encerrado |
| `pedirReembolso(ingressoId)` | Comprador do ingresso | Devolve o preço de um ingresso Válido de evento Cancelado | `Reembolsado` | `require`: ingresso inexistente, não é o comprador, evento não cancelado, ingresso já usado/reembolsado |
| `avaliarEvento(eventoId, ingressoId, positivo)` | Comprador que fez check-in | Like (+1) ou dislike (−1), uma vez por conta e por evento | `EventoAvaliado` | `require`: sem check-in, ingresso de outro evento, já avaliou, evento não encerrado |

### Consultas e auxiliares

| Função | Tipo | Descrição |
|---|---|---|
| `calcularTotal(preco, quantidade)` | `public pure` | Valor total da compra. Usada pelo contrato e pelo frontend |
| `ingressosRestantes(eventoId)` | `public view` | Capacidade menos vendidos |
| `totalEventos()` / `totalIngressos()` | `external view` | Tamanho dos arrays (para listar no frontend) |
| `meusIngressos()` | `external view` | Ids dos ingressos de `msg.sender` |
| `eventos(id)`, `ingressos(id)`, `avaliou(id, conta)`, `ingressoPorCodigo(codigo)`, `dono()` | getters automáticos | Leitura das variáveis públicas |
| `_gerarCodigo(id, comprador)` | `internal view` | `keccak256(abi.encodePacked(id, comprador, block.timestamp))` |
| `_emitirIngresso(eventoId, comprador)` | `private` | Cria o ingresso, grava nos mappings e emite o evento |

---

## 5. Tabela de recursos

Cada recurso está marcado no código com `// [Recurso: ...]`.

| Grupo | Onde aparece (linhas) | Por que foi usado |
|---|---|---|
| **TiposDeDados** | `address payable public immutable dono` (L50); `uint256 constant MAX_POR_COMPRA` (L53); `string constant NOME_PLATAFORMA` (L56); `string nome` (L28); `uint256` nos preços e contadores (L29–33); `int256 saldoAvaliacoes` (L34); `bytes32 codigo` (L41); `bool` em `avaliou` e `positivo` (L75, L280); `address payable comprador` no reembolso (L269) | O dono é `immutable` porque nunca muda após o deploy e é `payable` porque recebe o saque. O limite por compra é `constant` porque é uma regra fixa. O `int256` guarda o saldo de avaliações, que pode ficar **negativo** (mais dislikes que likes). O `bytes32` é o código do ingresso, gerado por hash |
| **Funcoes** | `constructor` (L122); `external`: `criarEvento`, `comprarIngresso`, `fazerCheckIn` etc. (L133–280); `public`: `calcularTotal` (L311), `ingressosRestantes` (L317); `internal`: `_gerarCodigo` (L339); `private`: `_emitirIngresso` (L344); `view`: consultas (L317–333); `pure`: `calcularTotal` (L311); `payable`: `comprarIngresso` (L227) | `external` nas funções chamadas só pelo frontend. `calcularTotal` é `public` porque é usada **dentro** de `comprarIngresso` e também pelo frontend. `_gerarCodigo` é `internal` (poderia ser reutilizada por um contrato filho) e `_emitirIngresso` é `private` (detalhe interno). `comprarIngresso` é `payable` porque recebe o pagamento |
| **EstruturasDeControle** | `require` em todas as validações (ex.: L138–141, L235–236); `if/else` na avaliação (L296–300); `for` com limite em `comprarIngresso` (L248); `if` + `revert` (L107, L165–167, L239, L242) | O `for` emite um ingresso por volta e é **limitado por `MAX_POR_COMPRA` (5)**, então o gas nunca cresce sem controle. O `if/else` soma ou subtrai na avaliação |
| **ArraysEMappings** | `Evento[] eventos` (L63) e `Ingresso[] ingressos` (L66), arrays dinâmicos; `mapping(bytes32 => uint256) ingressoPorCodigo` (L69), mapping simples; `mapping(address => uint256[]) ingressosDe` (L72); `mapping(uint256 => mapping(address => bool)) avaliou` (L75), mapping aninhado | Os arrays permitem listar eventos e ingressos pelo índice. O mapping por código permite achar o ingresso no check-in sem laço. O mapping aninhado garante **uma avaliação por conta em cada evento** |
| **StructsEEnums** | `struct Evento` com 8 campos (L27); `struct Ingresso` com 4 campos (L38); `enum StatusEvento { Ativo, Cancelado, Encerrado }` (L14); `enum StatusIngresso { Valido, Usado, Reembolsado }` (L21) | As structs agrupam os dados de cada evento e ingresso. Os enums representam os **estados** do diagrama acima e controlam o que pode ser feito em cada momento |
| **Modificadores** | `apenasDono()` (L100); `eventoExiste(uint256 eventoId)` (L106); `noEstado(uint256 eventoId, StatusEvento esperado)` (L112) | `apenasDono` faz o **controle de acesso** das funções administrativas. `eventoExiste` e `noEstado` têm parâmetros e evitam repetir as mesmas validações em várias funções |
| **EventosEErros** | 8 eventos com `indexed` (L81–88); 4 erros personalizados (L90–93) usados com `revert` em L107, L166, L239, L242; `require` em todo o contrato | Os eventos alimentam o histórico do frontend (`getPastEvents`) e permitem filtrar por evento, comprador ou ingresso. Os erros personalizados levam dados (ex.: `IngressosEsgotados(disponivel, solicitado)`) que o frontend transforma em mensagens claras |

### Segurança

- **Checks-Effects-Interactions** em `sacar` (L203) e `pedirReembolso` (L255): o estado é atualizado (saldo zerado, ingresso marcado como Reembolsado) **antes** do envio de ETH com `call{value: ...}`. Isso impede reentrância e saque duplo.
- **ETH separado por evento** (`arrecadado`): o reembolso de um evento nunca usa o dinheiro de outro.
- **Valor exato** na compra: pagar a mais ou a menos reverte com `ValorIncorreto`.
- **Sem `receive`/`fallback`**: o contrato recusa ETH enviado fora de `comprarIngresso`.
- **Laço limitado**: o único `for` tem no máximo 5 voltas.

---

## 6. Como executar

### 6.1 Acessar a dApp

Abra **https://ingresso-chain-front.vercel.app/** num navegador com a MetaMask instalada.

### 6.2 Configurar a MetaMask na Sepolia

1. Instale a extensão [MetaMask](https://metamask.io) e crie uma carteira **só para testes**.
2. Ative as redes de teste: menu de redes → *Mostrar redes de teste* → **Sepolia**.
3. Pegue SepoliaETH em um faucet (ex.: [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/#/)).
4. Na dApp, clique em **Conectar carteira**. Se a MetaMask estiver em outra rede, a página mostra o aviso e o botão **Trocar para Sepolia**.

> ⚠️ Nunca use uma carteira com fundos reais e nunca publique a frase de recuperação ou a chave privada.

### 6.3 Rodar o frontend localmente

A MetaMask não funciona abrindo o `index.html` direto do disco (`file://`), então é preciso um servidor local:

```bash
cd frontend
python -m http.server 8080
# ou: npx serve .
```

Depois abra http://localhost:8080.

### 6.4 Deploy do contrato e da dApp

Veja o passo a passo em [`docs/DEPLOY.md`](docs/DEPLOY.md).

---

## 7. Roteiro de teste

Use **duas contas** na MetaMask com SepoliaETH: **Conta A = dono** (fez o deploy) e **Conta B = comprador**.

| # | Conta | Ação | Resultado esperado |
|---|---|---|---|
| 1 | A | Conectar com a MetaMask em outra rede (ex.: Ethereum Mainnet) | Aviso de rede errada e botão **Trocar para Sepolia**; ao clicar, a rede muda e a tela carrega |
| 2 | A | Conferir o cabeçalho | Endereço, saldo em ETH e rede; o **Painel do organizador** aparece |
| 3 | A | Criar evento "Show Teste", preço `0.001`, capacidade `3`, data amanhã | Em *Transações*: pendente → confirmada, com link para o Etherscan; o evento aparece na tabela (ID 0) e no histórico (`EventoCriado`) |
| 4 | A | Criar um segundo evento "Teatro" | Dois eventos na tabela (ID 0 e 1) |
| 5 | B | Trocar para a Conta B na MetaMask | A tela atualiza sozinha; o painel do organizador **some** |
| 6 | B | Comprar: evento `0`, quantidade `2` | A MetaMask pede `0.002 ETH`; "Meus ingressos" mostra 2 ingressos **Válidos** com seus códigos; vendidos = 2 / 3 |
| 7 | B | Comprar de novo: evento `0`, quantidade `2` | Mensagem *"Ingressos insuficientes: restam 1 e você pediu 2."* (erro personalizado `IngressosEsgotados`) |
| 8 | B | Comprar evento `1` e **rejeitar** na MetaMask | Mensagem *"Você rejeitou a transação na MetaMask."* |
| 9 | B | Comprar evento `1`, quantidade `1`, e confirmar | Confirmada; copie o código de um ingresso do evento 0 |
| 10 | A | Trocar para a Conta A e colar o código no **Check-in** | Confirmada; o ingresso passa a **Usado** (`CheckInRealizado`) |
| 11 | A | Repetir o mesmo check-in | Mensagem *"Contrato: Ingresso já usado ou reembolsado"* |
| 12 | A | Check-in com o código `0x` + 64 zeros | Mensagem *"Código de ingresso inválido."* (`IngressoInvalido`) |
| 13 | A | *Gerenciar evento*: ID `0` → **Encerrar**; ID `1` → **Cancelar** | Status na tabela: Encerrado e Cancelado |
| 14 | B | *Avaliar*: ID do ingresso usado → **👎 Não gostei** | Avaliação do evento 0 = −1 (`int256` negativo) |
| 15 | B | *Reembolso*: ID do ingresso do evento 1 | O ETH volta para a Conta B; o ingresso fica **Reembolsado** |
| 16 | A | *Gerenciar evento*: ID `0` → **Sacar** | O ETH vai para a Conta A; sacar de novo mostra *"Contrato: Nada a sacar"* |
| 17 | — | Conferir *Histórico de eventos* e os links das transações | Todos os eventos aparecem no histórico e no Sepolia Etherscan |

---

## 8. Limitações conhecidas e melhorias futuras

**Limitações**

- Há um único organizador (o dono do contrato). Não existe cadastro de vários organizadores.
- O código do ingresso fica visível na blockchain: quem lê o contrato pode ver os códigos. Num sistema real, o check-in deveria exigir uma assinatura do dono do ingresso.
- O evento cancelado não devolve o ETH automaticamente: cada comprador precisa pedir o reembolso (padrão *pull*, mais seguro e barato que um laço sobre todos os compradores).
- `block.timestamp` pode ser ajustado em alguns segundos pelos validadores; serve como prazo de venda, não como relógio preciso.
- O histórico do frontend mostra os 50 eventos mais recentes.
- Não há transferência nem revenda de ingressos.

**Melhorias futuras**

- Ingressos como NFT (ERC-721), permitindo transferência e revenda com preço máximo para combater cambismo.
- Check-in por QR code com assinatura digital do comprador.
- Vários organizadores com papéis (`mapping(address => bool) organizadores`).
- Taxa da plataforma e reembolso parcial conforme a antecedência do cancelamento.

---

## 9. Declaração de uso de ferramentas de IA

A equipe usou o **Claude (Anthropic)** como assistente para: discutir a modelagem do contrato a partir dos requisitos do guia, gerar uma primeira versão do contrato e do frontend, escrever testes automatizados locais e redigir esta documentação. Todo o código foi revisado, testado no Remix e na Sepolia e é compreendido pelos integrantes, que respondem por ele na arguição.

---

## Estrutura do repositório

```
ingressochain/
├── contracts/
│   └── VendaDeIngressos.sol   # contrato com NatSpec e marcações [Recurso: ...]
├── frontend/
│   ├── index.html             # estrutura da página
│   ├── style.css              # layout responsivo
│   ├── app.js                 # conexão, leitura, escrita, eventos e erros
│   └── contrato.js            # endereço, bloco do deploy e ABI
├── docs/
│   ├── DEPLOY.md              # passo a passo de deploy (Remix, Etherscan, Vercel)
│   ├── ROTEIRO_APRESENTACAO.md
│   ├── slides.pdf
│   └── prints/                # capturas do Remix, MetaMask e Etherscan
└── README.md
```

## Bibliotecas e referências

- [Web3.js 4.16](https://docs.web3js.org/) via CDN jsDelivr (licença LGPL-3.0)
- [Documentação do Solidity 0.8](https://docs.soliditylang.org/)
- Material da disciplina (curso de Solidity e exemplos de dApp do professor), usado como referência de estudo. Nenhum contrato pronto foi copiado.
