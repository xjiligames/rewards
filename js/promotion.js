/**
 * Promotion.js - Clean Version (No Install Module, No Referral System)
 * Modules: Main Core, Timer, Ticker, Confetti, LuckyCat (Left)
 */

// ========== MAIN CORE MODULE (with Comma Formatting) ==========
(function() {
    'use strict';
    
    let userPhone = null;
    let db = null;
    let userRef = null;
    let currentBalance = 0;
    
    // Sound cache
    const soundCache = {
        scatter: null,
        claim: null,
        invite: null,
        success: null
    };
    
    function formatNumberWithComma(number) {
        const num = Number(number).toFixed(2);
        const parts = num.split('.');
        const wholePart = parts[0];
        const decimalPart = parts[1];
        const wholeWithCommas = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return wholeWithCommas + '.' + decimalPart;
    }
    
    function initSounds() {
        try {
            soundCache.scatter = new Audio('sounds/super_ace_scatter_ring.mp3');
            soundCache.claim = new Audio('sounds/claim.wav');
            soundCache.invite = new Audio('sounds/invite.mp3');
            soundCache.success = new Audio('sounds/success.wav');
            soundCache.scatter.volume = 0.5;
            soundCache.claim.volume = 0.7;
            soundCache.invite.volume = 0.5;
            soundCache.success.volume = 0.6;
        } catch(e) {
            console.log('Sound initialization failed:', e);
        }
    }
    
    function playSound(soundName) {
        if (soundCache[soundName]) {
            soundCache[soundName].currentTime = 0;
            soundCache[soundName].play().catch(e => console.log('Sound error:', e));
        }
    }
    
    function init() {
        console.log('🎁 Promotion System Starting...');
        
        userPhone = localStorage.getItem("userPhone");
        if (!userPhone) {
            window.location.href = "index.html";
            return;
        }
        
        const phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) {
            const formatted = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
            phoneDisplay.innerText = formatted;
        }
        
        initSounds();
        initFirebase();
        loadUserData();
        
        // Initialize modules
        if (window.TimerModule) window.TimerModule.init();
        if (window.TickerModule) window.TickerModule.init();
        if (window.LuckyCatModule) window.LuckyCatModule.init();
        if (window.ConfettiModule) window.ConfettiModule.init();
        
        // Make right card non-clickable (₱0.00)
        const rightCard = document.getElementById('rightCard');
        if (rightCard) {
            rightCard.style.cursor = 'default';
            rightCard.style.opacity = '0.7';
            rightCard.style.pointerEvents = 'none';
        }
        
        const rightReward = document.getElementById('rightRewardAmountDisplay');
        if (rightReward) {
            rightReward.innerHTML = '₱0.00';
        }
        
        console.log('✅ All systems ready!');
    }
    
    function initFirebase() {
        if (typeof firebaseConfig === 'undefined') {
            console.error('Firebase config not found!');
            return;
        }
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            userRef = db.ref('user_sessions/' + userPhone);
        } catch(e) { 
            console.error('Firebase error:', e); 
        }
    }
    
    function loadUserData() {
        if (!userRef) return;
        
        userRef.once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                currentBalance = data.balance || 0;
                if (window.LuckyCatModule) {
                    window.LuckyCatModule.setClaimed(data.claimed_luckycat || false);
                }
            } else {
                currentBalance = 0;
                userRef.set({ 
                    phone: userPhone, 
                    balance: 0, 
                    claimed_luckycat: false, 
                    status: "active", 
                    created_at: Date.now() 
                });
            }
            updateBalanceDisplay();
        }).catch(e => console.error('Load user error:', e));
        
        userRef.child('balance').on('value', (snapshot) => {
            const balance = snapshot.val();
            if (balance !== null && balance !== undefined) {
                currentBalance = Number(balance);
                updateBalanceDisplay();
            }
        });
    }
    
    function updateBalanceDisplay() {
        const balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.innerText = formatNumberWithComma(currentBalance);
        }
        const popupBalance = document.getElementById('popupBalanceAmount');
        if (popupBalance) {
            popupBalance.innerText = "₱" + formatNumberWithComma(currentBalance);
        }
    }
    
    function animateBalanceSlow(start, end, duration, callback) {
        let startTimestamp = null;
        function step(timestamp) {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const val = Math.floor(easeProgress * (end - start) + start);
            const balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) balanceEl.innerText = formatNumberWithComma(val);
            const popupBalance = document.getElementById('popupBalanceAmount');
            if (popupBalance) popupBalance.innerText = "₱" + formatNumberWithComma(val);
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                if (callback) callback();
            }
        }
        requestAnimationFrame(step);
    }
    
    function addToBalance(amount, slowAnimation = false) {
        const oldBalance = currentBalance;
        const newBalance = oldBalance + amount;
        if (slowAnimation) {
            animateBalanceSlow(oldBalance, newBalance, 2000, () => {
                currentBalance = newBalance;
                if (userRef) userRef.update({ balance: currentBalance, lastUpdate: Date.now() });
                updateBalanceDisplay();
            });
        } else {
            currentBalance = newBalance;
            updateBalanceDisplay();
            if (userRef) userRef.update({ balance: currentBalance, lastUpdate: Date.now() });
        }
        const balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.style.transform = 'scale(1.1)';
            setTimeout(() => { if (balanceEl) balanceEl.style.transform = 'scale(1)'; }, 200);
        }
    }
    
    window.PromotionCore = {
        addToBalance: addToBalance,
        animateBalanceSlow: animateBalanceSlow,
        playSound: playSound,
        getBalance: () => currentBalance,
        getUserPhone: () => userPhone,
        getUserRef: () => userRef,
        formatNumberWithComma: formatNumberWithComma
    };
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

