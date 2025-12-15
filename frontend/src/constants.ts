export const LOGISTICS_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

export const LOGISTICS_ABI = [
  "function createShipment(address _receiver, uint256 _pickupTime, uint256 _distance, uint256 _price) public payable",
  "function startShipment(address _sender, uint256 _index) public",
  "function completeShipment(address _sender, uint256 _index) public",
  "function getShipment(address _sender, uint256 _index) public view returns (address, address, uint256, uint256, uint256, uint256, uint8, bool)",
  "function getShipmentsCount(address _sender) public view returns (uint256)",
  "event ShipmentCreated(address indexed sender, address indexed receiver, uint256 price, uint256 timestamp)",
  "event ShipmentInTransit(address indexed sender, address indexed receiver, uint256 timestamp)",
  "event ShipmentDelivered(address indexed sender, address indexed receiver, uint256 timestamp)"
];