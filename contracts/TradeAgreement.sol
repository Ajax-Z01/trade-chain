// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IDocumentRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract TradeAgreement {
    using SafeERC20 for IERC20;

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
    address public token;

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
        uint256 _exporterDocId,
        address _token
    ) {
        importer = _importer;
        exporter = _exporter;
        registry = IDocumentRegistry(_registry);

        require(registry.ownerOf(_importerDocId) == _importer, "Importer doc not valid");
        require(registry.ownerOf(_exporterDocId) == _exporter, "Exporter doc not valid");

        importerDocId = _importerDocId;
        exporterDocId = _exporterDocId;
        requiredAmount = _requiredAmount;
        token = _token;

        currentStage = Stage.Draft;
    }

    // ------------------ Signing ------------------
    function sign() external onlyParty {
        if (msg.sender == importer) {
            require(!importerSigned, "Importer already signed");
            importerSigned = true;
        } else {
            require(!exporterSigned, "Exporter already signed");
            exporterSigned = true;
        }

        emit Approved(msg.sender);

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

    // ------------------ Deposit ------------------
    function deposit(uint256 _amount) external payable atStage(Stage.SignedByBoth) {
        require(_amount >= requiredAmount, "amount too low");
        
        if (token == address(0)) {
            // ETH
            require(msg.value == _amount, "Incorrect ETH amount");
            totalDeposited += msg.value;
        } else {
            // ERC-20 safe
            IERC20(token).safeTransferFrom(msg.sender, address(this), _amount);
            totalDeposited += _amount;
        }

        emit Deposit(msg.sender, _amount);

        if (totalDeposited >= requiredAmount) {
            _setStage(Stage.Deposited);
        }
    }

    // ------------------ Shipping & Completion ------------------
    function startShipping() external onlyExporter atStage(Stage.Deposited) {
        _setStage(Stage.Shipping);
    }

    function complete() external onlyImporter atStage(Stage.Shipping) {
        require(totalDeposited >= requiredAmount, "Insufficient funds");
        _setStage(Stage.Completed);

        if (token == address(0)) {
            payable(exporter).transfer(requiredAmount);
        } else {
            IERC20(token).safeTransfer(exporter, requiredAmount);
        }

        emit Finalized(exporter, requiredAmount);
    }

    // ------------------ Cancel / Refund ------------------
    function cancel(string calldata reason) external onlyParty {
        require(currentStage != Stage.Completed, "Already completed");
        _setStage(Stage.Cancelled);
        emit Cancelled(msg.sender, reason);

        if (totalDeposited > 0) {
            if (token == address(0)) {
                payable(importer).transfer(totalDeposited);
            } else {
                IERC20(token).safeTransfer(importer, totalDeposited);
            }
        }
    }

    // ------------------ Helpers ------------------
    function balance() external view returns (uint256) {
        if (token == address(0)) return address(this).balance;
        else return IERC20(token).balanceOf(address(this));
    }

    function _setStage(Stage newStage) internal {
        Stage old = currentStage;
        currentStage = newStage;
        emit StageChanged(old, newStage, msg.sender, block.timestamp);
    }
}
