# Roteiro da apresentação (15 min + 5 min de arguição)

Todos os integrantes falam. Sugestão de divisão pelos papéis:

| Bloco | Tempo | Quem | O que mostrar |
|---|---|---|---|
| Problema e solução | 2 min | Documentação/QA | Ingressos falsos, reembolso incerto, falta de transparência. Atores: organizador e comprador. Por que blockchain: o ETH fica no contrato e o reembolso não depende do organizador |
| Arquitetura | 2 min | Integração Web3 | Contrato na Sepolia ↔ Web3.js ↔ MetaMask ↔ frontend na Vercel. Diagrama de estados do evento e do ingresso |
| Contrato | 4 min | Dev do contrato | Percorrer o `.sol` pelos 7 grupos de recursos (tabela do README). Destacar: `int256` da avaliação, laço limitado a 5, mapping aninhado `avaliou`, modificadores com parâmetro, CEI no saque e no reembolso |
| Demonstração ao vivo | 5 min | Frontend + Integração | Ver roteiro abaixo |
| Lições aprendidas | 2 min | Todos | Dificuldades, custos de gas observados, segurança, melhorias |

## Roteiro da demo ao vivo (5 min)

Preparação: eventos já criados, MetaMask com a Conta A (dono) e a Conta B (comprador), Etherscan aberto em outra aba.

1. **Conectar** (Conta B) → mostrar endereço, saldo e selo Sepolia. Se der tempo, trocar a rede na MetaMask para mostrar o aviso e o botão **Trocar para Sepolia**.
2. **Ler dados**: lista de eventos com preço, restantes e status.
3. **Enviar transação com ETH**: comprar 2 ingressos → mostrar Pendente → Confirmada e abrir o link no Etherscan.
4. **Erro tratado**: pedir mais ingressos do que restam → mensagem do erro `IngressosEsgotados`.
5. **Trocar para a Conta A** → o painel do organizador aparece sozinho (`accountsChanged`).
6. **Check-in** com o código copiado → ingresso vira Usado.
7. **Encerrar o evento** → voltar à Conta B → **avaliar 👎** (saldo −1, `int256`).
8. **Histórico**: mostrar os eventos emitidos (`getPastEvents`) e a mesma transação na aba *Events* do Etherscan.

Se a rede ou a MetaMask falharem: rodar o **vídeo de demonstração** (plano B).

## Perguntas prováveis na arguição

| Pergunta | Resposta curta |
|---|---|
| Por que `immutable` no dono e `constant` no limite? | `constant` é fixado na compilação; o dono só é conhecido no deploy, então é `immutable`. Os dois não ocupam storage e são baratos de ler |
| Onde o `int` faz sentido? | `saldoAvaliacoes`: likes somam 1 e dislikes subtraem 1; o saldo pode ser negativo |
| Por que o laço não é perigoso? | Ele é limitado por `MAX_POR_COMPRA = 5`; o gas máximo é previsível |
| O que é checks-effects-interactions? | Validar, atualizar o estado e só depois enviar ETH. Em `sacar` o saldo é zerado antes do `call`, então uma reentrada não saca de novo |
| Por que o reembolso é pedido por cada comprador? | Padrão *pull*: devolver para todos num laço poderia estourar o gas e um destinatário com erro travaria todos |
| Diferença entre `.call()` e `.send()` na Web3.js? | `.call()` lê sem transação e sem gas; `.send()` cria uma transação assinada na MetaMask, que custa gas e altera o estado |
| Como o frontend mostra os erros personalizados? | Antes de enviar, simula com `.call()`. Se reverter, pega os dados do revert, compara o seletor com os erros da ABI e decodifica os parâmetros |
| Para que serve o `indexed`? | Permite filtrar eventos por aquele parâmetro (ex.: todos os ingressos de um comprador) |
| `private` deixa o dado secreto? | Não. Só impede outros contratos de lerem; qualquer pessoa lê o storage pela blockchain |
| Por que `bytes32` no código do ingresso? | É o tamanho do resultado do `keccak256`, tem tamanho fixo e é mais barato que `string` |
