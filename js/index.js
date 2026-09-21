/* ============================================================
   LUCKY DROP FESTIVAL — DISNEY-PIXAR MEXICAN FIESTA THEME
   Vibrant 3D Animated | Piñata Background | Papel Picado
   ============================================================ */

/* ========== RESET ========== */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
}

html {
    overflow-x: hidden;
}

body {
    min-height: 100vh;
    font-family: 'Baloo 2', 'Fredoka', sans-serif;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 70px 14px 24px;
    position: relative;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background:
        radial-gradient(ellipse at 50% 0%, #ff6b9d 0%, transparent 50%),
        radial-gradient(ellipse at 0% 50%, #ffb347 0%, transparent 50%),
        radial-gradient(ellipse at 100% 50%, #ff6b9d 0%, transparent 50%),
        radial-gradient(ellipse at 50% 100%, #6a1b9a 0%, transparent 50%),
        linear-gradient(180deg, #2a0845 0%, #4a148c 50%, #1a0033 100%);
    background-attachment: fixed;
    color: #fff;
}

/* ========== FLOATING CONFETTI ========== */
.confetti-fall {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
}

.confetti-piece {
    position: absolute;
    width: 10px;
    height: 14px;
    top: -20px;
    opacity: 0;
    animation: confettiFall 10s linear infinite;
    border-radius: 2px;
}

.confetti-piece.pink {
    background: linear-gradient(135deg, #ff6b9d, #ff4081);
    box-shadow: 0 0 10px rgba(255, 107, 157, 0.6);
}

.confetti-piece.gold {
    background: linear-gradient(135deg, #ffd700, #ffb347);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
}

.confetti-piece.magenta {
    background: linear-gradient(135deg, #e91e63, #ff1493);
    box-shadow: 0 0 10px rgba(233, 30, 99, 0.6);
}

.confetti-piece:nth-child(1) { left: 5%; animation-delay: 0s; animation-duration: 8s; }
.confetti-piece:nth-child(2) { left: 15%; animation-delay: 1.2s; animation-duration: 10s; }
.confetti-piece:nth-child(3) { left: 25%; animation-delay: 2.5s; animation-duration: 9s; }
.confetti-piece:nth-child(4) { left: 35%; animation-delay: 0.8s; animation-duration: 11s; }
.confetti-piece:nth-child(5) { left: 45%; animation-delay: 3.2s; animation-duration: 8.5s; }
.confetti-piece:nth-child(6) { left: 55%; animation-delay: 1.8s; animation-duration: 10.5s; }
.confetti-piece:nth-child(7) { left: 65%; animation-delay: 2.2s; animation-duration: 9.5s; }
.confetti-piece:nth-child(8) { left: 75%; animation-delay: 0.5s; animation-duration: 8.2s; }
.confetti-piece:nth-child(9) { left: 85%; animation-delay: 2.8s; animation-duration: 10.8s; }

@keyframes confettiFall {
    0% {
        transform: translateY(-20px) rotate(0deg) scale(1);
        opacity: 0;
    }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% {
        transform: translateY(110vh) rotate(720deg) scale(0.5);
        opacity: 0;
    }
}

/* ========== BOKEH LIGHTS ========== */
.bokeh {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
}

.bokeh-circle {
    position: absolute;
    border-radius: 50%;
    opacity: 0;
    animation: bokehFloat 14s ease-in-out infinite;
    filter: blur(2px);
}

.bokeh-circle:nth-child(1) {
    width: 60px; height: 60px;
    top: 20%; left: 10%;
    background: radial-gradient(circle, rgba(255, 215, 0, 0.4), transparent 70%);
    animation-delay: 0s;
}
.bokeh-circle:nth-child(2) {
    width: 80px; height: 80px;
    top: 40%; right: 15%;
    background: radial-gradient(circle, rgba(255, 107, 157, 0.4), transparent 70%);
    animation-delay: 2s;
}
.bokeh-circle:nth-child(3) {
    width: 50px; height: 50px;
    top: 60%; left: 20%;
    background: radial-gradient(circle, rgba(255, 179, 71, 0.4), transparent 70%);
    animation-delay: 4s;
}
.bokeh-circle:nth-child(4) {
    width: 70px; height: 70px;
    top: 30%; left: 60%;
    background: radial-gradient(circle, rgba(233, 30, 99, 0.3), transparent 70%);
    animation-delay: 1s;
}
.bokeh-circle:nth-child(5) {
    width: 55px; height: 55px;
    top: 75%; right: 25%;
    background: radial-gradient(circle, rgba(255, 215, 0, 0.35), transparent 70%);
    animation-delay: 3s;
}

@keyframes bokehFloat {
    0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
    20% { opacity: 0.8; }
    50% { opacity: 0.6; transform: translate(30px, -30px) scale(1.2); }
    80% { opacity: 0.4; }
    100% { opacity: 0; transform: translate(-20px, -60px) scale(0.8); }
}

/* ========== FIREWORKS ========== */
.fireworks {
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    overflow: hidden;
}

.firework {
    position: absolute;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    opacity: 0;
}

.firework.burst-1 {
    top: 10%; left: 20%;
    background: radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(255, 107, 157, 0.2) 30%, transparent 70%);
    animation: fireworkBurst 6s ease-in-out infinite;
    animation-delay: 0s;
}
.firework.burst-2 {
    top: 15%; right: 25%;
    background: radial-gradient(circle, rgba(255, 107, 157, 0.4) 0%, rgba(255, 215, 0, 0.2) 30%, transparent 70%);
    animation: fireworkBurst 7s ease-in-out infinite;
    animation-delay: 2s;
}
.firework.burst-3 {
    top: 5%; left: 50%;
    transform: translateX(-50%);
    background: radial-gradient(circle, rgba(255, 179, 71, 0.4) 0%, rgba(233, 30, 99, 0.2) 30%, transparent 70%);
    animation: fireworkBurst 8s ease-in-out infinite;
    animation-delay: 4s;
}

@keyframes fireworkBurst {
    0% { opacity: 0; transform: scale(0.3) rotate(0deg); }
    20% { opacity: 1; transform: scale(1.2) rotate(30deg); }
    40% { opacity: 0.8; transform: scale(1.5) rotate(60deg); }
    60% { opacity: 0.6; transform: scale(1.8) rotate(90deg); }
    80% { opacity: 0.3; transform: scale(2) rotate(120deg); }
    100% { opacity: 0; transform: scale(2.5) rotate(180deg); }
}

/* ========== LIVE TICKER ========== */
.live-ticker {
    position: fixed;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(26, 8, 69, 0.75);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1.5px solid rgba(255, 215, 0, 0.4);
    border-radius: 40px;
    padding: 8px 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    z-index: 100;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.15);
    max-width: calc(100% - 20px);
    animation: tickerGlow 3s ease-in-out infinite;
}

@keyframes tickerGlow {
    0%, 100% { box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.15); }
    50% { box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 35px rgba(255, 215, 0, 0.35); }
}

.ticker-dot {
    width: 8px;
    height: 8px;
    background: #ff6b9d;
    border-radius: 50%;
    box-shadow: 0 0 12px #ff6b9d;
    animation: pulseDot 1.2s infinite;
    flex-shrink: 0;
}

@keyframes pulseDot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(0.8); }
}

.ticker-content {
    overflow: hidden;
    text-align: center;
}

.ticker-text {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: 'Fredoka', sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: #ffe0b2;
    white-space: nowrap;
}

.ticker-text i {
    color: #ffd700;
    font-size: 10px;
}

.ticker-amount {
    color: #ffd700;
    font-weight: 700;
}

.ticker-badge {
    background: linear-gradient(135deg, #ff6b9d, #ff4081);
    padding: 3px 12px;
    border-radius: 20px;
    font-family: 'Baloo 2', sans-serif;
    font-size: 9px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 1.5px;
    flex-shrink: 0;
    box-shadow: 0 0 15px rgba(255, 107, 157, 0.5);
}

/* ============================================================
   MAIN CARD — DISNEY-PIXAR MEXICAN FIESTA
   ============================================================ */
.main-card {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: linear-gradient(160deg, #6a1b9a 0%, #4a148c 50%, #2a0845 100%);
    border-radius: 28px;
    padding: 0;
    text-align: center;
    z-index: 10;
    border: 2px solid rgba(255, 215, 0, 0.5);
    box-shadow:
        0 25px 80px rgba(0, 0, 0, 0.6),
        0 0 60px rgba(255, 107, 157, 0.3),
        0 0 120px rgba(255, 215, 0, 0.15),
        inset 0 0 60px rgba(255, 215, 0, 0.05);
    overflow: hidden;
    animation: cardFloat 4s ease-in-out infinite;
}

@keyframes cardFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
}

/* ✅ PIÑATA BACKGROUND IMAGE (sa itaas ng card) */
.card-bg-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 45%;
    z-index: 0;
    background-image: url('../images/pinata.jpg');
    background-size: cover;
    background-position: center top;
    background-repeat: no-repeat;
    opacity: 0.85;
    pointer-events: none;
    mask-image: linear-gradient(180deg, #000 0%, #000 60%, transparent 100%);
    -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 60%, transparent 100%);
}

/* ✅ DARK OVERLAY FOR READABILITY */
.card-bg-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
        180deg,
        rgba(42, 8, 69, 0.4) 0%,
        rgba(74, 20, 140, 0.7) 40%,
        rgba(42, 8, 69, 0.95) 100%
    );
    pointer-events: none;
}

/* ✅ ANIMATED BORDER */
.main-card::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 30px;
    padding: 2px;
    background: conic-gradient(
        from var(--angle, 0deg),
        rgba(255, 215, 0, 0.6),
        rgba(255, 107, 157, 0.6),
        rgba(255, 215, 0, 0.6),
        rgba(255, 107, 157, 0.6),
        rgba(255, 215, 0, 0.6)
    );
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    z-index: 3;
    animation: borderRotate 8s linear infinite;
}

