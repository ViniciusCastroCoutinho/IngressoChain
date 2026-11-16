// =====================================================================
//  contrato.js — endereço e ABI do contrato implantado na Sepolia
// =====================================================================
//  Depois do deploy no Remix:
//   1. Cole o endereço do contrato em CONTRATO_ENDERECO.
//   2. Cole o número do bloco do deploy em BLOCO_DEPLOY (aparece no
//      Etherscan, na transação de criação). O histórico de eventos é
//      buscado a partir desse bloco.
//   3. Se o contrato for alterado, copie a nova ABI no Remix
//      (Solidity Compiler → ABI) e substitua CONTRATO_ABI.
// =====================================================================

const CONTRATO_ENDERECO = "0xCOLE_O_ENDERECO_DO_CONTRATO_AQUI";
const BLOCO_DEPLOY = 0;

const SEPOLIA = {
  chainIdDecimal: 11155111,
  chainIdHex: "0xaa36a7",
  nome: "Sepolia",
  explorer: "https://sepolia.etherscan.io",
};

const CONTRATO_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      }
    ],
    "name": "EventoNaoEncontrado",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "codigo",
        "type": "bytes32"
      }
    ],
    "name": "IngressoInvalido",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "disponivel",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "solicitado",
        "type": "uint256"
      }
    ],
    "name": "IngressosEsgotados",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "esperado",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "enviado",
        "type": "uint256"
      }
    ],
    "name": "ValorIncorreto",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "ingressoId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "comprador",
        "type": "address"
      }
    ],
    "name": "CheckInRealizado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "avaliador",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "positivo",
        "type": "bool"
      }
    ],
    "name": "EventoAvaliado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      }
    ],
    "name": "EventoCancelado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "nome",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "preco",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "capacidade",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "data",
        "type": "uint256"
      }
    ],
    "name": "EventoCriado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      }
    ],
    "name": "EventoEncerrado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "comprador",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "ingressoId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "codigo",
        "type": "bytes32"
      }
    ],
    "name": "IngressoComprado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "ingressoId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "comprador",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valor",
        "type": "uint256"
      }
    ],
    "name": "Reembolsado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valor",
        "type": "uint256"
      }
    ],
    "name": "Saque",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "MAX_POR_COMPRA",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "NOME_PLATAFORMA",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "ingressoId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "positivo",
        "type": "bool"
      }
    ],
    "name": "avaliarEvento",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "avaliou",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "preco",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "quantidade",
        "type": "uint256"
      }
    ],
    "name": "calcularTotal",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      }
    ],
    "name": "cancelarEvento",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "quantidade",
        "type": "uint256"
      }
    ],
    "name": "comprarIngresso",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "nome",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "preco",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "capacidade",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "data",
        "type": "uint256"
      }
    ],
    "name": "criarEvento",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dono",
    "outputs": [
      {
        "internalType": "address payable",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      }
    ],
    "name": "encerrarEvento",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "eventos",
    "outputs": [
      {
        "internalType": "string",
        "name": "nome",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "preco",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "capacidade",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "vendidos",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "data",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "arrecadado",
        "type": "uint256"
      },
      {
        "internalType": "int256",
        "name": "saldoAvaliacoes",
        "type": "int256"
      },
      {
        "internalType": "enum VendaDeIngressos.StatusEvento",
        "name": "status",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "codigo",
        "type": "bytes32"
      }
    ],
    "name": "fazerCheckIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "ingressoPorCodigo",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "ingressos",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "comprador",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "codigo",
        "type": "bytes32"
      },
      {
        "internalType": "enum VendaDeIngressos.StatusIngresso",
        "name": "status",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      }
    ],
    "name": "ingressosRestantes",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "meusIngressos",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "ingressoId",
        "type": "uint256"
      }
    ],
    "name": "pedirReembolso",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "eventoId",
        "type": "uint256"
      }
    ],
    "name": "sacar",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalEventos",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalIngressos",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
