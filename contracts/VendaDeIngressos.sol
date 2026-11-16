// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title VendaDeIngressos
/// @notice Venda de ingressos em ETH com check-in por código, reembolso garantido
///         em caso de cancelamento e avaliação do evento por quem compareceu.
/// @dev Atores: o dono (organizador) e os compradores.
contract VendaDeIngressos {
    // =================================================================
    // [Recurso: StructsEEnums]
    // =================================================================

    /// Ciclo de vida de um evento.
    enum StatusEvento {
        Ativo, // vendendo ingressos e fazendo check-in
        Cancelado, // compradores podem pedir reembolso
        Encerrado // dono pode sacar e participantes podem avaliar
    }

    /// Ciclo de vida de um ingresso.
    enum StatusIngresso {
        Valido, // comprado e ainda não utilizado
        Usado, // check-in realizado
        Reembolsado // ETH devolvido ao comprador
    }

    struct Evento {
        string nome;
        uint256 preco; // preço unitário em wei
        uint256 capacidade; // total de ingressos à venda
        uint256 vendidos;
        uint256 data; // timestamp limite para a venda
        uint256 arrecadado; // ETH deste evento guardado no contrato
        int256 saldoAvaliacoes; // likes menos dislikes (pode ser negativo)
        StatusEvento status;
    }

    struct Ingresso {
        uint256 eventoId;
        address comprador;
        bytes32 codigo; // código apresentado na entrada
        StatusIngresso status;
    }

    // =================================================================
    // [Recurso: TiposDeDados]
    // =================================================================

    /// @notice Organizador da plataforma, definido no deploy (immutable) e apto a receber ETH (payable).
    address payable public immutable dono;

    /// @notice Máximo de ingressos por compra; também limita o laço de emissão.
    uint256 public constant MAX_POR_COMPRA = 5;

    /// @notice Nome exibido no frontend.
    string public constant NOME_PLATAFORMA = "IngressoChain";

    // =================================================================
    // [Recurso: ArraysEMappings]
    // =================================================================

    /// Array dinâmico com todos os eventos (o índice é o id do evento).
    Evento[] public eventos;

    /// Array dinâmico com todos os ingressos (o índice é o id do ingresso).
    Ingresso[] public ingressos;

    /// Mapping simples: código do ingresso => id do ingresso.
    mapping(bytes32 => uint256) public ingressoPorCodigo;

    /// Mapping para array: comprador => ids dos seus ingressos.
    mapping(address => uint256[]) private ingressosDe;

    /// Mapping aninhado: id do evento => conta => já avaliou?
    mapping(uint256 => mapping(address => bool)) public avaliou;

    // =================================================================
    // [Recurso: EventosEErros]
    // =================================================================

    event EventoCriado(uint256 indexed eventoId, string nome, uint256 preco, uint256 capacidade, uint256 data);
    event IngressoComprado(uint256 indexed eventoId, address indexed comprador, uint256 ingressoId, bytes32 codigo);
    event CheckInRealizado(uint256 indexed ingressoId, uint256 indexed eventoId, address indexed comprador);
    event EventoCancelado(uint256 indexed eventoId);
    event EventoEncerrado(uint256 indexed eventoId);
    event Reembolsado(uint256 indexed ingressoId, address indexed comprador, uint256 valor);
    event EventoAvaliado(uint256 indexed eventoId, address indexed avaliador, bool positivo);
    event Saque(uint256 indexed eventoId, uint256 valor);

    error IngressosEsgotados(uint256 disponivel, uint256 solicitado);
    error ValorIncorreto(uint256 esperado, uint256 enviado);
    error EventoNaoEncontrado(uint256 eventoId);
    error IngressoInvalido(bytes32 codigo);

    // =================================================================
    // [Recurso: Modificadores]
    // =================================================================

    /// Restringe a função ao organizador (controle de acesso).
    modifier apenasDono() {
        require(msg.sender == dono, unicode"Acesso negado: apenas o dono");
        _;
    }

    /// Garante que o id informado corresponde a um evento cadastrado.
    modifier eventoExiste(uint256 eventoId) {
        if (eventoId >= eventos.length) revert EventoNaoEncontrado(eventoId);
        _;
    }

    /// Garante que o evento está no estado esperado.
    modifier noEstado(uint256 eventoId, StatusEvento esperado) {
        require(eventos[eventoId].status == esperado, unicode"Ação não permitida no estado atual do evento");
        _;
    }

    // =================================================================
    // [Recurso: Funcoes]
    // =================================================================

    /// @notice Define quem fez o deploy como dono da plataforma.
    constructor() {
        dono = payable(msg.sender);
    }

    // ------------------------- Funções do dono -------------------------

    /// @notice Cadastra um novo evento.
    /// @param nome Nome do evento.
    /// @param preco Preço de cada ingresso, em wei.
    /// @param capacidade Quantidade total de ingressos.
    /// @param data Timestamp (em segundos) até quando os ingressos podem ser vendidos.
    function criarEvento(string calldata nome, uint256 preco, uint256 capacidade, uint256 data)
        external
        apenasDono
    {
        // [Recurso: EstruturasDeControle] validações com require
        require(bytes(nome).length > 0, unicode"Nome obrigatório");
        require(preco > 0, unicode"Preço deve ser maior que zero");
        require(capacidade > 0, "Capacidade deve ser maior que zero");
        require(data > block.timestamp, "A data deve estar no futuro");

        eventos.push(
            Evento({
                nome: nome,
                preco: preco,
                capacidade: capacidade,
                vendidos: 0,
                data: data,
                arrecadado: 0,
                saldoAvaliacoes: 0,
                status: StatusEvento.Ativo
            })
        );

        emit EventoCriado(eventos.length - 1, nome, preco, capacidade, data);
    }

    /// @notice Valida um ingresso na entrada do evento.
    /// @param codigo Código do ingresso apresentado pelo participante.
    function fazerCheckIn(bytes32 codigo) external apenasDono {
        uint256 ingressoId = ingressoPorCodigo[codigo];

        // O mapping devolve 0 para códigos inexistentes, então conferimos o código guardado.
        if (ingressoId >= ingressos.length || ingressos[ingressoId].codigo != codigo) {
            revert IngressoInvalido(codigo);
        }

        Ingresso storage ingresso = ingressos[ingressoId];
        require(ingresso.status == StatusIngresso.Valido, unicode"Ingresso já usado ou reembolsado");
        require(eventos[ingresso.eventoId].status == StatusEvento.Ativo, unicode"Evento não está ativo");

        ingresso.status = StatusIngresso.Usado;
        emit CheckInRealizado(ingressoId, ingresso.eventoId, ingresso.comprador);
    }

    /// @notice Cancela um evento ativo; a partir daí os compradores podem pedir reembolso.
    /// @param eventoId Id do evento.
    function cancelarEvento(uint256 eventoId)
        external
        apenasDono
        eventoExiste(eventoId)
        noEstado(eventoId, StatusEvento.Ativo)
    {
        eventos[eventoId].status = StatusEvento.Cancelado;
        emit EventoCancelado(eventoId);
    }

    /// @notice Encerra um evento ativo; libera o saque e as avaliações.
    /// @param eventoId Id do evento.
    function encerrarEvento(uint256 eventoId)
        external
        apenasDono
        eventoExiste(eventoId)
        noEstado(eventoId, StatusEvento.Ativo)
    {
        eventos[eventoId].status = StatusEvento.Encerrado;
        emit EventoEncerrado(eventoId);
    }

    /// @notice Transfere ao dono o valor arrecadado por um evento encerrado.
    /// @param eventoId Id do evento.
    function sacar(uint256 eventoId)
        external
        apenasDono
        eventoExiste(eventoId)
        noEstado(eventoId, StatusEvento.Encerrado)
    {
        Evento storage evento = eventos[eventoId];
        uint256 valor = evento.arrecadado;
        require(valor > 0, "Nada a sacar");

        // Checks-Effects-Interactions: zera o saldo ANTES de enviar o ETH.
        evento.arrecadado = 0;

        (bool ok, ) = dono.call{value: valor}("");
        require(ok, "Falha no envio");

        emit Saque(eventoId, valor);
    }

    // ----------------------- Funções do comprador ----------------------

    /// @notice Compra ingressos para um evento ativo, pagando em ETH.
    /// @param eventoId Id do evento.
    /// @param quantidade Quantidade de ingressos (1 a MAX_POR_COMPRA).
    function comprarIngresso(uint256 eventoId, uint256 quantidade)
        external
        payable
        eventoExiste(eventoId)
        noEstado(eventoId, StatusEvento.Ativo)
    {
        Evento storage evento = eventos[eventoId];

        require(quantidade > 0 && quantidade <= MAX_POR_COMPRA, "Quantidade deve ser de 1 a 5");
        require(block.timestamp < evento.data, "Vendas encerradas para este evento");

        uint256 restantes = evento.capacidade - evento.vendidos;
        if (quantidade > restantes) revert IngressosEsgotados(restantes, quantidade);

        uint256 total = calcularTotal(evento.preco, quantidade);
        if (msg.value != total) revert ValorIncorreto(total, msg.value);

        evento.vendidos += quantidade;
        evento.arrecadado += msg.value;

        // [Recurso: EstruturasDeControle] laço com limite controlado (no máximo MAX_POR_COMPRA voltas)
        for (uint256 i = 0; i < quantidade; i++) {
            _emitirIngresso(eventoId, msg.sender);
        }
    }

    /// @notice Devolve o valor de um ingresso válido de um evento cancelado.
    /// @param ingressoId Id do ingresso.
    function pedirReembolso(uint256 ingressoId) external {
        require(ingressoId < ingressos.length, unicode"Ingresso não existe");

        Ingresso storage ingresso = ingressos[ingressoId];
        Evento storage evento = eventos[ingresso.eventoId];

        require(ingresso.comprador == msg.sender, unicode"Você não é o dono deste ingresso");
        require(evento.status == StatusEvento.Cancelado, unicode"Evento não foi cancelado");
        require(ingresso.status == StatusIngresso.Valido, unicode"Ingresso já usado ou reembolsado");

        // Checks-Effects-Interactions: atualiza o estado ANTES de enviar o ETH.
        ingresso.status = StatusIngresso.Reembolsado;
        evento.arrecadado -= evento.preco;

        address payable comprador = payable(msg.sender);
        (bool ok, ) = comprador.call{value: evento.preco}("");
        require(ok, "Falha no reembolso");

        emit Reembolsado(ingressoId, msg.sender, evento.preco);
    }

    /// @notice Avalia um evento encerrado (like ou dislike), uma vez por conta.
    /// @param eventoId Id do evento.
    /// @param ingressoId Id de um ingresso do avaliador que passou pelo check-in.
    /// @param positivo true para like, false para dislike.
    function avaliarEvento(uint256 eventoId, uint256 ingressoId, bool positivo)
        external
        eventoExiste(eventoId)
        noEstado(eventoId, StatusEvento.Encerrado)
    {
        require(ingressoId < ingressos.length, unicode"Ingresso não existe");

        Ingresso storage ingresso = ingressos[ingressoId];
        require(ingresso.comprador == msg.sender, unicode"Você não é o dono deste ingresso");
        require(ingresso.eventoId == eventoId, unicode"Ingresso não é deste evento");
        require(ingresso.status == StatusIngresso.Usado, unicode"Só quem fez check-in pode avaliar");
        require(!avaliou[eventoId][msg.sender], unicode"Você já avaliou este evento");

        avaliou[eventoId][msg.sender] = true;

        // [Recurso: EstruturasDeControle] if/else
        if (positivo) {
            eventos[eventoId].saldoAvaliacoes += 1;
        } else {
            eventos[eventoId].saldoAvaliacoes -= 1;
        }

        emit EventoAvaliado(eventoId, msg.sender, positivo);
    }

    // ------------------------- Consultas -------------------------------

    /// @notice Calcula o valor total de uma compra.
    /// @param preco Preço unitário em wei.
    /// @param quantidade Quantidade de ingressos.
    /// @return Valor total em wei.
    function calcularTotal(uint256 preco, uint256 quantidade) public pure returns (uint256) {
        return preco * quantidade;
    }

    /// @notice Quantidade de ingressos ainda disponíveis em um evento.
    /// @param eventoId Id do evento.
    function ingressosRestantes(uint256 eventoId) public view eventoExiste(eventoId) returns (uint256) {
        return eventos[eventoId].capacidade - eventos[eventoId].vendidos;
    }

    /// @notice Quantidade de eventos cadastrados.
    function totalEventos() external view returns (uint256) {
        return eventos.length;
    }

    /// @notice Quantidade de ingressos emitidos.
    function totalIngressos() external view returns (uint256) {
        return ingressos.length;
    }

    /// @notice Ids dos ingressos da conta que chama a função.
    function meusIngressos() external view returns (uint256[] memory) {
        return ingressosDe[msg.sender];
    }

    // ------------------------- Auxiliares ------------------------------

    /// @dev Gera um código único a partir do id, do comprador e do momento da compra.
    function _gerarCodigo(uint256 ingressoId, address comprador) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(ingressoId, comprador, block.timestamp));
    }

    /// @dev Cria um ingresso, registra nos mappings e emite o evento de compra.
    function _emitirIngresso(uint256 eventoId, address comprador) private {
        uint256 ingressoId = ingressos.length;
        bytes32 codigo = _gerarCodigo(ingressoId, comprador);

        ingressos.push(
            Ingresso({eventoId: eventoId, comprador: comprador, codigo: codigo, status: StatusIngresso.Valido})
        );
        ingressoPorCodigo[codigo] = ingressoId;
        ingressosDe[comprador].push(ingressoId);

        emit IngressoComprado(eventoId, comprador, ingressoId, codigo);
    }
}
