import { useState, useEffect } from 'react';
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
  /* ================= LANDING STATE ================= */
  const [enteredApp, setEnteredApp] = useState(false);

  /* ================= WALLET & DATA ================= */
  const [account, setAccount] = useState("");
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Processing...");
  const [lastTxHash, setLastTxHash] = useState("");

  /* ================= FORM ================= */
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
    if (!account) return alert("Connect wallet first");

    setLoading(true);
    setLoadingMsg("Locking funds in smart contract...");
    setLastTxHash("");

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

      setLastTxHash(tx.hash);
      setReceiver(""); setDistance(""); setPrice("");
      fetchShipments();
    } catch {
      alert("Transaction failed");
    }
    setLoading(false);
  };

  const startShipment = async (index: number) => {
    setLoading(true);
    setLoadingMsg("Updating shipment status...");
    setLastTxHash("");

    try {
      const contract = await getContract();
      const tx = await contract.startShipment(account, index);
      await tx.wait();
      setLastTxHash(tx.hash);
      fetchShipments();
    } catch {
      alert("Transaction failed");
    }
    setLoading(false);
  };

  const completeShipment = async (sender: string, index: number) => {
    setLoading(true);
    setLoadingMsg("Releasing escrow funds...");
    setLastTxHash("");

    try {
      const contract = await getContract();
      const tx = await contract.completeShipment(sender, index);
      await tx.wait();
      setLastTxHash(tx.hash);
      fetchShipments();
    } catch {
      alert("Transaction failed");
    }
    setLoading(false);
  };

  const fetchShipments = async () => {
    if (!account) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const contract = new ethers.Contract(LOGISTICS_ADDRESS, LOGISTICS_ABI, provider);

    const count = await contract.getShipmentsCount(account);
    const data: any[] = [];

    for (let i = 0; i < count; i++) {
      const s = await contract.getShipment(account, i);
      data.push({
        index: i,
        sender: s[0],
        receiver: s[1],
        price: ethers.formatEther(s[5]),
        status: Number(s[6]),
      });
    }
    setShipments(data.reverse());
  };

  useEffect(() => {
    if (account) fetchShipments();
  }, [account]);

  /* ================= STATS ================= */
  const total = shipments.length;
  const transit = shipments.filter(s => s.status === 1).length;
  const delivered = shipments.filter(s => s.status === 2).length;

  /* ================= LANDING ================= */
  if (!enteredApp) {
    return <LandingPage onEnter={() => setEnteredApp(true)} />;
  }

  /* ================= DASHBOARD ================= */
  return (
    <div className="app-container">

      {/* BACKGROUND */}
      <div className="floating-bg">
        <span className="float-icon eth">⛓️</span>
        <span className="float-icon truck">🚚</span>
        <span className="float-icon box">📦</span>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="overlay">
          <div className="spinner"></div>
          <h3>{loadingMsg}</h3>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="navbar">
        <div className="navbar-content">
          <div className="brand">📦 DeFi Logistics</div>
          {!account ? (
            <button className="btn-main" onClick={connectWallet}>
              Connect Wallet
            </button>
          ) : (
            <div className="wallet-pill">
              {account.slice(0,6)}...{account.slice(-4)}
            </div>
          )}
        </div>
      </nav>

      <div className="main-content">

        {lastTxHash && (
          <div className="success-box">
            ✅ Transaction Successful<br/>
            <small>{lastTxHash}</small>
          </div>
        )}

        {/* STATS */}
        <div className="stats-row">
          <div className="stat-card"><div><div className="stat-label">Total</div><div className="stat-val">{total}</div></div>📊</div>
          <div className="stat-card"><div><div className="stat-label">Transit</div><div className="stat-val" style={{color:'#facc15'}}>{transit}</div></div>🚚</div>
          <div className="stat-card"><div><div className="stat-label">Delivered</div><div className="stat-val" style={{color:'#4ade80'}}>{delivered}</div></div>✅</div>
        </div>

        {/* CREATE */}
        <div className="create-section">
          <div className="create-panel">
            <h2>Create Shipment</h2>
            <input className="input-box" placeholder="Receiver" value={receiver} onChange={e=>setReceiver(e.target.value)} />
            <input className="input-box" placeholder="Distance" value={distance} onChange={e=>setDistance(e.target.value)} />
            <input className="input-box" placeholder="Price (ETH)" value={price} onChange={e=>setPrice(e.target.value)} />
            <button className="btn-main" onClick={createShipment}>Create</button>
          </div>
        </div>

        {/* LIST */}
<div className="shipments-section">
  {shipments.map(s => (
    <div key={s.index} className="shipment-card modern-card">

      {/* HEADER */}
      <div className="shipment-header">
        <div>
          <h3>📦 Shipment #{s.index}</h3>
          <span className="shipment-sub">
            To: <span className="mono">{s.receiver.slice(0, 10)}...</span>
          </span>
        </div>

        <div className="price-badge">
          {s.price} ETH
        </div>
      </div>

      {/* PROGRESS STEPS */}
      <div className="shipment-progress">
        <div className={`step ${s.status >= 0 ? 'active' : ''}`}>
          <div className="dot"></div>
          <span>Created</span>
        </div>

        <div className={`step ${s.status >= 1 ? 'active' : ''}`}>
          <div className="dot"></div>
          <span>In Transit</span>
        </div>

        <div className={`step ${s.status >= 2 ? 'active' : ''}`}>
          <div className="dot"></div>
          <span>Delivered</span>
        </div>

        <div className="progress-line">
          <div
            className="progress-fill"
            style={{
              width:
                s.status === 0
                  ? '0%'
                  : s.status === 1
                  ? '50%'
                  : '100%',
            }}
          />
        </div>
      </div>

      {/* ACTIONS */}
      <div className="shipment-actions">
        {s.status === 0 && (
          <button
            className="btn-action btn-start"
            onClick={() => startShipment(s.index)}
          >
            🚚 Start Delivery
          </button>
        )}

        {s.status === 1 && (
          <button
            className="btn-action btn-confirm"
            onClick={() => completeShipment(s.sender, s.index)}
          >
            💰 Confirm Delivery
          </button>
        )}

        {s.status === 2 && (
          <span className="status-complete">✅ Completed</span>
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
