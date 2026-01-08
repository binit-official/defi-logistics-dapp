import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { LOGISTICS_ADDRESS, LOGISTICS_ABI } from './constants';
import LandingPage from './LandingPage';
import './App.css';

declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  const [enteredApp, setEnteredApp] = useState(false);
  const [account, setAccount] = useState("");
  
  // 1. Detect "Receiver Mode" via URL Parameter (?view=receiver)
  const isReceiverView = new URLSearchParams(window.location.search).get('view') === 'receiver';

  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");

  // --- SENDER FORM STATE ---
  const [receiver, setReceiver] = useState("");
  const [itemName, setItemName] = useState("");
  const [distance, setDistance] = useState(0);
  const [weight, setWeight] = useState(0);
  const [itemType, setItemType] = useState(0);
  const [mode, setMode] = useState(0);

  // --- REAL-TIME PRICING ENGINE (Matches Contract Logic) ---
  const autoPrice = useMemo(() => {
    if (distance === 0 && weight === 0) return "0.00";
    
    // Base Calculation
    const base = 0.001 + (distance * 0.0001) + (weight * 0.0002);
    
    // Multipliers
    const modeMults = [1.0, 3.0, 0.5]; // Land, Air, Water
    const typeMults = [1.0, 1.2, 1.1, 1.5, 2.0]; // General, Iron, Coal, Food, Fragile
    
    const finalPrice = base * modeMults[mode] * typeMults[itemType];
    return finalPrice.toFixed(5);
  }, [distance, weight, mode, itemType]);

  // --- WALLET CONNECTION ---
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    setAccount(await signer.getAddress());
  };

  // Listen for Account Changes in MetaMask
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAccount(accounts[0] || "");
      });
    }
  }, []);

  const getContract = async (signed = true) => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(LOGISTICS_ADDRESS, LOGISTICS_ABI, signed ? signer : provider);
  };

  // --- OPEN SEPARATE TAB ---
  const openReceiverTab = () => {
    // Opens current URL with ?view=receiver appended
    window.open(`${window.location.origin}?view=receiver`, '_blank');
  };

  // --- CONTRACT ACTIONS ---
  const createShipment = async () => {
    if (!account) return alert("Connect Wallet First");
    setLoading(true); 
    setLoadingMsg(`Calculated Cost: ${autoPrice} ETH`);
    
    try {
      const contract = await getContract();
      const val = ethers.parseEther(autoPrice);
      const tx = await contract.createShipment(
        receiver, itemName, mode, itemType, distance, weight, 
        { value: val }
      );
      await tx.wait();
      fetchData(); // Refresh list
    } catch (e) {
      console.error(e);
      alert("Transaction Failed. Check console for details.");
    }
    setLoading(false);
  };

  const fetchData = async () => {
    if (!account) return;
    try {
        const contract = await getContract(false);
        const data = [];
        
        // Helpers for display
        const MODES = ["🚛 Land", "✈️ Air", "🚢 Water"];
        const TYPES = ["📦 General", "🏗️ Iron", "🔥 Coal", "🍎 Food", "⚠️ Fragile"];

        if (!isReceiverView) {
        // --- SENDER LOGIC ---
        const count = await contract.getSenderCount(account);
        for (let i = 0; i < count; i++) {
            const s = await contract.shipments(account, i);
            data.push({ 
                index: i, 
                user: s.receiver, 
                name: s.itemName,
                desc: `${TYPES[Number(s.itemType)]} via ${MODES[Number(s.mode)]}`,
                price: ethers.formatEther(s.price), 
                status: Number(s.status) 
            });
        }
        } else {
        // --- RECEIVER LOGIC ---
        const count = await contract.getReceiverCount(account);
        for (let i = 0; i < count; i++) {
            const ref = await contract.incomingShipments(account, i);
            const s = await contract.shipments(ref.sender, ref.index);
            data.push({ 
                index: Number(ref.index), 
                sender: s.sender,
                user: s.sender, 
                name: s.itemName,
                desc: `${TYPES[Number(s.itemType)]} via ${MODES[Number(s.mode)]}`,
                price: ethers.formatEther(s.price), 
                status: Number(s.status) 
            });
        }
        }
        setShipments(data.reverse());
    } catch (error) {
        console.error("Error fetching data:", error);
    }
  };

  useEffect(() => { if (account) fetchData(); }, [account, isReceiverView]);

  // Landing Page logic (only for Sender view)
  if (!enteredApp && !isReceiverView) return <LandingPage onEnter={() => setEnteredApp(true)} />;

  return (
    <div className={`app-container ${isReceiverView ? 'receiver-theme' : ''}`}>
      
      {/* Background Icons */}
      <div className="floating-bg">
        <span className="float-icon">{isReceiverView ? '📥' : '📤'}</span>
        <span className="float-icon">{isReceiverView ? '💰' : '✈️'}</span>
        <span className="float-icon">{isReceiverView ? '✅' : '📦'}</span>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="overlay">
            <div className="spinner"></div>
            <h3>{loadingMsg}</h3>
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="brand">
            {isReceiverView ? "📥 Receiver Portal" : "🌍 Global Logistics Sender"}
          </div>
          <button className="btn-main" onClick={connectWallet}>
            {account ? `${account.slice(0,6)}...${account.slice(-4)}` : "🔗 Connect Wallet"}
          </button>
        </div>
      </nav>

      <div className="main-content">
        
        {/* --- SENDER VIEW --- */}
        {!isReceiverView && (
          <>
            <div className="tabs-row">
              <button className="active tab-btn">Sender Dashboard</button>
              <button className="tab-btn outline" onClick={openReceiverTab}>
                ↗ Open Receiver Console (New Tab)
              </button>
            </div>

            <div className="create-section">
              <div className="create-panel modern-card">
                <h2>Create New Shipment</h2>
                <input className="input-box" placeholder="Receiver Address (0x...)" onChange={e => setReceiver(e.target.value)} />
                <input className="input-box" placeholder="Shipment Name (e.g. Iron Batch #1)" onChange={e => setItemName(e.target.value)} />
                
                <div className="row-inputs">
                    <select className="input-box" onChange={e => setItemType(Number(e.target.value))}>
                        <option value="0">📦 General Goods</option>
                        <option value="1">🏗️ Iron (Heavy)</option>
                        <option value="2">🔥 Coal (Bulk)</option>
                        <option value="3">🍎 Food (Perishable)</option>
                        <option value="4">⚠️ Fragile</option>
                    </select>
                    <select className="input-box" onChange={e => setMode(Number(e.target.value))}>
                        <option value="0">🚛 Land Transport</option>
                        <option value="1">✈️ Air Freight (Fast)</option>
                        <option value="2">🚢 Ocean Freight (Cheap)</option>
                    </select>
                </div>
                <div className="row-inputs">
                    <input className="input-box" type="number" placeholder="Distance (KM)" onChange={e => setDistance(Number(e.target.value))} />
                    <input className="input-box" type="number" placeholder="Weight (KG)" onChange={e => setWeight(Number(e.target.value))} />
                </div>
                
                <div className="auto-price">
                    Estimated Cost: <span>{autoPrice} ETH</span>
                </div>
                <button className="btn-main" onClick={createShipment}>Pay & Ship</button>
              </div>
            </div>
          </>
        )}

        {/* --- RECEIVER VIEW (Only visible in new tab) --- */}
        {isReceiverView && (
          <div className="receiver-intro">
             {!account ? (
               <div className="connect-prompt">
                 <h2>👋 Welcome, Receiver</h2>
                 <p>Connect your wallet to view incoming shipments and release payments.</p>
                 <button className="btn-main big" onClick={connectWallet}>Connect Wallet</button>
               </div>
             ) : (
               <div className="receiver-header">
                   <h3>Incoming Shipments for {account.slice(0,6)}...</h3>
               </div>
             )}
          </div>
        )}

        {/* --- SHIPMENT LIST (Shared) --- */}
        {account && (
            <div className="shipments-section">
            {shipments.map((s, i) => (
                <div key={i} className="shipment-card modern-card">
                <div className="shipment-header">
                    <div>
                        <h3>{s.name}</h3>
                        <div className="shipment-sub">{s.desc}</div>
                        <div className="shipment-sub">
                            {isReceiverView ? `From: ${s.sender.slice(0,8)}...` : `To: ${s.user.slice(0,8)}...`}
                        </div>
                    </div>
                    <div className="price-badge">{s.price} ETH</div>
                </div>

                {/* Progress Bar */}
                <div className="status-bar">
                    <span className={`pill ${s.status===0?'pend':''}`}>Pending</span>
                    <span className="line"></span>
                    <span className={`pill ${s.status===1?'prog':''}`}>Transit</span>
                    <span className="line"></span>
                    <span className={`pill ${s.status===2?'comp':''}`}>Delivered</span>
                </div>

                {/* Action Buttons */}
                <div className="shipment-actions">
                    {!isReceiverView && s.status === 0 && (
                        <button className="btn-action btn-start" onClick={async () => {
                            const c = await getContract(); await(await c.startShipment(s.index)).wait(); fetchData();
                        }}>🚀 Dispatch</button>
                    )}
                    
                    {isReceiverView && s.status === 1 && (
                        <button className="btn-action btn-confirm" onClick={async () => {
                            const c = await getContract(); await(await c.completeShipment(s.sender, s.index)).wait(); fetchData();
                        }}>✅ Confirm & Release Funds</button>
                    )}
                    
                    {s.status === 2 && <div className="success-txt">✅ Transaction Complete</div>}
                    
                    {/* Status Messages */}
                    {!isReceiverView && s.status === 1 && <span className="wait-txt">Waiting for Receiver...</span>}
                    {isReceiverView && s.status === 0 && <span className="wait-txt">Waiting for Dispatch...</span>}
                </div>
                </div>
            ))}
            {shipments.length === 0 && account && (
                <p style={{textAlign:'center', opacity:0.5, marginTop:'20px'}}>
                    {isReceiverView ? "No incoming shipments found." : "No shipments created yet."}
                </p>
            )}
            </div>
        )}

      </div>
    </div>
  );
}

export default App;