@property --angle {
    syntax: '<angle>';
    initial-value: 0deg;
    inherits: false;
}

@keyframes borderRotate {
    to { --angle: 360deg; }
}

/* ✅ CARD CONTENT ABOVE BACKGROUND */
.card-content {
    position: relative;
    z-index: 2;
    padding: 32px 24px 28px;
}

/* ========== CORNER DECORATIONS ========== */
.corner-deco {
    position: absolute;
    font-size: 18px;
    opacity: 0.7;
    animation: decoFloat 3s ease-in-out infinite;
    z-index: 4;
    filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.6));
}
.corner-deco.tl { top: 16px; left: 20px; animation-delay: 0s; }
.corner-deco.tr { top: 16px; right: 20px; animation-delay: 1s; }
.corner-deco.bl { bottom: 16px; left: 20px; animation-delay: 2s; }
.corner-deco.br { bottom: 16px; right: 20px; animation-delay: 1.5s; }

@keyframes decoFloat {
    0%, 100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 0.6; }
    50% { transform: translateY(-5px) scale(1.15) rotate(10deg); opacity: 1; }
}

/* ========== LOGO AREA ========== */
.logo-area {
    margin-bottom: 20px;
}

.logo-icon {
    width: 88px;
    height: 88px;
    background: radial-gradient(circle at 30% 30%, #ff6b9d, #e91e63);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 14px;
    border: 3px solid #ffd700;
    box-shadow:
        0 0 30px rgba(255, 215, 0, 0.5),
        0 0 60px rgba(255, 107, 157, 0.4),
        inset 0 0 20px rgba(0, 0, 0, 0.3);
    position: relative;
    animation: logoPulse 3s ease-in-out infinite;
}

@keyframes logoPulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.logo-ring {
    position: absolute;
    inset: -8px;
    border-radius: 50%;
    border: 2px dashed rgba(255, 215, 0, 0.5);
    animation: ringSpin 15s linear infinite;
}

@keyframes ringSpin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.logo-icon i {
    font-size: 38px;
    color: #fff;
    filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.8));
}

