// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TradeAgreement {
    address public importer;
    address public exporter;
    uint256 public requiredAmount;
    uint256 public totalDeposited;
    bool public importerApproved;
    bool public exporterApproved;

    event Deposit(address indexed from, uint256 amount);
    event Approved(address indexed by);
    event Finalized(address indexed to, uint256 amount);

    constructor(address _exporter) {
        importer = msg.sender;
        exporter = _exporter;
        requiredAmount = 0;
    }

    function setRequiredAmount(uint256 _amount) external {
        require(msg.sender == importer, "Only importer can set amount");
        requiredAmount = _amount;
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
