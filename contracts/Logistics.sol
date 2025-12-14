// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract Logistics {

    // Define the Status levels
    enum ShipmentStatus { PENDING, IN_TRANSIT, DELIVERED, PAID }

    struct Shipment {
        address sender;
        address receiver;
        uint256 pickupTime;
        uint256 deliveryTime;
        uint256 distance;
        uint256 price;
        ShipmentStatus status;
        bool isPaid;
    }

    // Store all shipments in a list
    mapping(address => Shipment[]) public shipments;
    uint256 public totalShipments;

    // Events for the frontend to listen to
    event ShipmentCreated(address indexed sender, address indexed receiver, uint256 price, uint256 timestamp);
    event ShipmentInTransit(address indexed sender, address indexed receiver, uint256 timestamp);
    event ShipmentDelivered(address indexed sender, address indexed receiver, uint256 timestamp);
    event ShipmentPaid(address indexed sender, address indexed receiver, uint256 amount);

    constructor() {
        totalShipments = 0;
    }

    // 1. Create a Shipment
    function createShipment(address _receiver, uint256 _pickupTime, uint256 _distance, uint256 _price) public payable {
        require(msg.value == _price, "Payment amount must match price");

        Shipment memory shipment = Shipment(
            msg.sender,
            _receiver,
            _pickupTime,
            0,
            _distance,
            _price,
            ShipmentStatus.PENDING,
            true
        );

        shipments[msg.sender].push(shipment);
        totalShipments++;

        emit ShipmentCreated(msg.sender, _receiver, _price, block.timestamp);
    }

    // 2. Start Shipping (Update Status)
    function startShipment(address _sender, uint256 _index) public {
        Shipment storage shipment = shipments[_sender][_index];
        
        // Only the receiver or sender can update (depending on your logic, usually the carrier)
        require(shipment.receiver == msg.sender || shipment.sender == msg.sender, "Not authorized");
        require(shipment.status == ShipmentStatus.PENDING, "Shipment already started");

        shipment.status = ShipmentStatus.IN_TRANSIT;
        emit ShipmentInTransit(_sender, shipment.receiver, block.timestamp);
    }

    // 3. Complete Shipment
    function completeShipment(address _sender, uint256 _index) public {
        Shipment storage shipment = shipments[_sender][_index];
        
        require(shipment.receiver == msg.sender, "Only receiver can confirm delivery");
        require(shipment.status == ShipmentStatus.IN_TRANSIT, "Shipment not in transit");

        shipment.status = ShipmentStatus.DELIVERED;
        shipment.deliveryTime = block.timestamp;

        uint256 amount = shipment.price;
        payable(shipment.sender).transfer(amount); // Release payment to sender/carrier

        emit ShipmentDelivered(_sender, shipment.receiver, block.timestamp);
        emit ShipmentPaid(_sender, shipment.receiver, amount);
    }

    // 4. Get Data for Frontend
    function getShipment(address _sender, uint256 _index) public view returns (
        address, address, uint256, uint256, uint256, uint256, ShipmentStatus, bool
    ) {
        Shipment memory shipment = shipments[_sender][_index];
        return (
            shipment.sender,
            shipment.receiver,
            shipment.pickupTime,
            shipment.deliveryTime,
            shipment.distance,
            shipment.price,
            shipment.status,
            shipment.isPaid
        );
    }
    
    // Function to get total shipment count for a user
    function getShipmentsCount(address _sender) public view returns (uint256) {
        return shipments[_sender].length;
    }
}