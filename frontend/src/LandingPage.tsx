import { useEffect } from 'react';
import './App.css';

interface Props {
  onEnter: () => void;
}

const LandingPage = ({ onEnter }: Props) => {

  /* Scroll trigger */
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 80) onEnter();
    };
    window.addEventListener('wheel', onScroll, { passive: true });
    return () => window.removeEventListener('wheel', onScroll);
  }, [onEnter]);

  return (
    <div className="landing-root">

      {/* DEPTH BACKGROUND */}
      <div className="bg-layer bg-gradient"></div>
      <div className="bg-layer bg-stars"></div>

      {/* FLOATING ICONS */}
      <div className="floating-bg">
        <span className="float-icon eth" data-speed="30">Ξ</span>
        <span className="float-icon truck" data-speed="18">🚚</span>
        <span className="float-icon box" data-speed="25">📦</span>
        <span className="float-icon money" data-speed="20">💰</span>
        <span className="float-icon chain" data-speed="35">⛓️</span>
      </div>

      {/* HERO */}
      <div className="landing-center">

        <div className="hero-card glass fade-up">

          <div className="hero-icons">
            📦 ⛓️ 🌍
          </div>

          <h1 className="hero-title animated-gradient">
            DeFi Logistics
          </h1>

          <p className="hero-subtitle">
            Decentralized logistics powered by<br/>
            <strong>Smart-Contract Escrow</strong>.
            <br/>
            Trustless. Transparent. Global.
          </p>

          <button className="btn-primary glow" onClick={onEnter}>
            🚀 Enter App
          </button>

          <div className="hero-stats">
            <div>
              <div className="stat-big">$0</div>
              <span>Platform Fees</span>
            </div>
            <div>
              <div className="stat-big">100%</div>
              <span>On-Chain</span>
            </div>
            <div>
              <div className="stat-big">Instant</div>
              <span>Settlement</span>
            </div>
          </div>

          <div className="scroll-indicator">
            Scroll to enter ↓
          </div>

        </div>
      </div>
    </div>
  );
};

export default LandingPage;
