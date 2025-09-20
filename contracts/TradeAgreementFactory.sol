// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TradeAgreement.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TradeAgreementFactory is AccessControl {
    address[] public deployedContracts;
    address public registry;

    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    event ContractDeployed(
        address indexed contractAddress,
        address importer,
        uint256 importerDocId,
        address exporter,
        uint256 exporterDocId,
        uint256 requiredAmount,
        address token
    );

    constructor(address _registry) {
        require(_registry != address(0), "Registry zero");
        registry = _registry;
        
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function deployTradeAgreement(
        address _importer,
        address _exporter,
        uint256 _requiredAmount,
        uint256 _importerDocId,
        uint256 _exporterDocId,
        address _token
    ) external onlyRole(ADMIN_ROLE) returns (address) {
        require(_importer != address(0) && _exporter != address(0), "Party zero");

        // Deploy TradeAgreement with factory admin as admin
        TradeAgreement newContract = new TradeAgreement(
            msg.sender,
            _importer,
            _exporter,
            _requiredAmount,
            registry,
            _importerDocId,
            _exporterDocId,
            _token
        );

        deployedContracts.push(address(newContract));

        emit ContractDeployed(
            address(newContract),
            _importer,
            _importerDocId,
            _exporter,
            _exporterDocId,
            _requiredAmount,
            _token
        );

        return address(newContract);
    }

    function getDeployedContracts() external view returns (address[] memory) {
        return deployedContracts;
    }
}
