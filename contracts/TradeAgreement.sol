// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDocumentRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract TradeAgreement {
    IDocumentRegistry public registry;
    address public importer;
    address public exporter;
    uint256 public importerDocId;
    uint256 public exporterDocId;
    uint256 public requiredAmount;
    uint256 public totalDeposited;
    bool public importerApproved;
    bool public exporterApproved;

    event Deposit(address indexed from, uint256 amount);
    event Approved(address indexed by);
    event Finalized(address indexed to, uint256 amount);

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
    }

    function deposit() external payable {
        require(msg.value > 0, "No ETH sent");
        totalDeposited += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    function approveAsImporter() external {
        require(msg.sender == importer, "Only importer can approve");
        importerApproved = true;
        emit Approved(msg.sender);
    }

    function approveAsExporter() external {
        require(msg.sender == exporter, "Only exporter can approve");
        exporterApproved = true;
        emit Approved(msg.sender);
    }

    function finalize() external {
        require(importerApproved && exporterApproved, "Both must approve");
        require(totalDeposited >= requiredAmount, "Not enough funds deposited");
        payable(exporter).transfer(requiredAmount);
        emit Finalized(exporter, requiredAmount);
    }
}
