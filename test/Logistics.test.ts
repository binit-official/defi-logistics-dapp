import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Logistics } from "../typechain-types";

describe("Logistics Smart Contract", function () {
  
  async function deployLogisticsFixture() {
    const [sender, receiver, otherAccount] = await ethers.getSigners();

    const LogisticsFactory = await ethers.getContractFactory("Logistics");
    const logistics = await LogisticsFactory.deploy();
    
    // We cast it to 'Logistics' so TypeScript knows about our custom functions
    return { logistics: logistics as unknown as Logistics, sender, receiver, otherAccount };
  }

  it("Should create a shipment with the correct status", async function () {
    const { logistics, sender, receiver } = await loadFixture(deployLogisticsFixture);

    const price = ethers.parseEther("1"); // 1 ETH price

    // Create Shipment (Sender pays 1 ETH)
    await logistics.createShipment(
        receiver.address, 
        Date.now(), 
        100, // Distance
        price, 
        { value: price }
    );

    // Fetch shipment details (Index 0)
    const shipment = await logistics.getShipment(sender.address, 0);

    // Verify Status is PENDING (Enum index 0) - Note the 'n' for BigInt
    expect(shipment[6]).to.equal(0n); 
    // Verify Price
    expect(shipment[5]).to.equal(price);
  });

  it("Should allow starting the shipment (Update to IN_TRANSIT)", async function () {
    const { logistics, sender, receiver } = await loadFixture(deployLogisticsFixture);
    const price = ethers.parseEther("1");

    await logistics.createShipment(receiver.address, Date.now(), 100, price, { value: price });

    // Start Shipment (Index 0)
    await logistics.startShipment(sender.address, 0);

    const shipment = await logistics.getShipment(sender.address, 0);
    
    // Verify Status is IN_TRANSIT (Enum index 1)
    expect(shipment[6]).to.equal(1n);
  });

  it("Should allow receiver to complete delivery and release payment", async function () {
    const { logistics, sender, receiver } = await loadFixture(deployLogisticsFixture);
    const price = ethers.parseEther("1");

    // 1. Create
    await logistics.createShipment(receiver.address, Date.now(), 100, price, { value: price });
    
    // 2. Start
    await logistics.startShipment(sender.address, 0);

    // 3. Complete (Must be called by Receiver)
    // We connect as the receiver, then cast back to Logistics type
    const receiverContract = logistics.connect(receiver) as unknown as Logistics;
    
    await receiverContract.completeShipment(sender.address, 0);

    const shipment = await logistics.getShipment(sender.address, 0);

    // Verify Status is DELIVERED (Enum index 2)
    expect(shipment[6]).to.equal(2n);
  });
});