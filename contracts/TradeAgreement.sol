// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDocumentRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract TradeAgreement {
    enum Stage {
        Draft,
        SignedByImporter,
        SignedByExporter,
        SignedByBoth,
        Deposited,
        Shipping,
        Completed,
        Cancelled
    }

    IDocumentRegistry public registry;
    address public importer;
    address public exporter;
    uint256 public importerDocId;
    uint256 public exporterDocId;
    uint256 public requiredAmount;
    uint256 public totalDeposited;

    bool public importerSigned;
    bool public exporterSigned;
    Stage public currentStage;

    event Deposit(address indexed from, uint256 amount);
    event Approved(address indexed by);
    event Finalized(address indexed to, uint256 amount);
    event StageChanged(Stage oldStage, Stage newStage, address by, uint256 timestamp);
    event Cancelled(address by, string reason);

    modifier onlyParty() {
        require(msg.sender == importer || msg.sender == exporter, "Not a party");
        _;
    }

    modifier onlyImporter() {
        require(msg.sender == importer, "Only importer");
        _;
    }

    modifier onlyExporter() {
        require(msg.sender == exporter, "Only exporter");
        _;
    }

    modifier atStage(Stage s) {
        require(currentStage == s, "Invalid stage");
        _;
    }

    constructor(
        address _importer,
        address _exporter,
        uint256 _requiredAmount,
        address _registry,
        uint256 _importerDocId,
        uint256 _exporterDocId
    ) {
        importer = _importer;
        exporter = _exporter;
        registry = IDocumentRegistry(_registry);

        require(registry.ownerOf(_importerDocId) == _importer, "Importer doc not valid");
        require(registry.ownerOf(_exporterDocId) == _exporter, "Exporter doc not valid");

        importerDocId = _importerDocId;
        exporterDocId = _exporterDocId;
        requiredAmount = _requiredAmount;

        currentStage = Stage.Draft;
    }

    function sign() external onlyParty {
        if (msg.sender == importer) {
            require(!importerSigned, "Importer already signed");
            importerSigned = true;
        } else {
            require(!exporterSigned, "Exporter already signed");
            exporterSigned = true;
        }

        emit Approved(msg.sender);

        // Update stage
        if (importerSigned && exporterSigned) {
            _setStage(Stage.SignedByBoth);
        } else if (importerSigned) {
            _setStage(Stage.SignedByImporter);
        } else if (exporterSigned) {
            _setStage(Stage.SignedByExporter);
        } else {
            _setStage(Stage.Draft);
        }
    }

    function deposit() external payable atStage(Stage.SignedByBoth) {
        require(msg.value > 0, "No ETH sent");
        totalDeposited += msg.value;
        emit Deposit(msg.sender, msg.value);

        if (totalDeposited >= requiredAmount) {
            _setStage(Stage.Deposited);
        }
    }

    function startShipping() external onlyExporter atStage(Stage.Deposited) {
        _setStage(Stage.Shipping);
    }

    function complete() external onlyImporter atStage(Stage.Shipping) {
        require(totalDeposited >= requiredAmount, "Insufficient funds");
        _setStage(Stage.Completed);

        payable(exporter).transfer(requiredAmount);
        emit Finalized(exporter, requiredAmount);
    }

    function cancel(string calldata reason) external onlyParty {
        require(currentStage != Stage.Completed, "Already completed");
        _setStage(Stage.Cancelled);
        emit Cancelled(msg.sender, reason);

        if (totalDeposited > 0) {
            payable(importer).transfer(totalDeposited);
        }
    }

    // ---- Internal ----
    function _setStage(Stage newStage) internal {
        Stage old = currentStage;
        currentStage = newStage;
        emit StageChanged(old, newStage, msg.sender, block.timestamp);
    }
}
