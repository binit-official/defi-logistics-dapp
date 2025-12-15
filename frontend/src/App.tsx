import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LOGISTICS_ADDRESS, LOGISTICS_ABI } from './constants';
import './App.css';

declare global {
  interface Window {
    ethereum?: any;
  }
}

function App() {
  const [account, setAccount] = useState("");
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Processing...");
  const [lastTxHash, setLastTxHash] = useState(""); // Added missing Transaction Hash state

  // Form state
  const [receiver, setReceiver] = useState("");
  const [distance, setDistance] = useState("");
  const [price, setPrice] = useState("");

  /* ================= WALLET ================= */
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    setAccount(await signer.getAddress());
  };

  const getContract = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(LOGISTICS_ADDRESS, LOGISTICS_ABI, signer);
  };

  /* ================= CONTRACT ACTIONS ================= */
  const createShipment = async () => {
    if (!account) return;
    setLoading(true);
    setLoadingMsg("Locking funds in smart contract...");
    setLastTxHash(""); // Reset hash

    try {
      const contract = await getContract();
      const value = ethers.parseEther(price);

      const tx = await contract.createShipment(
        receiver,
        Date.now(),
        distance,
        value,
        { value }
      );

      setLoadingMsg("Waiting for blockchain confirmation...");
      await tx.wait();
      setLastTxHash(tx.hash); // Save hash

      setReceiver("");
      setDistance("");
      setPrice("");

      fetchShipments();
    } catch (err) {
      alert("Transaction failed");
    }
    setLoading(false);
  };

  // --- MISSING FUNCTION 1: START SHIPMENT ---
  const startShipment = async (index: number) => {
    setLoading(true);
    setLoadingMsg("Updating status on blockchain...");
    setLastTxHash("");
    try {
        const contract = await getContract();
        const tx = await contract.startShipment(account, index);
        await tx.wait();
        setLastTxHash(tx.hash);
        fetchShipments();
    } catch (error: any) {
        alert("Transaction Failed");
    }
    setLoading(false);
  }

  // --- MISSING FUNCTION 2: COMPLETE SHIPMENT ---
  const completeShipment = async (senderAddress: string, index: number) => {
    setLoading(true);
    setLoadingMsg("Releasing escrow funds to sender...");
    setLastTxHash("");
    try {
        const contract = await getContract();
        const tx = await contract.completeShipment(senderAddress, index);
        await tx.wait();
        setLastTxHash(tx.hash);
        fetchShipments();
    } catch (error: any) {
        alert("Transaction Failed");
    }
    setLoading(false);
  }

  const fetchShipments = async () => {
    if (!account) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(LOGISTICS_ADDRESS, LOGISTICS_ABI, provider);

    try {
      const count = await contract.getShipmentsCount(account);
      const data: any[] = [];

      for (let i = 0; i < count; i++) {
        const s = await contract.getShipment(account, i);
        data.push({
          index: i,
          sender: s[0], // Needed for completion
          receiver: s[1],
          price: ethers.formatEther(s[5]),
          status: Number(s[6]),
          isPaid: s[7]
        });
      }

      setShipments(data.reverse());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (account) fetchShipments();
  }, [account]);

  /* ================= STATS ================= */
  const total = shipments.length;
  const transit = shipments.filter(s => s.status === 1).length;
  const delivered = shipments.filter(s => s.status === 2).length;

  /* ================= RENDER ================= */
  return (
    <div className="app-container">

      {/* FLOATING BACKGROUND ICONS */}
      <div className="floating-bg">
        <span className="float-icon eth">⛓️</span>
        <span className="float-icon dollar">💲</span>
        <span className="float-icon truck">🚚</span>
        <span className="float-icon box">📦</span>
        <span className="float-icon money">💰</span>
        <span className="float-icon eth delay1">Ξ</span>
        <span className="float-icon truck delay2">🚛</span>
        <span className="float-icon dollar delay3">$</span>
      </div>

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="overlay">
          <div className="spinner"></div>
          <h3 style={{ marginTop: '20px' }}>{loadingMsg}</h3>
          <p style={{ color: '#9ca3af' }}>Confirm the transaction in MetaMask</p>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="brand">📦 DeFi Logistics</div>

          {!account ? (
            <button className="btn-main" style={{ width: 'auto' }} onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '20px', fontWeight: 600 }}>
              {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="main-content">

        {/* SUCCESS MESSAGE POPUP */}
        {lastTxHash && (
            <div style={{
                background: 'rgba(16, 185, 129, 0.1)', 
                border: '1px solid #10b981', 
                padding: '1rem', 
                borderRadius: '12px',
                textAlign: 'center',
                width: '100%',
                animation: 'fadeIn 0.5s'
            }}>
                <div style={{color: '#4ade80', fontWeight: 'bold', marginBottom: '5px'}}>✅ Transaction Successful!</div>
                <div style={{fontSize: '0.8rem', color: '#fff', wordBreak: 'break-all'}}>
                    Hash: {lastTxHash}
                </div>
            </div>
        )}

        {/* STATS */}
        <div className="stats-row">
          <div className="stat-card">
            <div><div className="stat-label">Total Shipments</div><div className="stat-val">{total}</div></div>
            📊
          </div>
          <div className="stat-card">
            <div><div className="stat-label">In Transit</div><div className="stat-val" style={{ color: '#facc15' }}>{transit}</div></div>
            🚚
          </div>
          <div className="stat-card">
            <div><div className="stat-label">Delivered</div><div className="stat-val" style={{ color: '#4ade80' }}>{delivered}</div></div>
            ✅
          </div>
        </div>

        {/* CREATE SHIPMENT */}
        <div className="create-section">
          <div className="create-panel">
            <h2>⚡ Create New Shipment</h2>
            <p>Securely lock funds in escrow and start a blockchain delivery.</p>

            <div className="input-group">
              <label className="label">Receiver Wallet Address</label>
              <input className="input-box" placeholder="0x..." value={receiver} onChange={e => setReceiver(e.target.value)} />
            </div>

            <div className="input-grid">
              <div>
                <label className="label">Distance (km)</label>
                <input className="input-box" type="number" value={distance} onChange={e => setDistance(e.target.value)} />
              </div>
              <div>
                <label className="label">Price (ETH)</label>
                <input className="input-box" type="number" value={price} onChange={e => setPrice(e.target.value)} />
              </div>
            </div>

            <button className="btn-main" onClick={createShipment}>🔒 Pay & Create Shipment</button>
          </div>
        </div>

        {/* --- MISSING SECTION: SHIPMENT HISTORY LIST --- */}
        <div className="shipments-section">
            <div className="section-title">
                <span>📋</span> Shipment History
            </div>

            {shipments.length === 0 && (
                <div style={{textAlign: 'center', padding: '4rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed #4b5563'}}>
                    <h3 style={{color: '#9ca3af'}}>No shipments yet</h3>
                    <p style={{color: '#6b7280'}}>Create your first shipment above to get started.</p>
                </div>
            )}

            {shipments.map((s) => (
                <div key={s.index} className="shipment-card">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                        <div>
                            <h3 style={{margin: '0 0 5px 0', fontSize: '1.2rem'}}>Shipment #{s.index}</h3>
                            <div style={{color: '#94a3b8', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                <span>👤 Receiver:</span> 
                                <span style={{fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px'}}>{s.receiver}</span>
                            </div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                            <div style={{fontSize: '1.4rem', fontWeight: 800}}>{s.price} ETH</div>
                        </div>
                    </div>

                    {/* PROGRESS BAR */}
                    <div className="progress-track">
                        <div className="progress-line-bg"></div>
                        <div className="progress-line-fill" style={{ width: s.status === 0 ? '0%' : s.status === 1 ? '50%' : '100%' }}></div>
                        
                        <div className={`step ${s.status >= 0 ? 'active' : ''}`}>
                            <div className="step-dot">1</div>
                            <div className="step-label">Created</div>
                        </div>
                        <div className={`step ${s.status >= 1 ? 'active' : ''}`}>
                            <div className="step-dot">2</div>
                            <div className="step-label">In Transit</div>
                        </div>
                        <div className={`step ${s.status >= 2 ? 'active' : ''}`}>
                            <div className="step-dot">3</div>
                            <div className="step-label">Delivered</div>
                        </div>
                    </div>

                    {/* ACTIONS */}
                    <div style={{display: 'flex', alignItems: 'center', marginTop: '1.5rem'}}>
                         {s.status === 2 && (
                            <div style={{color: '#4ade80', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px'}}>
                                ✅ FUNDS RELEASED
                            </div>
                         )}

                         {s.status === 0 && (
                             <button className="btn-action btn-start" onClick={() => startShipment(s.index)}>
                                START DELIVERY 🚚
                             </button>
                         )}
                         {s.status === 1 && (
                             <button className="btn-action btn-confirm" onClick={() => completeShipment(s.sender, s.index)}>
                                CONFIRM DELIVERY & RELEASE FUNDS 💰
                             </button>
                         )}
                    </div>
                </div>
            ))}
        </div>

      </div>
    </div>
  );
}

export default App;