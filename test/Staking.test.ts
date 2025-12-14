import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Staking System", function () {
  // We define a fixture to reuse the same setup in every test.
  async function deployStakingFixture() {
    const [owner, otherAccount] = await ethers.getSigners();

    // 1. Deploy Token
    const MyToken = await ethers.getContractFactory("MyToken");
    const token = await MyToken.deploy();
    await token.waitForDeployment();

    // 2. Deploy Staking
    const Staking = await ethers.getContractFactory("Staking");
    const staking = await Staking.deploy(token.target);
    await staking.waitForDeployment();

    return { token, staking, owner, otherAccount };
  }

  it("Should allow a user to stake tokens", async function () {
    const { token, staking, owner } = await loadFixture(deployStakingFixture);
    
    const stakeAmount = ethers.parseEther("100");

    // Approve and Stake
    await token.approve(staking.target, stakeAmount);
    await staking.stake(stakeAmount);

    // Verify balances
    expect(await token.balanceOf(staking.target)).to.equal(stakeAmount);
    expect(await staking.balances(owner.address)).to.equal(stakeAmount);
  });

  it("Should allow a user to withdraw tokens", async function () {
    const { token, staking, owner } = await loadFixture(deployStakingFixture);
    const stakeAmount = ethers.parseEther("100");
    const withdrawAmount = ethers.parseEther("50");

    // 1. Setup: Stake 100 first
    await token.approve(staking.target, stakeAmount);
    await staking.stake(stakeAmount);

    // 2. Withdraw 50
    await staking.withdraw(withdrawAmount);

    // 3. Verify: Contract should have 50 left (100 - 50)
    expect(await token.balanceOf(staking.target)).to.equal(ethers.parseEther("50"));
    
    // 4. Verify: Internal balance mapping should update
    expect(await staking.balances(owner.address)).to.equal(ethers.parseEther("50"));
  });

  it("Should fail if user tries to withdraw more than they have", async function () {
    const { token, staking } = await loadFixture(deployStakingFixture);
    const stakeAmount = ethers.parseEther("100");

    await token.approve(staking.target, stakeAmount);
    await staking.stake(stakeAmount);

    // Try to withdraw 200 (should fail)
    await expect(staking.withdraw(ethers.parseEther("200")))
      .to.be.revertedWith("Insufficient funds");
  });

  it("Should calculate rewards after time passes", async function () {
    const { token, staking, owner } = await loadFixture(deployStakingFixture);
    const stakeAmount = ethers.parseEther("100");

    // 1. Send 1000 tokens to contract to fund rewards
    // Owner Balance: 1,000,000 -> 999,000
    await token.transfer(staking.target, ethers.parseEther("1000"));

    // 2. Stake 100 tokens
    // Owner Balance: 999,000 -> 998,900
    await token.approve(staking.target, stakeAmount);
    await staking.stake(stakeAmount);

    // 3. Fast Forward time by 10 seconds
    await time.increase(10); 

    // 4. User claims reward
    await staking.claimReward();

    // 5. Check balance
    // Expected: 998,900 (Base) + Rewards (approx 10-11)
    const finalBalance = await token.balanceOf(owner.address);
    const expectedBase = ethers.parseEther("998900");
    
    expect(finalBalance).to.be.gt(expectedBase);
  });
});