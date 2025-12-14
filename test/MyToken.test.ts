import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyToken Contract", function () {
  it("Should assign the total supply of tokens to the owner", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy the Token
    const MyToken = await ethers.getContractFactory("MyToken");
    const myToken = await MyToken.deploy();
    await myToken.waitForDeployment();

    // Check the owner's balance
    const ownerBalance = await myToken.balanceOf(owner.address);
    
    // Check total supply
    const totalSupply = await myToken.totalSupply();

    // They should be equal
    expect(totalSupply).to.equal(ownerBalance);
  });
});