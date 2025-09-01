// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DocumentRegistry is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    // Mapping hash -> tokenId (supaya dokumen unik)
    mapping(string => uint256) public hashToTokenId;

    // Mapping untuk akun yang diperbolehkan mint (importir & eksportir)
    mapping(address => bool) public approvedMinters;

    event DocumentVerified(address indexed owner, uint256 tokenId, string fileHash);

    // v5: Ownable wajib initialOwner
    constructor(address initialOwner) ERC721("VerifiedDocument", "VDOC") Ownable(initialOwner) {}

    // --- Owner bisa menambahkan minter
    function addMinter(address minter) external onlyOwner {
        approvedMinters[minter] = true;
    }

    function removeMinter(address minter) external onlyOwner {
        approvedMinters[minter] = false;
    }

    // --- Modifier untuk akun yang diperbolehkan
    modifier onlyApprovedMinter() {
        require(approvedMinters[msg.sender], "Not an approved minter");
        _;
    }

    // --- Mint dokumen, bisa dilakukan oleh importir atau eksportir
    function verifyAndMint(
        address to,
        string memory fileHash,
        string memory tokenURI
    ) external onlyApprovedMinter returns (uint256) {
        require(hashToTokenId[fileHash] == 0, "Document already verified");

        nextTokenId++;
        uint256 newTokenId = nextTokenId;

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        hashToTokenId[fileHash] = newTokenId;

        emit DocumentVerified(to, newTokenId, fileHash);

        return newTokenId;
    }

    function getTokenIdByHash(string memory fileHash) external view returns (uint256) {
        return hashToTokenId[fileHash];
    }

    function isMinter(address addr) external view returns (bool) {
        return approvedMinters[addr];
    }
}
