// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TradeAgreement.sol";

contract TradeAgreementFactory {
    address[] public deployedContracts;

    event ContractDeployed(
        address indexed contractAddress,
        address importer,
        address exporter,
        uint256 requiredAmount
    );

    function deployTradeAgreement(address _importer, address _exporter, uint256 _requiredAmount) external returns (address) {
        TradeAgreement newContract = new TradeAgreement(_importer, _exporter, _requiredAmount);
        deployedContracts.push(address(newContract));
        emit ContractDeployed(address(newContract), _importer, _exporter, _requiredAmount);
        return address(newContract);
    }

    function getDeployedContracts() external view returns (address[] memory) {
        return deployedContracts;
    }
}
