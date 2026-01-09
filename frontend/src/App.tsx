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
  
  // --- WALLET & IDENTITY STATE ---
  const [account, setAccount] = useState(""); 
  const [manualAddress, setManualAddress] = useState(""); 

  // Priority: Manual Input > Connected Wallet > Empty
  const effectiveUser = manualAddress || account;

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

  // --- PRICING ENGINE ---
  const autoPrice = useMemo(() => {
    if (distance === 0 && weight === 0) return "0.00";
    const base = 0.001 + (distance * 0.0001) + (weight * 0.0002);
    const modeMults = [1.0, 3.0, 0.5]; 
    const typeMults = [1.0, 1.2, 1.1, 1.5, 2.0]; 
    const finalPrice = base * modeMults[mode] * typeMults[itemType];
    return finalPrice.toFixed(5);
  }, [distance, weight, mode, itemType]);

  // --- WALLET CONNECTION ---
  const connectWallet = async () => {
    if (!window.ethereum) return alert("Please install MetaMask");
    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);
    } catch (err) {
        console.error("Connection Rejected", err);
    }
  };

  /** * NO GLOBAL LISTENER: We do not listen to 'accountsChanged'.
   * This ensures Tab 1 doesn't change when you mess with Tab 2.
   */

  // --- SMART CONTRACT HELPER (WITH INTERACTIVE FIX) ---
  const getContract = async (signed = true) => {
    if (!window.ethereum) throw new Error("No Wallet Found");
    const provider = new ethers.BrowserProvider(window.ethereum);
    
    if (signed) {
        const signer = await provider.getSigner();
        const currentWallet = await signer.getAddress();
        
        // 🛡️ SMART CHECK:
        // If the App thinks we are 'Account A', but MetaMask is 'Account B'...
        if (account && currentWallet.toLowerCase() !== account.toLowerCase()) {
            
            // Ask the user what to do instead of blocking them
            const userWantsSwitch = window.confirm(
                `⚠️ Wallet Mismatch Detected!\n\n` +
                `App Account: ${account.slice(0,6)}...\n` +
                `MetaMask Account: ${currentWallet.slice(0,6)}...\n\n` +
                `Do you want to switch the App to use ${currentWallet.slice(0,6)}... and proceed?`
            );

            if (userWantsSwitch) {
                // UPDATE STATE and proceed
                setAccount(currentWallet);
                return new ethers.Contract(LOGISTICS_ADDRESS, LOGISTICS_ABI, signer);
            } else {
                // CANCEL and tell them why
                // We throw a specific error string to catch it later silently
                throw new Error("Wallet Mismatch Cancelled");
            }
        }
        
        // If accounts match (or app was disconnected), proceed normally
        return new ethers.Contract(LOGISTICS_ADDRESS, LOGISTICS_ABI, signer);
    } else {
        // Read-Only mode
        return new ethers.Contract(LOGISTICS_ADDRESS, LOGISTICS_ABI, provider);
    }
  };

  const openReceiverTab = () => {
    window.open(`${window.location.origin}?view=receiver`, '_blank');
  };

  // --- ACTIONS (WRITE) ---
  const createShipment = async () => {
    // 1. Check if wallet is connected
    if (!account) {
        await connectWallet();
        // If user cancels connection, account will still be empty
        if(!account) return; 
    }

    // 2. --- VALIDATION FIX (Stops ENS Error) ---
    if (!receiver || !ethers.isAddress(receiver)) {
        alert("Invalid Receiver Address! Please enter a valid Ethereum address (starting with 0x).");
        return;
    }
    if (!itemName) {
        alert("Please enter a shipment name.");
        return;
    }
    
    setLoading(true); 
    setLoadingMsg(`Calculated Cost: ${autoPrice} ETH`);
    
    try {
      // getContract(true) will now ASK confirmation if wallet changed
      const contract = await getContract(true); 
      
      const val = ethers.parseEther(autoPrice);
      
      console.log("Sending Transaction...", { receiver, itemName, mode, itemType, distance, weight, val });

      const tx = await contract.createShipment(
        receiver, 
        itemName, 
        mode, 
        itemType, 
        distance, 
        weight, 
        { value: val }
      );
      
      await tx.wait();
      console.log("Transaction Confirmed!");
      
      // Clear form (optional)
      // setItemName(""); 
      // setReceiver("");
      
      fetchData(); 
      alert("Shipment Created Successfully!");

    } catch (e: any) {
      // Handle the specific "Wallet Mismatch Cancelled" error silently
      if (e.message !== "Wallet Mismatch Cancelled") {
        console.error(e);
        
        // Don't alert if user just cancelled the metamask popup
        if (e.code === "ACTION_REJECTED" || (e.info && e.info.error && e.info.error.code === 4001)) {
           console.log("User rejected transaction");
        } else if (!JSON.stringify(e).includes("user rejected")) {
           alert("Transaction Failed. See console for details.");
        }
      }
    }
    setLoading(false);
  };

  // --- FETCH DATA (READ) ---
  const fetchData = async () => {
    // Only fetch if we have a user AND it looks like a valid address
    // This prevents errors while typing in the "Simulate User" box
    if (!effectiveUser || !ethers.isAddress(effectiveUser)) return;

    try {
        const contract = await getContract(false); // Read-only
        const data = [];
        const MODES = ["🚛 Land", "✈️ Air", "🚢 Water"];
        const TYPES = ["📦 General", "🏗️ Iron", "🔥 Coal", "🍎 Food", "⚠️ Fragile"];

        if (!isReceiverView) {
            // Sender View
            const count = await contract.getSenderCount(effectiveUser);
            for (let i = 0; i < count; i++) {
                const s = await contract.shipments(effectiveUser, i);
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
            // Receiver View
            const count = await contract.getReceiverCount(effectiveUser);
            for (let i = 0; i < count; i++) {
                const ref = await contract.incomingShipments(effectiveUser, i);
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
        console.error("Fetch error:", error);
    }
  };

  useEffect(() => { 
      if (effectiveUser) fetchData(); 
  }, [effectiveUser, isReceiverView]);

  if (!enteredApp && !isReceiverView) return <LandingPage onEnter={() => setEnteredApp(true)} />;

  return (
    <div className={`app-container ${isReceiverView ? 'receiver-theme' : ''}`}>
      
      {/* Background Icons */}
      <div className="floating-bg">
        <span className="float-icon">{isReceiverView ? '📥' : '📤'}</span>
        <span className="float-icon">{isReceiverView ? '💰' : '✈️'}</span>
        <span className="float-icon">{isReceiverView ? '✅' : '📦'}</span>
      </div>

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

      {/* --- IDENTITY OVERRIDE BAR --- */}
      <div style={{ backgroundColor: '#222', padding: '12px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
        <div style={{color: '#aaa', fontSize: '14px'}}>
           Linked Account: <span style={{color: '#fff'}}>{account ? account.slice(0,8)+'...' : 'None'}</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#ffcc00', fontWeight: 'bold' }}>Simulate User:</span>
            <input 
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #555', background: '#333', color: '#fff', width: '320px', fontSize: '14px' }}
              placeholder="Paste Address (0x...) to force view" 
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)} 
            />
        </div>
      </div>

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
                
                <input className="input-box" placeholder="Receiver Address (0x...)" value={receiver} onChange={e => setReceiver(e.target.value)} />
                <input className="input-box" placeholder="Shipment Name" value={itemName} onChange={e => setItemName(e.target.value)} />
                
                <div className="row-inputs">
                    <select className="input-box" onChange={e => setItemType(Number(e.target.value))}>
                        <option value="0">📦 General Goods</option>
                        <option value="1">🏗️ Iron</option>
                        <option value="2">🔥 Coal</option>
                        <option value="3">🍎 Food</option>
                        <option value="4">⚠️ Fragile</option>
                    </select>
                    <select className="input-box" onChange={e => setMode(Number(e.target.value))}>
                        <option value="0">🚛 Land</option>
                        <option value="1">✈️ Air</option>
                        <option value="2">🚢 Water</option>
                    </select>
                </div>
                <div className="row-inputs">
                    <input className="input-box" type="number" placeholder="Distance (KM)" onChange={e => setDistance(Number(e.target.value))} />
                    <input className="input-box" type="number" placeholder="Weight (KG)" onChange={e => setWeight(Number(e.target.value))} />
                </div>
                
                <div className="auto-price">Est. Cost: <span>{autoPrice} ETH</span></div>
                <button className="btn-main" onClick={createShipment}>Pay & Ship</button>
              </div>
            </div>
          </>
        )}

        {/* --- RECEIVER VIEW --- */}
        {isReceiverView && (
          <div className="receiver-intro">
             {!effectiveUser ? (
               <div className="connect-prompt">
                 <h2>👋 Welcome, Receiver</h2>
                 <p>Connect Wallet OR Paste Address above.</p>
                 <button className="btn-main big" onClick={connectWallet}>Connect Wallet</button>
               </div>
             ) : (
               <div className="receiver-header">
                   <h3>Incoming Shipments for:</h3>
                   <div style={{ background: 'rgba(255,255,255,0.1)', padding: '5px 15px', borderRadius: '20px', display: 'inline-block', marginTop: '5px' }}>
                     {effectiveUser}
                   </div>
               </div>
             )}
          </div>
        )}

        {/* --- SHIPMENT LIST --- */}
        {effectiveUser && (
            <div className="shipments-section">
            {shipments.map((s, i) => (
                <div key={i} className="shipment-card modern-card">
                <div className="shipment-header">
                    <div>
                        <h3>{s.name}</h3>
                        <div className="shipment-sub">{s.desc}</div>
                        <div className="shipment-sub">
                            {isReceiverView ? `From: ${s.sender.slice(0,6)}...` : `To: ${s.user.slice(0,6)}...`}
                        </div>
                    </div>
                    <div className="price-badge">{s.price} ETH</div>
                </div>

                <div className="status-bar">
                    <span className={`pill ${s.status===0?'pend':''}`}>Pending</span>
                    <span className="line"></span>
                    <span className={`pill ${s.status===1?'prog':''}`}>Transit</span>
                    <span className="line"></span>
                    <span className={`pill ${s.status===2?'comp':''}`}>Delivered</span>
                </div>

                <div className="shipment-actions">
                    {!isReceiverView && s.status === 0 && (
                        <button className="btn-action btn-start" onClick={async () => {
                            try { const c = await getContract(true); await(await c.startShipment(s.index)).wait(); fetchData(); } catch(e:any) { if (e.message!=="Wallet Mismatch Cancelled") console.error(e); }
                        }}>🚀 Dispatch</button>
                    )}
                    
                    {isReceiverView && s.status === 1 && (
                        <button className="btn-action btn-confirm" onClick={async () => {
                            try { const c = await getContract(true); await(await c.completeShipment(s.sender, s.index)).wait(); fetchData(); } catch(e:any) { if (e.message!=="Wallet Mismatch Cancelled") console.error(e); }
                        }}>✅ Confirm & Release</button>
                    )}
                    
                    {s.status === 2 && <div className="success-txt">✅ Complete</div>}
                    {!isReceiverView && s.status === 1 && <span className="wait-txt">In Transit...</span>}
                    {isReceiverView && s.status === 0 && <span className="wait-txt">Waiting for Dispatch...</span>}
                </div>
                </div>
            ))}
            {shipments.length === 0 && effectiveUser && (
                <p style={{textAlign:'center', opacity:0.5, marginTop:'20px'}}>
                    No shipments found.
                </p>
            )}
            </div>
        )}

      </div>
    </div>
  );
}

export default App;