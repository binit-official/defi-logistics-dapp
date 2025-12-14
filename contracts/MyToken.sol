// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {
    // Constructor runs once when deployed
    constructor() ERC20("DefiToken", "DFT") {
        // Mint 1,000,000 tokens to the deployer (you)
        // We multiply by 10^18 because tokens have 18 decimals like ETH
        _mint(msg.sender, 1000000 * 10 ** 18);
    }
}