.logo-text {
    font-family: 'Pacifico', cursive;
    font-size: 32px;
    font-weight: 400;
    background: linear-gradient(180deg, #ffd700 0%, #ffb347 50%, #ff6b9d 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    line-height: 1.1;
    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.7));
    margin-bottom: 4px;
}

.logo-text-sub {
    font-family: 'Cinzel', serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 8px;
    background: linear-gradient(180deg, #ff6b9d, #e91e63);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 4px;
}

.logo-sub {
    font-family: 'Fredoka', sans-serif;
    font-size: 10px;
    color: rgba(255, 224, 178, 0.8);
    letter-spacing: 4px;
    font-weight: 500;
}

/* ========== VALUE PROPS ========== */
.value-props {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 18px;
    text-align: left;
    background: rgba(42, 8, 69, 0.6);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    padding: 16px 14px;
    border-radius: 18px;
    border: 1px solid rgba(255, 215, 0, 0.25);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.prop-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px solid rgba(255, 215, 0, 0.1);
}

.prop-row:last-child {
    border-bottom: none;
}

.prop-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #ff6b9d, #e91e63);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(255, 215, 0, 0.5);
    box-shadow: 0 0 15px rgba(255, 107, 157, 0.4);
    flex-shrink: 0;
}

.prop-icon i {
    font-size: 16px;
    color: #fff;
    filter: drop-shadow(0 0 5px rgba(255, 215, 0, 0.6));
}

