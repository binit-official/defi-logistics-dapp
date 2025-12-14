// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract MyDefi {
    string public name = "My DeFi Project";
    uint256 public balance;

    function deposit(uint256 amount) public {
        balance += amount;
    }

    function getBalance() public view returns (uint256) {
        return balance;
    }
}