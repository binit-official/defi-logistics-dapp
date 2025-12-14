// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Staking {
    IERC20 public stakingToken;
    uint256 public constant REWARD_RATE = 1e18; // 1 Token per second

    mapping(address => uint256) public balances;
    
    // New Mappings for Rewards
    mapping(address => uint256) public rewards;
    mapping(address => uint256) public lastUpdateTime;

    constructor(address _tokenAddress) {
        stakingToken = IERC20(_tokenAddress);
    }

    // A "modifier" checks logic before running a function
    modifier updateReward(address account) {
        // 1. Calculate pending reward based on time passed
        uint256 timePassed = block.timestamp - lastUpdateTime[account];
        uint256 earned = timePassed * REWARD_RATE;

        // 2. If they have a balance, add the reward
        if (balances[account] > 0) {
            rewards[account] += earned;
        }

        // 3. Reset the timer
        lastUpdateTime[account] = block.timestamp;
        _;
    }

    function stake(uint256 amount) external updateReward(msg.sender) {
        stakingToken.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;
    }

    function withdraw(uint256 amount) external updateReward(msg.sender) {
        require(balances[msg.sender] >= amount, "Insufficient funds");
        balances[msg.sender] -= amount;
        stakingToken.transfer(msg.sender, amount);
    }

    function claimReward() external updateReward(msg.sender) {
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards to claim");

        rewards[msg.sender] = 0;
        stakingToken.transfer(msg.sender, reward);
    }
}