.prop-title {
    font-family: 'Baloo 2', sans-serif;
    font-size: 13px;
    font-weight: 700;
    color: #ffe0b2;
    letter-spacing: 0.3px;
    margin-bottom: 2px;
}

.prop-desc {
    font-family: 'Fredoka', sans-serif;
    font-size: 10px;
    color: rgba(255, 224, 178, 0.7);
    font-weight: 400;
    line-height: 1.4;
}

/* ============================================================
   7-DAY TREND DASHBOARD
   ============================================================ */
.trend-dashboard {
    background: rgba(26, 8, 69, 0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1.5px solid rgba(255, 215, 0, 0.3);
    border-radius: 18px;
    padding: 14px;
    margin-bottom: 18px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.trend-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.trend-title {
    font-family: 'Baloo 2', sans-serif;
    font-size: 11px;
    font-weight: 700;
    color: #ffd700;
    letter-spacing: 1.5px;
    display: flex;
    align-items: center;
    gap: 6px;
    text-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
}

.trend-live-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    background: rgba(255, 107, 157, 0.2);
    border: 1px solid rgba(255, 107, 157, 0.5);
    border-radius: 20px;
    padding: 3px 10px;
    font-family: 'Fredoka', sans-serif;
    font-size: 8px;
    font-weight: 700;
    color: #ff6b9d;
    letter-spacing: 1.5px;
}

.trend-live-badge .live-dot {
    width: 5px;
    height: 5px;
    background: #ff6b9d;
    border-radius: 50%;
    box-shadow: 0 0 8px #ff6b9d;
    animation: pulseDot 1.2s infinite;
}

.trend-graph-container {
    background: rgba(26, 8, 69, 0.5);
    border: 1px solid rgba(255, 215, 0, 0.15);
    border-radius: 12px;
    padding: 14px 10px 10px;
    margin-bottom: 12px;
}

.trend-graph {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    height: 80px;
    gap: 5px;
}

.graph-loading {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: rgba(255, 224, 178, 0.5);
    font-family: 'Fredoka', sans-serif;
    font-size: 10px;
    letter-spacing: 1px;
}

.trend-stats-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.trend-stat-card {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(26, 8, 69, 0.6);
    border: 1px solid rgba(255, 215, 0, 0.2);
    border-radius: 12px;
    padding: 10px 12px;
}

.trend-stat-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
}

.trend-stat-icon.blue {
    background: rgba(79, 195, 247, 0.2);
    border: 1.5px solid rgba(79, 195, 247, 0.5);
    color: #4fc3f7;
}

.trend-stat-icon.green {
    background: rgba(57, 255, 20, 0.15);
    border: 1.5px solid rgba(57, 255, 20, 0.4);
    color: #39ff14;
}

