# Passo a passo de deploy

Ordem: **contrato no Remix → verificação no Etherscan → `contrato.js` → Vercel**.

## Antes de começar

- MetaMask com **duas contas** com SepoliaETH: Conta A (dono, faz o deploy) e Conta B (comprador). O deploy custa pouco, mas deixe pelo menos 0,05 SepoliaETH em cada conta para a demonstração.
- Faucets de Sepolia costumam limitar um pedido por dia. **Peçam com antecedência.**

## 1. Deploy no Remix

1. Abra https://remix.ethereum.org e crie o arquivo `VendaDeIngressos.sol` com o conteúdo de `contracts/VendaDeIngressos.sol`.
2. Aba **Solidity Compiler**:
   - Compiler: **0.8.24** (anote a versão exata, ela é necessária na verificação).
   - Deixe *Optimization* **desligada**.
   - Clique em **Compile VendaDeIngressos.sol**.
3. Aba **Deploy & Run Transactions**:
   - Environment: **Injected Provider – MetaMask**.
   - Confira se a MetaMask está na **Sepolia** e na **Conta A**.
   - Contract: `VendaDeIngressos`. O construtor não tem parâmetros.
   - Clique em **Deploy** e confirme na MetaMask.
4. Quando aparecer em *Deployed Contracts*, anote:
   - **Endereço do contrato** (botão de copiar ao lado do nome).
   - **Hash da transação de deploy** e **número do bloco**: clique na transação no console do Remix ou abra o endereço no Etherscan.

## 2. Verificar o código no Etherscan

**Opção A — pelo Etherscan**

1. Abra `[https://sepolia.etherscan.io/address/SEU_ENDERECO](https://sepolia.etherscan.io/address/0x11430AA58ee149215CA45A09c53f4Fc43895D1f1)` → aba **Contract** → **Verify and Publish**.
2. Compiler Type: **Solidity (Single file)**; Compiler Version: **v0.8.24** (a mesma do Remix); License: **MIT**.
3. Cole o código do contrato. Optimization: **No**. Em *Advanced*, a EVM version deve ser a mesma usada no Remix (o padrão do Remix para a 0.8.24 é **cancun**).
4. Clique em **Verify and Publish**. A aba *Contract* passa a mostrar um ✅.

**Opção B — pelo Remix:** ative o plugin **Contract Verification** no *Plugin Manager*, escolha Etherscan e Sepolia e informe o endereço. Ele pode pedir uma API key gratuita do Etherscan.

## 3. Configurar o frontend

Edite `frontend/contrato.js`:

```js
const CONTRATO_ENDERECO = "0x...";   // endereço do passo 1
const BLOCO_DEPLOY = 1234567;        // bloco do deploy
```

Se o contrato for alterado e implantado de novo, copie a ABI nova no Remix (*Solidity Compiler* → botão **ABI**) e substitua `CONTRATO_ABI`.

Teste localmente:

```bash
cd frontend
python -m http.server 8080
```

## 4. Publicar na Vercel

1. Suba o repositório para o GitHub (público).
2. Em https://vercel.com, entre com o GitHub → **Add New… → Project** → importe o repositório.
3. Configure:
   - **Framework Preset:** Other
   - **Root Directory:** `frontend`
   - Build Command e Output Directory: deixe em branco (é um site estático).
4. Clique em **Deploy**. A URL fica parecida com `https://ingressochain.vercel.app`.
5. Cada `git push` na branch principal publica uma versão nova automaticamente.
6. Coloque a URL no `README.md`.

## 5. Preparar a demonstração

- Na Conta A, crie com antecedência um ou dois eventos com data alguns dias à frente.
- Deixe a MetaMask aberta com as duas contas já conectadas ao site.
- Grave o vídeo de 3 a 5 minutos seguindo o roteiro de teste do README. Ele é o **plano B** se a rede falhar na apresentação.
