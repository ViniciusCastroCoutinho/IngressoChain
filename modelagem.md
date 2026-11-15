# Modelagem — Blockchain de Prescrições (dApp Ethereum)

## 1. Descrição do problema

O sistema combate a falsificação e a reutilização de prescrições médicas por meio de uma aplicação descentralizada na Ethereum.

Médicos autorizados podem emitir prescrições digitais, cujos identificadores e hashes dos documentos são registrados em um smart contract. Farmácias autorizadas podem consultar e validar essas prescrições.

Uma prescrição somente pode ser validada uma vez, independentemente da farmácia que realizou a primeira validação.

Os documentos PDF permanecem armazenados externamente, no Google Drive.

## 2. Atores

- **Administrador:** gerencia as autorizações de médicos e farmácias.
- **Médico:** emite prescrições.
- **Paciente:** recebe e apresenta a prescrição.
- **Farmácia:** consulta e valida prescrições.

## 3. Entidades

### Prescription
- id: bytes32
- doctor: address
- patientCommitment: bytes32
- documentHash: bytes32
- createdAt: uint256
- validatedAt: uint256
- pharmacy: address
- status: PrescriptionStatus

### PrescriptionStatus
- Nonexistent
- Issued
- Validated
- Revoked

### Autorizações
- authorizedDoctors: mapping(address => bool)
- authorizedPharmacies: mapping(address => bool)

### Histórico
- prescriptionIds: bytes32[]
- pharmacyHistory: mapping(address => mapping(bytes32 => bool))

## 4. Regras de negócio

1. Somente o administrador pode autorizar e revogar médicos e farmácias.
2. Somente médicos autorizados podem emitir prescrições.
3. Uma prescrição não pode ter identificador duplicado.
4. Uma prescrição deve possuir um hash de documento válido.
5. Somente farmácias autorizadas podem validar prescrições.
6. A prescrição precisa existir para ser validada.
7. Uma prescrição somente pode ser validada uma vez.
8. Prescrições revogadas não podem ser validadas.
9. Somente o administrador pode retirar as taxas acumuladas no contrato.

## 5. Funções

- authorizeDoctor()
- revokeDoctor()
- authorizePharmacy()
- revokePharmacy()
- issuePrescription()
- validatePrescription()
- revokePrescription()
- getPrescription()
- getPrescriptionIds()
- withdrawFees()

A função validatePrescription() será payable e cobrará uma taxa de demonstração em ETH de teste.

## 6. Eventos

- PrescriptionIssued
- PrescriptionValidated
- PrescriptionRevoked
- DoctorAuthorizationChanged
- PharmacyAuthorizationChanged

## 7. Erros

- UnauthorizedDoctor
- UnauthorizedPharmacy
- PrescriptionAlreadyExists
- PrescriptionNotFound
- PrescriptionAlreadyValidated
- PrescriptionRevokedError
- InvalidDocumentHash
- InsufficientFee

## 8. Arquitetura

- Frontend: HTML, CSS e JavaScript.
- Comunicação: Web3.js.
- Carteira: MetaMask.
- Smart contract: Solidity.
- Blockchain: Ethereum Sepolia.
- Armazenamento dos PDFs: Google Drive.
- Hospedagem: Vercel.

## 9. Privacidade

Dados pessoais e conteúdo das receitas não serão armazenados diretamente na blockchain. Serão utilizados identificadores e compromissos criptográficos para representar os dados necessários à validação.