.trend-stat-content {
    flex: 1;
    min-width: 0;
}

.trend-stat-label {
    font-family: 'Fredoka', sans-serif;
    font-size: 8px;
    color: rgba(255, 224, 178, 0.6);
    letter-spacing: 1px;
    margin-bottom: 2px;
}

.trend-stat-value {
    font-family: 'Baloo 2', sans-serif;
    font-size: 18px;
    font-weight: 800;
    color: #fff;
    line-height: 1;
    margin-bottom: 3px;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
}

.trend-stat-sub {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: 'Fredoka', sans-serif;
    font-size: 8px;
    color: rgba(255, 224, 178, 0.5);
    font-weight: 500;
}

.stat-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
}

.stat-dot.blue { background: #4fc3f7; box-shadow: 0 0 5px #4fc3f7; }
.stat-dot.green { background: #39ff14; box-shadow: 0 0 5px #39ff14; }

/* ============================================================
   ✅ REMASTERED VERIFICATION SECTION
   ============================================================ */
.verification-section {
    background: linear-gradient(135deg, rgba(42, 8, 69, 0.9), rgba(74, 20, 140, 0.85));
    border: 2px solid rgba(255, 215, 0, 0.5);
    border-radius: 20px;
    padding: 24px 18px 20px;
    margin-bottom: 16px;
    position: relative;
    box-shadow:
        0 0 30px rgba(255, 215, 0, 0.15),
        inset 0 0 30px rgba(255, 107, 157, 0.05);
    overflow: hidden;
}

.verification-section::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.1), transparent);
    animation: verificationShine 4s infinite;
    pointer-events: none;
}

@keyframes verificationShine {
    0% { left: -100%; }
    60% { left: 100%; }
    100% { left: 100%; }
}

.verification-header {
    text-align: center;
    margin-bottom: 18px;
    position: relative;
    z-index: 2;
}

.verification-badge {
    width: 56px;
    height: 56px;
    background: linear-gradient(135deg, #ffd700, #ffb347);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
    border: 3px solid #fff;
    box-shadow:
        0 0 25px rgba(255, 215, 0, 0.6),
        0 0 50px rgba(255, 107, 157, 0.3);
    animation: badgePulse 2.5s ease-in-out infinite;
}

@keyframes badgePulse {
    0%, 100% { transform: scale(1); box-shadow: 0 0 25px rgba(255, 215, 0, 0.6), 0 0 50px rgba(255, 107, 157, 0.3); }
    50% { transform: scale(1.08); box-shadow: 0 0 40px rgba(255, 215, 0, 0.9), 0 0 70px rgba(255, 107, 157, 0.5); }
}

.verification-badge i {
    font-size: 24px;
    color: #4a148c;
    filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.8));
}

.verification-title {
    font-family: 'Pacifico', cursive;
    font-size: 26px;
    font-weight: 400;
    background: linear-gradient(180deg, #ffd700, #ff6b9d);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 6px;
    letter-spacing: 1px;
    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6));
    line-height: 1.2;
}

.verification-subtitle {
    font-family: 'Fredoka', sans-serif;
    font-size: 12px;
    color: rgba(255, 224, 178, 0.85);
    line-height: 1.5;
    font-weight: 400;
}

.verification-subtitle strong {
    color: #ffd700;
    font-weight: 700;
    text-shadow: 0 0 12px rgba(255, 215, 0, 0.6);
}

/* ✅ MOBILE INPUT WRAPPER */
.mobile-input-wrapper {
    position: relative;
    margin-bottom: 14px;
    z-index: 2;
}

.mobile-input-icon {
    position: absolute;
    left: 18px;
    top: 50%;
    transform: translateY(-50%);
    color: #ffd700;
    font-size: 18px;
    pointer-events: none;
    filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.6));
    z-index: 2;
}

