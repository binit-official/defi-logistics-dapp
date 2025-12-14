import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyDefi Contract", function () {
  it("Should deploy and verify the name", async function () {
    // 1. Get the Contract Factory
    const MyDefi = await ethers.getContractFactory("MyDefi");
    
    // 2. Deploy the Contract
    const myDefi = await MyDefi.deploy();
    
    // 3. Wait for deployment to finish
    await myDefi.waitForDeployment();

    // 4. Verify the variable 'name' is correct
    expect(await myDefi.name()).to.equal("My DeFi Project");
  });

  it("Should allow deposits and update balance", async function () {
    const MyDefi = await ethers.getContractFactory("MyDefi");
    const myDefi = await MyDefi.deploy();
    await myDefi.waitForDeployment();

    // Check initial balance is 0
    expect(await myDefi.getBalance()).to.equal(0);

    // Deposit 100 units
    await myDefi.deposit(100);

    // Check new balance is 100
    expect(await myDefi.getBalance()).to.equal(100);
  });
});