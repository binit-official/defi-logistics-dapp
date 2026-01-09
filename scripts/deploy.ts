import { ethers, artifacts } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Deploying Logistics Contract...");

  // 1. Get the Contract Factory
  const Logistics = await ethers.getContractFactory("Logistics");

  // 2. Deploy it
  const logistics = await Logistics.deploy();
  await logistics.waitForDeployment();

  // 3. Get Address
  const address = await logistics.getAddress();
  console.log(`Logistics deployed to: ${address}`);

  // --- AUTOMATIC FRONTEND UPDATE ---
  // This writes the new address and ABI directly to your frontend file
  const frontendConstantsPath = path.join(__dirname, "../frontend/src/constants.ts");
  
  // Get the ABI from the artifacts
  const artifact = await artifacts.readArtifact("Logistics");
  
  const fileContent = `export const LOGISTICS_ADDRESS = "${address}";

export const LOGISTICS_ABI = ${JSON.stringify(artifact.abi, null, 2)};
`;

  fs.writeFileSync(frontendConstantsPath, fileContent);
  console.log(`✅ Frontend constants updated automatically at: ${frontendConstantsPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});