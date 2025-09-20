// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract KYCRegistry is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    // Mapping hash -> tokenId (supaya dokumen unik)
    mapping(string => uint256) public hashToTokenId;

    // Mapping untuk akun yang diperbolehkan mint (importir & eksportir)
    mapping(address => bool) public approvedMinters;

    // ---------------- Events ----------------
    event DocumentVerified(address indexed owner, uint256 tokenId, string fileHash);
    event DocumentRevoked(uint256 tokenId);

    // v5: Ownable wajib initialOwner
    constructor(address initialOwner) ERC721("VerifiedDocument", "VDOC") Ownable(initialOwner) {}

    // ---------------- Minter Management ----------------
    function addMinter(address minter) external onlyOwner {
        approvedMinters[minter] = true;
    }

    function removeMinter(address minter) external onlyOwner {
        approvedMinters[minter] = false;
    }

    modifier onlyApprovedMinter() {
        require(approvedMinters[msg.sender], "Not an approved minter");
        _;
    }

    // ---------------- Mint ----------------
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

    // ---------------- Revoke ----------------
    function revokeDocument(uint256 tokenId) external onlyOwner {
        require(ERC721.ownerOf(tokenId) != address(0), "Token does not exist");
        
        // Hapus mapping hash -> tokenId
        string memory fileHash;
        // loop untuk cari hash yang sesuai (karena mapping hash -> tokenId tidak ada reverse mapping)
        // minimal untuk simple contract
        for (uint256 i = 1; i <= nextTokenId; i++) {
            if (hashToTokenId[fileHash] == tokenId) {
                delete hashToTokenId[fileHash];
                break;
            }
        }

        _burn(tokenId);
        emit DocumentRevoked(tokenId);
    }

    // ---------------- View Helpers ----------------
    function getTokenIdByHash(string memory fileHash) external view returns (uint256) {
        return hashToTokenId[fileHash];
    }

    function isMinter(address addr) external view returns (bool) {
        return approvedMinters[addr];
    }
}