// ========== MODULE 1: TIMER ==========
window.TimerModule = (function() {
    'use strict';
    let timerInterval = null;
    let timerEndDate = null;
    let displayElement = null;
    const CYCLE_HOURS = 72;
    
    function init() {
        displayElement = document.getElementById('mainTimerDisplay');
        if (!displayElement) return;
        try {
            const savedEnd = localStorage.getItem('timerEndDate');
            const now = Date.now();
            if (savedEnd && parseInt(savedEnd) > now) {
                timerEndDate = parseInt(savedEnd);
            } else {
                timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                localStorage.setItem('timerEndDate', timerEndDate);
            }
            start();
        } catch(e) { console.error('Timer error:', e); }
    }
    
    function start() {
        if (timerInterval) clearInterval(timerInterval);
        function update() {
            try {
                const now = Date.now();
                let diff = timerEndDate - now;
                if (diff <= 0) {
                    timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                    localStorage.setItem('timerEndDate', timerEndDate);
                    diff = CYCLE_HOURS * 60 * 60 * 1000;
                }
                const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                const minutes = Math.floor((diff / (1000 * 60)) % 60);
                const seconds = Math.floor((diff / 1000) % 60);
                if (displayElement) {
                    displayElement.innerHTML = `${days}D ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                }
            } catch(e) { console.error('Timer update error:', e); }
        }
        update();
        timerInterval = setInterval(update, 1000);
    }
    return { init: init };
})();

// ========== MODULE 2: TICKER ==========
window.TickerModule = (function() {
    'use strict';
    let winnerSpan = null;
    let interval = null;
    const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];
    const amountRarity = [
        { amount: 150, weight: 20 }, { amount: 300, weight: 18 }, { amount: 450, weight: 15 },
        { amount: 600, weight: 12 }, { amount: 750, weight: 10 }, { amount: 900, weight: 8 },
        { amount: 1050, weight: 6 }, { amount: 1200, weight: 4 }, { amount: 1350, weight: 3 }, { amount: 1500, weight: 2 }
    ];
    function generateRandomAmount() {
        let totalWeight = 0;
        for (let i = 0; i < amountRarity.length; i++) totalWeight += amountRarity[i].weight;
        const random = Math.random() * totalWeight;
        let cumulative = 0;
        for (let i = 0; i < amountRarity.length; i++) {
            cumulative += amountRarity[i].weight;
            if (random <= cumulative) return amountRarity[i].amount;
        }
        return 150;
    }
    function generateWinner() {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const last4 = Math.floor(1000 + Math.random() * 9000);
        const amount = generateRandomAmount();
        return `${prefix}***${last4} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${amount}`;
    }
    function update() { if (winnerSpan) winnerSpan.innerHTML = generateWinner(); }
    function init() {
        winnerSpan = document.getElementById('winnerText');
        if (!winnerSpan) return;
        update();
        if (interval) clearInterval(interval);
        interval = setInterval(update, 15000);
    }
    return { init: init };
})();

// ========== MODULE 3: CONFETTI ==========
window.ConfettiModule = (function() {
    'use strict';
    let canvas = null;
    let animation = null;
    let timeout = null;
    function init() { canvas = document.getElementById('confettiCanvas'); }
    function start() {
        if (!canvas) return;
        stop();
        canvas.style.display = 'block';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');
        const particles = [];
        for (let i = 0; i < 100; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 6 + 2,
                color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                speed: Math.random() * 3 + 2
            });
        }
        function draw() {
            if (!canvas || canvas.style.display === 'none') return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
                p.y += p.speed;
                if (p.y > canvas.height) { p.y = -p.size; p.x = Math.random() * canvas.width; }
            });
            animation = requestAnimationFrame(draw);
        }
        draw();
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(stop, 3000);
    }
    function stop() {
        if (animation) cancelAnimationFrame(animation);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
        }
        if (timeout) clearTimeout(timeout);
    }
    init();
    return { start: start, stop: stop };
})();

// ========== MODULE 4: LEFT LUCKY CAT ==========
window.LuckyCatModule = (function() {
    'use strict';
    let leftCard = null;
    let leftReward = null;
    let leftLabel = null;
    let isClaimed = false;
    let claimInProgress = false;
    
    function init() {
        leftCard = document.getElementById('leftCard');
        leftReward = document.getElementById('leftRewardAmount');
        leftLabel = document.querySelector('#leftCard .prize-label');
        if (leftReward) {
            leftReward.innerHTML = '+₱150';
            leftReward.style.fontSize = '18px';
            leftReward.style.color = '#ffd700';
            leftReward.style.fontWeight = 'bold';
        }
        if (leftLabel && !isClaimed) leftLabel.innerHTML = 'YOU GET';
        if (leftCard) {
            const newCard = leftCard.cloneNode(true);
            leftCard.parentNode.replaceChild(newCard, leftCard);
            leftCard = newCard;
            leftCard.addEventListener('click', handleClaim);
            leftReward = document.getElementById('leftRewardAmount');
            leftLabel = document.querySelector('#leftCard .prize-label');
            const leftVideo = document.getElementById('leftCatVideo');
            if (leftVideo) {
                leftCard.addEventListener('click', function() {
                    if (leftVideo && leftVideo.muted) {
                        leftVideo.muted = false;
                        leftVideo.volume = 0.35;
                        leftVideo.play().catch(e => console.log(e));
                    }
                }, { once: true });
            }
        }
        checkClaimStatus();
        console.log('✅ LuckyCat Module ready');
    }
    
    async function checkClaimStatus() {
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        if (!userRef) { setTimeout(checkClaimStatus, 500); return; }
        try {
            const snapshot = await userRef.once('value');
            const data = snapshot.val();
            if (data && data.claimed_luckycat === true) { isClaimed = true; updateUI(); }
        } catch(error) { console.error('Error checking claim status:', error); }
    }
    
    function handleClaim(e) {
        e.preventDefault();
        e.stopPropagation();
        if (isClaimed) { alert("You have already claimed the Lucky Cat bonus!"); return; }
        if (claimInProgress) { alert("Please wait, processing your claim..."); return; }
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        if (userRef) {
            userRef.once('value', (snapshot) => {
                const data = snapshot.val();
                if (data && data.claimed_luckycat === true) { isClaimed = true; updateUI(); alert("You have already claimed the Lucky Cat bonus!"); return; }
                processClaim();
            }).catch(() => processClaim());
        } else { processClaim(); }
    }
    
    function processClaim() {
        claimInProgress = true;
        if (leftCard) { leftCard.style.pointerEvents = 'none'; leftCard.style.opacity = '0.8'; }
        if (window.PromotionCore) { window.PromotionCore.playSound('claim'); window.PromotionCore.addToBalance(150, true); }
        if (window.ConfettiModule) window.ConfettiModule.start();
        isClaimed = true;
        updateUI();
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        if (userRef) userRef.update({ claimed_luckycat: true, luckycat_claimed_at: Date.now() }).catch(e => console.error('Firebase save error:', e));
        setTimeout(() => { alert("🎉 Congratulations! You received ₱150 bonus!"); }, 500);
        setTimeout(() => { claimInProgress = false; }, 2500);
    }
    
    function updateUI() {
        if (leftLabel) { leftLabel.innerHTML = isClaimed ? 'ALREADY' : 'YOU GET'; leftLabel.style.color = isClaimed ? '#ffd700' : '#ffd966'; leftLabel.style.fontSize = isClaimed ? '10px' : '11px'; }
        if (leftReward) {
            if (isClaimed) { leftReward.innerHTML = 'CLAIMED'; leftReward.style.fontSize = '12px'; leftReward.style.letterSpacing = '2px'; leftReward.style.animation = 'none'; } 
            else { leftReward.innerHTML = '+₱150'; leftReward.style.fontSize = '18px'; leftReward.style.animation = 'pulse-attract 1.5s infinite'; }
        }
        if (leftCard) {
            if (isClaimed) { leftCard.classList.add('prize-card-claimed'); leftCard.style.cursor = 'default'; leftCard.style.pointerEvents = 'none'; } 
            else { leftCard.classList.remove('prize-card-claimed'); leftCard.style.cursor = 'pointer'; leftCard.style.pointerEvents = 'auto'; }
        }
    }
    
    function setClaimed(claimed) { isClaimed = claimed; updateUI(); }
    function getClaimed() { return isClaimed; }
    return { init: init, setClaimed: setClaimed, getClaimed: getClaimed };
})();

// ========== ADMIN FORCE LOGOUT LISTENER ==========
(function() {
    'use strict';
    let logoutListenerRef = null;
    
    function showStylishPopupV2(title, message, icon, callback) {
        const existing = document.querySelector('.stylish-logout-popup-v2');
        if (existing) existing.remove();
        const overlay = document.createElement('div');
        overlay.className = 'stylish-logout-popup-v2';
        overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(ellipse at center, rgba(20, 0, 0, 0.95), rgba(0, 0, 0, 0.98)); backdrop-filter: blur(15px); z-index: 99999; display: flex; align-items: center; justify-content: center; animation: fadeInV2 0.4s ease;`;
        const particles = document.createElement('div');
        particles.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden;`;
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            const size = Math.random() * 4 + 2;
            const startX = Math.random() * 100;
            const delay = Math.random() * 3;
            const duration = Math.random() * 3 + 2;
            particle.style.cssText = `position: absolute; top: -10px; left: ${startX}%; width: ${size}px; height: ${size}px; background: rgba(212, 175, 55, ${Math.random() * 0.5 + 0.3}); border-radius: 50%; animation: floatDownV2 ${duration}s ${delay}s linear infinite; box-shadow: 0 0 ${size * 2}px rgba(212, 175, 55, 0.5);`;
            particles.appendChild(particle);
        }
        overlay.appendChild(particles);
        const cardWrapper = document.createElement('div');
        cardWrapper.style.cssText = `position: relative; z-index: 1; animation: cardEnterV2 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);`;
        const glowRing = document.createElement('div');
        glowRing.style.cssText = `position: absolute; top: -3px; left: -3px; right: -3px; bottom: -3px; border-radius: 28px; background: conic-gradient(from 0deg, transparent, rgba(212, 175, 55, 0.6), transparent, rgba(212, 175, 55, 0.3), transparent); animation: rotateGlowV2 4s linear infinite; filter: blur(2px);`;
        cardWrapper.appendChild(glowRing);
        const card = document.createElement('div');
        card.style.cssText = `position: relative; background: linear-gradient(160deg, #0a0a0a 0%, #161616 40%, #0d0d0d 100%); border: 2px solid rgba(212, 175, 55, 0.5); border-radius: 24px; padding: 35px 28px 28px; text-align: center; max-width: 360px; width: 85%; box-shadow: 0 30px 60px rgba(0, 0, 0, 0.9), 0 0 50px rgba(212, 175, 55, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.03); overflow: hidden;`;
        const accentLine = document.createElement('div');
        accentLine.style.cssText = `position: absolute; top: 0; left: 20%; right: 20%; height: 3px; background: linear-gradient(90deg, transparent, #d4af37, #fcf6ba, #d4af37, transparent); border-radius: 0 0 3px 3px;`;
        card.appendChild(accentLine);
        const pattern = document.createElement('div');
        pattern.style.cssText = `position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: radial-gradient(circle at 20% 30%, rgba(212, 175, 55, 0.03) 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(212, 175, 55, 0.03) 1px, transparent 1px); background-size: 40px 40px; pointer-events: none;`;
        card.appendChild(pattern);
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `position: relative; width: 80px; height: 80px; margin: 0 auto 16px; z-index: 1;`;
        const iconRing = document.createElement('div');
        iconRing.style.cssText = `position: absolute; top: -8px; left: -8px; right: -8px; bottom: -8px; border-radius: 50%; border: 2px dashed rgba(212, 175, 55, 0.4); animation: spinSlowV2 10s linear infinite;`;
        iconContainer.appendChild(iconRing);
        const iconBg = document.createElement('div');
        iconBg.style.cssText = `width: 80px; height: 80px; background: radial-gradient(circle, rgba(40, 10, 10, 0.9), rgba(5, 5, 5, 0.95)); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #d4af37; box-shadow: 0 0 25px rgba(212, 175, 55, 0.4), inset 0 0 20px rgba(212, 175, 55, 0.1); position: relative;`;
        const iconEl = document.createElement('span');
        iconEl.style.cssText = `font-size: 40px; animation: bounceIconV2 0.8s ease; filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.6));`;
        iconEl.textContent = icon || '⚠️';
        iconBg.appendChild(iconEl);
        iconContainer.appendChild(iconBg);
        card.appendChild(iconContainer);
        const badge = document.createElement('div');
        badge.style.cssText = `display: inline-block; background: rgba(255, 68, 68, 0.15); border: 1px solid rgba(255, 68, 68, 0.4); border-radius: 20px; padding: 4px 14px; margin-bottom: 10px; font-family: 'Orbitron', monospace; font-size: 9px; font-weight: 700; color: #ff6666; letter-spacing: 2px; text-transform: uppercase; position: relative; z-index: 1; animation: pulseBadgeV2 2s infinite;`;
        badge.textContent = '● Session Ended';
        card.appendChild(badge);
        const titleEl = document.createElement('h2');
        titleEl.style.cssText = `font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 900; background: linear-gradient(to bottom, #fcf6ba 0%, #d4af37 50%, #aa771c 100%); -webkit-background-clip: text; background-clip: text; color: transparent; margin: 0 0 8px 0; letter-spacing: 2px; text-transform: uppercase; position: relative; z-index: 1;`;
        titleEl.textContent = title;
        card.appendChild(titleEl);
        const dividerContainer = document.createElement('div');
        dividerContainer.style.cssText = `display: flex; align-items: center; justify-content: center; gap: 10px; margin: 0 auto 16px; position: relative; z-index: 1;`;
        const lineLeft = document.createElement('div');
        lineLeft.style.cssText = `width: 50px; height: 1px; background: linear-gradient(90deg, transparent, #d4af37);`;
        const diamond = document.createElement('div');
        diamond.style.cssText = `width: 8px; height: 8px; background: #d4af37; transform: rotate(45deg); box-shadow: 0 0 8px rgba(212, 175, 55, 0.6);`;
        const lineRight = document.createElement('div');
        lineRight.style.cssText = `width: 50px; height: 1px; background: linear-gradient(90deg, #d4af37, transparent);`;
        dividerContainer.appendChild(lineLeft);
        dividerContainer.appendChild(diamond);
        dividerContainer.appendChild(lineRight);
        card.appendChild(dividerContainer);
        const msgEl = document.createElement('div');
        msgEl.style.cssText = `font-family: 'Poppins', sans-serif; font-size: 14px; color: #bbb; line-height: 1.7; margin: 0 0 8px 0; position: relative; z-index: 1;`;
        const formattedMessage = message.replace(/verified GCash Account/gi, '<strong style="color:#fce883;">verified GCash Account</strong>').replace(/instant withdrawal/gi, '<strong style="color:#ffd700;">instant withdrawal</strong>').replace(/unsuccessful/gi, '<span style="color:#ff6666;">unsuccessful</span>');
        msgEl.innerHTML = formattedMessage.replace(/\n/g, '<br>');
        card.appendChild(msgEl);
        const infoBox = document.createElement('div');
        infoBox.style.cssText = `background: rgba(212, 175, 55, 0.05); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 10px; padding: 10px 14px; margin: 12px 0 20px; font-family: 'Poppins', sans-serif; font-size: 11px; color: #999; text-align: left; position: relative; z-index: 1;`;
        infoBox.innerHTML = `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"><span style="font-size: 18px;">💡</span><span style="color:#ccc; font-weight: 600;">Tip for successful withdrawal:</span></div><span>Make sure your GCash account is <strong style="color:#22C55E;">fully verified</strong> with the same mobile number.</span>`;
        card.appendChild(infoBox);
        const btn = document.createElement('button');
        btn.style.cssText = `width: 100%; background: linear-gradient(to bottom, #d4af37, #b8860b); border: 1px solid #fcf6ba; border-radius: 10px; padding: 14px 24px; font-family: 'Orbitron', monospace; font-size: 13px; font-weight: 800; color: #1a1100; cursor: pointer; letter-spacing: 2px; text-shadow: 1px 1px 0 rgba(255,255,255,0.2); box-shadow: 0 4px 0 #8b6914, 0 8px 20px rgba(0,0,0,0.4); transition: all 0.15s ease; position: relative; z-index: 1; overflow: hidden;`;
        const btnShimmer = document.createElement('div');
        btnShimmer.style.cssText = `position: absolute; top: -50%; left: -60%; width: 30%; height: 200%; background: rgba(255, 255, 255, 0.2); transform: rotate(30deg); animation: btnShineV2 3s infinite;`;
        btn.appendChild(btnShimmer);
        const btnText = document.createElement('span');
        btnText.style.cssText = `position: relative; z-index: 1;`;
        btnText.textContent = 'GOT IT';
        btn.appendChild(btnText);
        btn.addEventListener('mouseenter', function() { this.style.transform = 'translateY(-2px)'; this.style.boxShadow = '0 6px 0 #8b6914, 0 12px 25px rgba(0,0,0,0.5), 0 0 30px rgba(212, 175, 55, 0.3)'; });
        btn.addEventListener('mouseleave', function() { this.style.transform = 'translateY(0)'; this.style.boxShadow = '0 4px 0 #8b6914, 0 8px 20px rgba(0,0,0,0.4)'; });
        btn.addEventListener('mousedown', function() { this.style.transform = 'translateY(4px)'; this.style.boxShadow = '0 0 0 #8b6914, 0 4px 10px rgba(0,0,0,0.4)'; });
        btn.addEventListener('click', function() { overlay.style.animation = 'fadeOutV2 0.3s ease forwards'; cardWrapper.style.animation = 'cardExitV2 0.3s ease forwards'; setTimeout(() => { overlay.remove(); if (callback) callback(); }, 300); });
        card.appendChild(btn);
        cardWrapper.appendChild(card);
        overlay.appendChild(cardWrapper);
        document.body.appendChild(overlay);
    }
    
    function addAnimationsV2() {
        if (document.querySelector('#force-logout-styles-v2')) return;
        const style = document.createElement('style');
        style.id = 'force-logout-styles-v2';
        style.textContent = `@keyframes fadeInV2{from{opacity:0}to{opacity:1}}@keyframes fadeOutV2{from{opacity:1}to{opacity:0}}@keyframes cardEnterV2{0%{transform:scale(0.7) translateY(30px);opacity:0}60%{transform:scale(1.03) translateY(-5px)}100%{transform:scale(1) translateY(0);opacity:1}}@keyframes cardExitV2{from{transform:scale(1);opacity:1}to{transform:scale(0.8) translateY(20px);opacity:0}}@keyframes bounceIconV2{0%{transform:scale(0) rotate(-30deg)}50%{transform:scale(1.3) rotate(10deg)}70%{transform:scale(0.85)}100%{transform:scale(1) rotate(0deg)}}@keyframes rotateGlowV2{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes spinSlowV2{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes floatDownV2{0%{transform:translateY(-10px);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateY(105vh);opacity:0}}@keyframes pulseBadgeV2{0%,100%{opacity:1}50%{opacity:0.6}}@keyframes btnShineV2{0%{left:-60%}20%{left:120%}100%{left:120%}}`;
        document.head.appendChild(style);
    }
    
    function init() {
        addAnimationsV2();
        const userPhone = localStorage.getItem('userPhone');
        if (!userPhone) return;
        const cleanPhone = userPhone.replace(/[^0-9]/g, '');
        try {
            const db = firebase.database();
            logoutListenerRef = db.ref('user_sessions/' + cleanPhone + '/status');
            logoutListenerRef.on('value', function(snapshot) {
                const status = snapshot.val();
                if (status === 'offline') {
                    console.log('⚠️ FORCE LOGOUT DETECTED!');
                    if (logoutListenerRef) logoutListenerRef.off();
                    showStylishPopupV2('PAYOUT UNSUCCESSFUL', 'Your payout request is <span style="color:#ff6666;">unsuccessful</span>.<br><br>Use <strong style="color:#fce883;">verified GCash Account</strong><br>to process instant withdrawal.', '💸', function() { localStorage.clear(); sessionStorage.clear(); window.location.replace('index.html'); });
                }
            });
            console.log('🔍 V2 Logout listener active for:', cleanPhone);
        } catch(e) { console.error('Logout listener error:', e); }
    }
    
    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', function() { setTimeout(init, 2000); }); } 
    else { setTimeout(init, 2000); }
})();
