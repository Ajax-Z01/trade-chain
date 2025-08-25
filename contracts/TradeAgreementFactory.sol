// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./TradeAgreement.sol";

contract TradeAgreementFactory {
    address[] public deployedContracts;

    event ContractDeployed(address indexed contractAddress, address indexed exporter);

    function deployTradeAgreement(address _exporter) external returns (address) {
        TradeAgreement newContract = new TradeAgreement(_exporter);
        deployedContracts.push(address(newContract));
        emit ContractDeployed(address(newContract), _exporter);
        return address(newContract);
    }

    function getDeployedContracts() external view returns (address[] memory) {
        return deployedContracts;
    }
}
