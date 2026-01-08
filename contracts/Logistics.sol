// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

contract Logistics {
    // Enums for Status and Categories
    enum ShipmentStatus { PENDING, IN_TRANSIT, DELIVERED }
    enum TransportMode { LAND, AIR, WATER }
    enum ItemType { GENERAL, IRON, COAL, FOOD, FRAGILE }

    // Main Data Structure
    struct Shipment {
        address sender;
        address receiver;
        string itemName; 
        ItemType itemType;
        TransportMode mode;
        uint256 weight;   // in KG
        uint256 distance; // in KM
        uint256 price;
        ShipmentStatus status;
        bool isPaid;
    }

    // Storage
    mapping(address => Shipment[]) public shipments;
    
    // Global Tracking for Receivers (Maps receiver address to shipment location)
    struct ShipmentRef {
        address sender;
        uint256 index;
    }
    mapping(address => ShipmentRef[]) public incomingShipments;

    // Events
    event ShipmentCreated(address indexed sender, address indexed receiver, uint256 price);
    event ShipmentStatusChanged(address indexed sender, uint256 index, ShipmentStatus status);

    // --- AUTOMATED PRICING ENGINE ---
    function calculatePrice(
        uint256 _distance, 
        uint256 _weight, 
        TransportMode _mode, 
        ItemType _type
    ) public pure returns (uint256) {
        
        // 1. Base Cost Calculation
        uint256 base = 0.001 ether;
        uint256 distCost = _distance * 0.0001 ether;
        uint256 weightCost = _weight * 0.0002 ether;
        uint256 rawPrice = base + distCost + weightCost;

        // 2. Transport Mode Multiplier
        uint256 modeMultiplier = 100;
        if (_mode == TransportMode.LAND) modeMultiplier = 100;   // 1.0x (Standard)
        if (_mode == TransportMode.AIR) modeMultiplier = 300;    // 3.0x (Fast/Expensive)
        if (_mode == TransportMode.WATER) modeMultiplier = 50;   // 0.5x (Slow/Cheap)

        // 3. Item Type Multiplier
        uint256 typeMultiplier = 100;
        if (_type == ItemType.GENERAL) typeMultiplier = 100;
        if (_type == ItemType.IRON) typeMultiplier = 120;    // +20% (Heavy handling)
        if (_type == ItemType.COAL) typeMultiplier = 110;    // +10% (Bulk)
        if (_type == ItemType.FOOD) typeMultiplier = 150;    // +50% (Refrigeration)
        if (_type == ItemType.FRAGILE) typeMultiplier = 200; // +100% (Careful handling)

        // Final Calculation
        return (rawPrice * modeMultiplier * typeMultiplier) / 10000;
    }

    // --- ACTIONS ---

    function createShipment(
        address _receiver, 
        string memory _itemName,
        TransportMode _mode,
        ItemType _type,
        uint256 _distance, 
        uint256 _weight
    ) public payable {
        uint256 cost = calculatePrice(_distance, _weight, _mode, _type);
        require(msg.value >= cost, "Insufficient funds provided for calculated price");

        Shipment memory newShipment = Shipment({
            sender: msg.sender,
            receiver: _receiver,
            itemName: _itemName,
            itemType: _type,
            mode: _mode,
            weight: _weight,
            distance: _distance,
            price: cost,
            status: ShipmentStatus.PENDING,
            isPaid: true
        });

        // Add to Sender's List
        uint256 index = shipments[msg.sender].length;
        shipments[msg.sender].push(newShipment);
        
        // Add to Receiver's Global Tracking
        incomingShipments[_receiver].push(ShipmentRef(msg.sender, index));
        
        emit ShipmentCreated(msg.sender, _receiver, cost);
    }

    function startShipment(uint256 _index) public {
        Shipment storage s = shipments[msg.sender][_index];
        require(s.status == ShipmentStatus.PENDING, "Shipment is not pending");
        s.status = ShipmentStatus.IN_TRANSIT;
        emit ShipmentStatusChanged(msg.sender, _index, ShipmentStatus.IN_TRANSIT);
    }

    function completeShipment(address _sender, uint256 _index) public {
        Shipment storage s = shipments[_sender][_index];
        require(msg.sender == s.receiver, "Only the designated receiver can confirm");
        require(s.status == ShipmentStatus.IN_TRANSIT, "Shipment not in transit");
        
        s.status = ShipmentStatus.DELIVERED;
        
        // ESCROW RELEASE: Transfer funds to the sender (carrier)
        payable(s.sender).transfer(s.price); 
        
        emit ShipmentStatusChanged(_sender, _index, ShipmentStatus.DELIVERED);
    }

    // --- VIEW HELPERS ---
    function getSenderCount(address _user) public view returns (uint256) {
        return shipments[_user].length;
    }

    function getReceiverCount(address _user) public view returns (uint256) {
        return incomingShipments[_user].length;
    }
}