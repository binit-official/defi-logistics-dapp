import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Logistics Contract...");

  // 1. Get the Contract Factory
  const Logistics = await ethers.getContractFactory("Logistics");

  // 2. Deploy it
  const logistics = await Logistics.deploy();
  await logistics.waitForDeployment();

  // 3. Print the Address (Copy this when it appears!)
  console.log(`Logistics deployed to: ${logistics.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});