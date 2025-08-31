// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TradeAgreement.sol";

contract TradeAgreementFactory {
    address[] public deployedContracts;
    address public registry; // alamat DocumentRegistry

    event ContractDeployed(
        address indexed contractAddress,
        address importer,
        uint256 importerDocId,
        address exporter,
        uint256 exporterDocId,
        uint256 requiredAmount
    );

    constructor(address _registry) {
        registry = _registry;
    }

    function deployTradeAgreement(
        address _importer,
        address _exporter,
        uint256 _requiredAmount,
        uint256 _importerDocId,
        uint256 _exporterDocId
    ) external returns (address) {
        TradeAgreement newContract = new TradeAgreement(
            _importer,
            _exporter,
            _requiredAmount,
            registry,
            _importerDocId,
            _exporterDocId
        );

        deployedContracts.push(address(newContract));

        emit ContractDeployed(
            address(newContract),
            _importer,
            _importerDocId,
            _exporter,
            _exporterDocId,
            _requiredAmount
        );

        return address(newContract);
    }

    function getDeployedContracts() external view returns (address[] memory) {
        return deployedContracts;
    }
}