.mobile-input {
    width: 100%;
    padding: 18px 18px 18px 52px;
    background: rgba(26, 8, 69, 0.8);
    border: 2px solid rgba(255, 215, 0, 0.4);
    border-radius: 16px;
    color: #fff;
    font-family: 'Baloo 2', sans-serif;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 2px;
    outline: none;
    transition: all 0.3s ease;
    text-align: left;
    box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.3);
}

.mobile-input::placeholder {
    color: rgba(255, 224, 178, 0.4);
    font-family: 'Fredoka', sans-serif;
    font-weight: 400;
    font-size: 15px;
    letter-spacing: 1px;
}

.mobile-input:focus {
    border-color: #ffd700;
    background: rgba(26, 8, 69, 0.95);
    box-shadow:
        0 0 25px rgba(255, 215, 0, 0.4),
        inset 0 2px 10px rgba(0, 0, 0, 0.3);
}

/* ✅ ERROR MESSAGE */
.verification-error {
    display: none;
    align-items: center;
    gap: 8px;
    background: rgba(255, 68, 68, 0.15);
    border: 1.5px solid rgba(255, 68, 68, 0.5);
    border-radius: 12px;
    padding: 10px 14px;
    margin-bottom: 14px;
    color: #ff8888;
    font-family: 'Fredoka', sans-serif;
    font-size: 11px;
    font-weight: 500;
    position: relative;
    z-index: 2;
}

.verification-error i {
    font-size: 14px;
    flex-shrink: 0;
}

@keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
}

/* ✅ SUBMIT BUTTON */
.submit-btn {
    position: relative;
    width: 100%;
    padding: 18px 20px;
    background: linear-gradient(180deg, #ffd700 0%, #ffb347 50%, #ff6b9d 100%);
    border: 3px solid #fff;
    border-radius: 16px;
    font-family: 'Baloo 2', sans-serif;
    font-size: 15px;
    font-weight: 800;
    color: #4a148c;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    box-shadow:
        0 6px 0 #8b4500,
        0 10px 30px rgba(0, 0, 0, 0.5),
        0 0 40px rgba(255, 215, 0, 0.6);
    transition: all 0.15s ease;
    overflow: hidden;
    z-index: 2;
}

.submit-btn::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
    animation: btnShine 2.5s infinite;
}

@keyframes btnShine {
    0% { left: -100%; }
    60% { left: 100%; }
    100% { left: 100%; }
}

.submit-btn:active {
    transform: translateY(5px);
    box-shadow:
        0 0 0 #8b4500,
        0 5px 15px rgba(0, 0, 0, 0.5);
}

.submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
}

.submit-btn i {
    font-size: 16px;
}

/* ✅ TRUST NOTE */
.trust-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 14px;
    font-family: 'Fredoka', sans-serif;
    font-size: 10px;
    color: rgba(255, 224, 178, 0.6);
    letter-spacing: 0.5px;
    position: relative;
    z-index: 2;
}

.trust-note i {
    color: #39ff14;
    font-size: 11px;
    filter: drop-shadow(0 0 6px rgba(57, 255, 20, 0.6));
}

/* ========== CARD FOOTER ========== */
.card-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 215, 0, 0.15);
    font-family: 'Fredoka', sans-serif;
    font-size: 9px;
    color: rgba(255, 224, 178, 0.5);
    letter-spacing: 1.5px;
    font-weight: 500;
}

.card-footer i {
    color: #ffd700;
    font-size: 10px;
    filter: drop-shadow(0 0 6px rgba(255, 215, 0, 0.5));
}

/* ============================================================
   MODAL
   ============================================================ */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(26, 8, 69, 0.95);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    z-index: 99999;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.3s ease;
}

