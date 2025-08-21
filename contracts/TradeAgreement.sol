// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TradeAgreement {
    address public importer;
    address public exporter;
    uint256 public amount;
    bool public importerApproved;
    bool public exporterApproved;

    constructor(address _exporter, uint256 _amount) payable {
        importer = msg.sender;
        exporter = _exporter;
        amount = _amount;
    }

    function approveAsImporter() external {
        require(msg.sender == importer, "Only importer can approve");
        importerApproved = true;
    }

    function approveAsExporter() external {
        require(msg.sender == exporter, "Only exporter can approve");
        exporterApproved = true;
    }

    function finalize() external {
        require(importerApproved && exporterApproved, "Both must approve");
        payable(exporter).transfer(amount);
    }
}