.modal-overlay[style*="display: flex"] {
    display: flex !important;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

.modal-container {
    width: 100%;
    max-width: 360px;
    animation: modalPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes modalPop {
    0% { transform: scale(0.7) rotate(-5deg); opacity: 0; }
    60% { transform: scale(1.05) rotate(2deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

.modal-card {
    background: linear-gradient(160deg, #6a1b9a 0%, #4a148c 50%, #2a0845 100%);
    border: 2px solid #ffd700;
    border-radius: 24px;
    padding: 32px 24px;
    text-align: center;
    box-shadow:
        0 25px 60px rgba(0, 0, 0, 0.7),
        0 0 60px rgba(255, 215, 0, 0.4);
    position: relative;
    overflow: hidden;
}

.modal-icon {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #ffd700, #ff6b9d);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 16px;
    border: 3px solid #fff;
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.8);
    animation: badgePulse 2s ease-in-out infinite;
}

.modal-icon i {
    font-size: 36px;
    color: #4a148c;
    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.8));
}

.modal-title {
    font-family: 'Pacifico', cursive;
    font-size: 28px;
    font-weight: 400;
    background: linear-gradient(180deg, #ffd700, #ff6b9d);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    margin-bottom: 8px;
    filter: drop-shadow(0 0 20px rgba(255, 215, 0, 0.6));
}

.modal-subtitle {
    font-family: 'Fredoka', sans-serif;
    font-size: 13px;
    color: rgba(255, 224, 178, 0.9);
    line-height: 1.6;
    margin-bottom: 20px;
}

.gold-text {
    color: #ffd700;
    font-weight: 700;
    text-shadow: 0 0 15px rgba(255, 215, 0, 0.7);
}

.modal-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px 0;
}

.loading-dots {
    display: flex;
    gap: 8px;
}

.loading-dots span {
    width: 12px;
    height: 12px;
    background: #ffd700;
    border-radius: 50%;
    animation: loadingBounce 1.4s infinite ease-in-out both;
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.8);
}

.loading-dots span:nth-child(1) { animation-delay: -0.32s; }
.loading-dots span:nth-child(2) { animation-delay: -0.16s; }
.loading-dots span:nth-child(3) { animation-delay: 0s; }

@keyframes loadingBounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
    40% { transform: scale(1); opacity: 1; }
}

/* ============================================================
   RESPONSIVE
   ============================================================ */
@media (max-width: 480px) {
    body {
        padding: 60px 10px 20px;
    }

    .main-card {
        border-radius: 24px;
    }

    .card-content {
        padding: 28px 18px 24px;
    }

    .card-bg-image {
        height: 40%;
    }

    .logo-icon {
        width: 76px;
        height: 76px;
    }

    .logo-icon i {
        font-size: 32px;
    }

    .logo-text {
        font-size: 28px;
    }

    .logo-text-sub {
        font-size: 14px;
        letter-spacing: 6px;
    }

    .verification-section {
        padding: 20px 14px 18px;
    }

    .verification-title {
        font-size: 22px;
    }

    .verification-subtitle {
        font-size: 11px;
    }

    .mobile-input {
        padding: 16px 16px 16px 48px;
        font-size: 16px;
    }

    .mobile-input-icon {
        font-size: 16px;
        left: 16px;
    }

    .submit-btn {
        padding: 16px 18px;
        font-size: 13px;
    }

    .live-ticker {
        padding: 6px 14px;
        font-size: 10px;
    }

    .ticker-badge {
        padding: 2px 10px;
        font-size: 8px;
    }

    .trend-stat-value {
        font-size: 16px;
    }
}

@media (max-width: 360px) {
    body {
        padding: 56px 8px 16px;
    }

    .card-content {
        padding: 24px 14px 20px;
    }

    .logo-text {
        font-size: 24px;
    }

    .logo-text-sub {
        font-size: 12px;
        letter-spacing: 5px;
    }

    .verification-title {
        font-size: 20px;
    }

    .mobile-input {
        font-size: 14px;
        padding: 14px 14px 14px 44px;
    }

    .submit-btn {
        font-size: 12px;
        padding: 14px 16px;
    }
}

/* ============================================================
   ACCESSIBILITY
   ============================================================ */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}

button:focus-visible,
input:focus-visible {
    outline: 3px solid #ffd700;
    outline-offset: 3px;
}

/* ============================================================
   SCROLLBAR
   ============================================================ */
::-webkit-scrollbar {
    width: 5px;
}

::-webkit-scrollbar-track {
    background: rgba(42, 8, 69, 0.5);
}

::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #ffd700, #ff6b9d);
    border-radius: 3px;
}
