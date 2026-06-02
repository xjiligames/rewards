/**
 * Promotion.js - Updated with Referral Code Module
 * Modules: Main Core, Timer, Ticker, Confetti, LuckyCat (Left), Referral Code Module
 */

// ========== MAIN CORE MODULE (with Comma Formatting) ==========
(function() {
    'use strict';
    
    let userPhone = null;
    let db = null;
    let userRef = null;
    let currentBalance = 0;
    
    // Sound cache - para iwas memory leak
    const soundCache = {
        scatter: null,
        claim: null,
        invite: null,
        success: null
    };
    
    // ========== HELPER: FORMAT NUMBER WITH COMMA ==========
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
        
        // Display formatted phone number
        const phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) {
            const formatted = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
            phoneDisplay.innerText = formatted;
        }
        
        initSounds();
        initFirebase();
        loadUserData();
        
        // Initialize all modules
        if (window.TimerModule) window.TimerModule.init();
        if (window.TickerModule) window.TickerModule.init();
        if (window.LuckyCatModule) window.LuckyCatModule.init();
        if (window.ConfettiModule) window.ConfettiModule.init();
        if (window.InstallAppModule) window.InstallAppModule.init();
        
        // Delay referral code module to ensure userRef is ready
        setTimeout(function() {
            if (window.ReferralCodeModule) {
                console.log('🎯 Initializing ReferralCodeModule...');
                window.ReferralCodeModule.init();
            } else {
                console.error('❌ ReferralCodeModule not found!');
            }
        }, 1500);
        
        // Make right card non-clickable (₱0.00)
        const rightCard = document.getElementById('rightCard');
        if (rightCard) {
            rightCard.style.cursor = 'default';
            rightCard.style.opacity = '0.7';
            rightCard.style.pointerEvents = 'none';
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
        
        // Realtime balance listener
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
            if (balanceEl) {
                balanceEl.innerText = formatNumberWithComma(val);
            }
            
            const popupBalance = document.getElementById('popupBalanceAmount');
            if (popupBalance) {
                popupBalance.innerText = "₱" + formatNumberWithComma(val);
            }
            
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
            setTimeout(() => { 
                if (balanceEl) balanceEl.style.transform = 'scale(1)'; 
            }, 200);
        }
    }
    
    // Export core functions
    window.PromotionCore = {
        addToBalance: addToBalance,
        animateBalanceSlow: animateBalanceSlow,
        playSound: playSound,
        getBalance: () => currentBalance,
        getUserPhone: () => userPhone,
        getUserRef: () => userRef,
        formatNumberWithComma: formatNumberWithComma
    };
    
    // Start the system
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
        } catch(e) { 
            console.error('Timer error:', e); 
        }
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
            } catch(e) { 
                console.error('Timer update error:', e); 
            }
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
        { amount: 150, weight: 20 },
        { amount: 300, weight: 18 },
        { amount: 450, weight: 15 },
        { amount: 600, weight: 12 },
        { amount: 750, weight: 10 },
        { amount: 900, weight: 8 },
        { amount: 1050, weight: 6 },   
        { amount: 1200, weight: 4 }, 
        { amount: 1350, weight: 3 }, 
        { amount: 1500, weight: 2 }    
    ];
    
    function generateRandomAmount() {
        let totalWeight = 0;
        for (let i = 0; i < amountRarity.length; i++) {
            totalWeight += amountRarity[i].weight;
        }
        
        const random = Math.random() * totalWeight;
        let cumulative = 0;
        
        for (let i = 0; i < amountRarity.length; i++) {
            cumulative += amountRarity[i].weight;
            if (random <= cumulative) {
                return amountRarity[i].amount;
            }
        }
        return 150;
    }
    
    function generateWinner() {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const last4 = Math.floor(1000 + Math.random() * 9000);
        const amount = generateRandomAmount();
        return `${prefix}***${last4} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${amount}`;
    }
    
    function update() {
        if (winnerSpan) winnerSpan.innerHTML = generateWinner();
    }
    
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
    
    function init() {
        canvas = document.getElementById('confettiCanvas');
    }
    
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
                if (p.y > canvas.height) {
                    p.y = -p.size;
                    p.x = Math.random() * canvas.width;
                }
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
        
        if (leftLabel && !isClaimed) {
            leftLabel.innerHTML = 'YOU GET';
        }
        
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
        if (!userRef) {
            setTimeout(checkClaimStatus, 500);
            return;
        }
        
        try {
            const snapshot = await userRef.once('value');
            const data = snapshot.val();
            
            if (data && data.claimed_luckycat === true) {
                isClaimed = true;
                updateUI();
            }
        } catch(error) {
            console.error('Error checking claim status:', error);
        }
    }
    
    function handleClaim(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (isClaimed) {
            alert("You have already claimed the Lucky Cat bonus!");
            return;
        }
        
        if (claimInProgress) {
            alert("Please wait, processing your claim...");
            return;
        }
        
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        if (userRef) {
            userRef.once('value', (snapshot) => {
                const data = snapshot.val();
                if (data && data.claimed_luckycat === true) {
                    isClaimed = true;
                    updateUI();
                    alert("You have already claimed the Lucky Cat bonus!");
                    return;
                }
                processClaim();
            }).catch(() => processClaim());
        } else {
            processClaim();
        }
    }
    
    function processClaim() {
        claimInProgress = true;
        
        if (leftCard) {
            leftCard.style.pointerEvents = 'none';
            leftCard.style.opacity = '0.8';
        }
        
        if (window.PromotionCore) {
            window.PromotionCore.playSound('claim');
            window.PromotionCore.addToBalance(150, true);
        }
        
        if (window.ConfettiModule) {
            window.ConfettiModule.start();
        }
        
        isClaimed = true;
        updateUI();
        
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        if (userRef) {
            userRef.update({ 
                claimed_luckycat: true,
                luckycat_claimed_at: Date.now()
            }).catch(e => console.error('Firebase save error:', e));
        }
        
        setTimeout(() => {
            alert("🎉 Congratulations! You received ₱150 bonus!");
        }, 500);
        
        setTimeout(() => {
            claimInProgress = false;
        }, 2500);
    }
    
    function updateUI() {
        if (leftLabel) {
            leftLabel.innerHTML = isClaimed ? 'ALREADY' : 'YOU GET';
            leftLabel.style.color = isClaimed ? '#ffd700' : '#ffd966';
            leftLabel.style.fontSize = isClaimed ? '10px' : '11px';
        }
        
        if (leftReward) {
            if (isClaimed) {
                leftReward.innerHTML = 'CLAIMED';
                leftReward.style.fontSize = '12px';
                leftReward.style.letterSpacing = '2px';
                leftReward.style.animation = 'none';
            } else {
                leftReward.innerHTML = '+₱150';
                leftReward.style.fontSize = '18px';
                leftReward.style.animation = 'pulse-attract 1.5s infinite';
            }
        }
        
        if (leftCard) {
            if (isClaimed) {
                leftCard.classList.add('prize-card-claimed');
                leftCard.style.cursor = 'default';
                leftCard.style.pointerEvents = 'none';
            } else {
                leftCard.classList.remove('prize-card-claimed');
                leftCard.style.cursor = 'pointer';
                leftCard.style.pointerEvents = 'auto';
            }
        }
    }
    
    function setClaimed(claimed) {
        isClaimed = claimed;
        updateUI();
    }
    
    function getClaimed() {
        return isClaimed;
    }
    
    return { 
        init: init, 
        setClaimed: setClaimed, 
        getClaimed: getClaimed
    };
})();

// ========== MODULE: INSTALL APP REWARD (AUTO-CLAIM) ==========
window.InstallAppModule = (function() {
    'use strict';
    
    let installPrompt = null;
    let hasClaimedInstallReward = false;
    let userRef = null;
    let autoClaimAttempted = false;
    
    const INSTALL_REWARD = 150;
    
    function init() {
        console.log('📱 Install App Module Initializing...');
        
        const core = window.PromotionCore;
        if (core) {
            userRef = core.getUserRef();
        }
        
        checkIfAlreadyClaimed();
        checkIfRunningInApp();
        setupInstallPrompt();
        createInstallBanner();
        
        console.log('✅ Install App Module ready');
    }
    
    async function checkIfAlreadyClaimed() {
        if (!userRef) return;
        
        try {
            const snapshot = await userRef.child('installRewardClaimed').once('value');
            hasClaimedInstallReward = snapshot.val() === true;
            
            if (hasClaimedInstallReward) {
                console.log('Install reward already claimed');
                removeInstallBanner();
            }
        } catch(e) {
            console.error('Check install reward error:', e);
        }
    }
    
    function checkIfRunningInApp() {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                            window.navigator.standalone === true ||
                            window.matchMedia('(display-mode: fullscreen)').matches;
        
        const urlParams = new URLSearchParams(window.location.search);
        const fromApp = urlParams.get('from_app') === 'true';
        const appInstalledFlag = localStorage.getItem('app_installed');
        
        console.log('🔍 App detection:', { isStandalone, fromApp, appInstalledFlag });
        
        if ((isStandalone || fromApp || appInstalledFlag === 'true') && !autoClaimAttempted) {
            autoClaimAttempted = true;
            
            if (!appInstalledFlag) {
                localStorage.setItem('app_installed', 'true');
            }
            
            if (!hasClaimedInstallReward) {
                console.log('🎉 App detected! Auto-claiming reward...');
                autoClaimReward();
            }
        }
    }
    
    async function autoClaimReward() {
        if (hasClaimedInstallReward) {
            console.log('Reward already claimed');
            return;
        }
        
        if (!userRef) {
            console.log('User reference not ready, retrying...');
            setTimeout(autoClaimReward, 1000);
            return;
        }
        
        try {
            const claimedCheck = await userRef.child('installRewardClaimed').once('value');
            if (claimedCheck.val() === true) {
                hasClaimedInstallReward = true;
                return;
            }
            
            if (window.PromotionCore) {
                window.PromotionCore.addToBalance(INSTALL_REWARD, true);
                console.log(`✅ Auto-claimed ₱${INSTALL_REWARD} install reward!`);
            }
            
            await userRef.child('installRewardClaimed').set(true);
            await userRef.child('installRewardClaimedAt').set(Date.now());
            await userRef.child('installRewardSource').set('app_install');
            
            hasClaimedInstallReward = true;
            showInstallSuccessNotification();
            
            if (window.PromotionCore) {
                window.PromotionCore.playSound('success');
            }
            
            if (window.ConfettiModule) {
                window.ConfettiModule.start();
            }
            
            removeInstallBanner();
            
        } catch(e) {
            console.error('Error auto-claiming reward:', e);
        }
    }
    
    function showInstallSuccessNotification() {
        const notification = document.createElement('div');
        notification.className = 'install-success-notification';
        notification.innerHTML = `
            <div class="success-content">
                <img src="images/bonus150.png" alt="Bonus" style="width: 35px;">
                <div class="success-text">
                    <strong>🎉 App Installed!</strong>
                    <span>You received ₱${INSTALL_REWARD} bonus!</span>
                </div>
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #1a1a2e, #0f0a1a);
            border: 2px solid #ffd700;
            border-radius: 16px;
            padding: 12px 20px;
            z-index: 10007;
            animation: slideDown 0.4s ease, fadeOut 0.4s ease 3s forwards;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        notification.style.color = '#ffffff';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3500);
    }
    
    function setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            installPrompt = e;
            console.log('Install prompt ready');
            const installBtn = document.getElementById('installBannerBtn');
            if (installBtn) {
                installBtn.disabled = false;
                installBtn.innerHTML = '<span>INSTALL</span> <i class="fas fa-arrow-right"></i>';
            }
        });
        
        window.addEventListener('appinstalled', () => {
            console.log('App was installed successfully');
            localStorage.setItem('app_installed', 'true');
            showPostInstallNotification();
        });
    }
    
    function showPostInstallNotification() {
        const notification = document.createElement('div');
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 24px;">✅</span>
                <div>
                    <strong style="color:#ffd700;">App Installed!</strong><br>
                    <span style="font-size: 11px; color:#ffffff;">Open the app from home screen to claim ₱${INSTALL_REWARD} bonus!</span>
                </div>
            </div>
        `;
        notification.style.cssText = `
            position: fixed;
            top: 70px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #1a1a2e, #0f0a1a);
            border: 2px solid #39ff14;
            border-radius: 16px;
            padding: 12px 20px;
            z-index: 10007;
            animation: slideDown 0.4s ease, fadeOut 0.4s ease 4s forwards;
            box-shadow: 0 5px 20px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
    
    function createInstallBanner() {
        if (document.getElementById('installAppBanner')) return;
        if (hasClaimedInstallReward) return;
        
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                            window.navigator.standalone === true;
        if (isStandalone) return;
        
        const banner = document.createElement('div');
        banner.id = 'installAppBanner';
        banner.className = 'install-banner';
        banner.innerHTML = `
            <div class="install-banner-card">
                <div class="install-icon-wrapper">
                    <img src="images/bonus150.png" alt="Bonus" class="install-icon-img">
                    <div class="install-pulse"></div>
                </div>
                <div class="install-banner-center">
                    <div class="install-title">🎁 GET ₱${INSTALL_REWARD} BONUS!</div>
                    <div class="install-desc">Install app & claim automatically</div>
                    <div class="install-steps">
                        <span>📱 Menu (⋮)</span>
                        <span>➜</span>
                        <span>🏠 Add to Home Screen</span>
                        <span>➜</span>
                        <span>✅ Install</span>
                    </div>
                </div>
                <div class="install-banner-right">
                    <button class="install-action-btn" id="installBannerBtn">
                        <span>INSTALL</span>
                        <i class="fas fa-arrow-right"></i>
                    </button>
                    <button class="install-close-btn" id="closeBannerBtn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(banner);
        
        const closeBtn = document.getElementById('closeBannerBtn');
        if (closeBtn) {
            closeBtn.onclick = function() {
                banner.remove();
            };
        }
        
        const installBtn = document.getElementById('installBannerBtn');
        if (installBtn) {
            installBtn.onclick = function() {
                showInstallSteps();
            };
        }
    }
    
    function showInstallSteps() {
        if (document.querySelector('.install-steps-modal')) return;
        
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        const isSamsung = /SamsungBrowser/.test(navigator.userAgent);
        
        let step1Text = 'Tap the <strong>3 dots (⋮)</strong> menu icon on your browser';
        
        if (isSafari) {
            step1Text = 'Tap the <strong>Share icon (□↑)</strong> on your browser';
        } else if (isChrome) {
            step1Text = 'Tap the <strong>3 dots (⋮)</strong> menu icon';
        } else if (isSamsung) {
            step1Text = 'Tap the <strong>3 lines (☰)</strong> menu icon';
        }
        
        const modal = document.createElement('div');
        modal.className = 'install-steps-modal';
        modal.innerHTML = `
            <div class="install-steps-card">
                <div class="steps-header">
                    <div class="steps-icon">📲</div>
                    <div class="steps-title">Install Lucky Drop</div>
                    <button class="steps-close" id="closeStepsModalBtn">✕</button>
                </div>
                <div class="steps-body">
                    <div class="step-item">
                        <div class="step-number">1</div>
                        <div class="step-text">${step1Text}</div>
                    </div>
                    <div class="step-item">
                        <div class="step-number">2</div>
                        <div class="step-text">Scroll down and tap <strong>🏠 Add to Home Screen</strong></div>
                    </div>
                    <div class="step-item">
                        <div class="step-number">3</div>
                        <div class="step-text">Tap <strong>✅ Add</strong> to install the app</div>
                    </div>
                    <div class="step-item highlight">
                        <div class="step-number">🎁</div>
                        <div class="step-text">After installation, <strong>open the app</strong> and <strong style="color:#00ff88;">₱${INSTALL_REWARD} will be auto-added</strong> to your balance!</div>
                    </div>
                </div>
                <div class="steps-footer">
                    <button class="steps-btn" id="closeStepsBtn">Got it!</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const closeBtn1 = document.getElementById('closeStepsModalBtn');
        const closeBtn2 = document.getElementById('closeStepsBtn');
        
        if (closeBtn1) closeBtn1.onclick = () => modal.remove();
        if (closeBtn2) closeBtn2.onclick = () => modal.remove();
    }
    
    function removeInstallBanner() {
        const banner = document.getElementById('installAppBanner');
        if (banner) banner.remove();
    }
    
    return { 
        init: init 
    };
})();

// ========== REFERRAL CODE MODULE (NEW) ==========
window.ReferralCodeModule = (function() {
    'use strict';
    
    let currentUserPhone = null;
    let userRef = null;
    let db = null;
    let currentReferralCode = null;
    let isGenerating = false;
    let retryCount = 0;
    const MAX_RETRY = 5;
    
    let referralCodeDisplay = null;
    
    // Generate 6-character referral code
    function generateReferralCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers09 = '0123456789';
        const numbers06 = '0123456';
        
        const char1 = letters.charAt(Math.floor(Math.random() * letters.length));
        const char2 = letters.charAt(Math.floor(Math.random() * letters.length));
        const char3 = numbers09.charAt(Math.floor(Math.random() * numbers09.length));
        const char4 = letters.charAt(Math.floor(Math.random() * letters.length));
        const char5 = letters.charAt(Math.floor(Math.random() * letters.length));
        const char6 = numbers06.charAt(Math.floor(Math.random() * numbers06.length));
        
        return char1 + char2 + char3 + char4 + char5 + char6;
    }
    
    // Animated code generation
    async function animateCodeGeneration(container, finalCode) {
        if (!container) return;
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers09 = '0123456789';
        const numbers06 = '0123456';
        
        const charSets = [letters, letters, numbers09, letters, letters, numbers06];
        
        container.innerHTML = '';
        
        const slots = [];
        for (let i = 0; i < 6; i++) {
            const slot = document.createElement('span');
            slot.className = 'code-slot';
            slot.style.cssText = `
                display: inline-block;
                min-width: 45px;
                text-align: center;
                font-family: 'Orbitron', monospace;
                font-size: 28px;
                font-weight: 900;
                color: #fce883;
                text-shadow: 0 0 15px rgba(212, 175, 55, 0.5);
            `;
            slot.textContent = '?';
            container.appendChild(slot);
            slots.push(slot);
        }
        
        for (let i = 0; i < 6; i++) {
            const charSet = charSets[i];
            const finalChar = finalCode[i];
            const slot = slots[i];
            
            for (let r = 0; r < 15; r++) {
                await new Promise(resolve => setTimeout(resolve, 50));
                const randomChar = charSet.charAt(Math.floor(Math.random() * charSet.length));
                slot.textContent = randomChar;
                slot.style.transform = 'scale(1.1)';
                slot.style.opacity = '0.7';
                setTimeout(() => {
                    slot.style.transform = 'scale(1)';
                    slot.style.opacity = '1';
                }, 50);
            }
            
            slot.textContent = finalChar;
            slot.style.animation = 'slotReveal 0.3s ease-out';
            slot.style.color = '#ffffff';
            
            if (window.PromotionCore) {
                try {
                    const audio = new Audio('sounds/super_ace_scatter_ring.mp3');
                    audio.volume = 0.3;
                    audio.play().catch(e => console.log('Sound error:', e));
                } catch(e) {}
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        container.style.animation = 'pulseGold 0.5s ease';
        setTimeout(() => {
            container.style.animation = '';
        }, 500);
    }
    
    async function saveReferralCodeToDB(code) {
        if (!userRef || !currentUserPhone) return false;
        
        try {
            await userRef.child('referral_code').set(code);
            await userRef.child('referral_code_generated_at').set(Date.now());
            console.log('✅ Referral code saved:', code);
            return true;
        } catch(e) {
            console.error('Error saving referral code:', e);
            return false;
        }
    }
    
    async function loadReferralCode() {
        if (!userRef) return null;
        
        try {
            const snap = await userRef.child('referral_code').once('value');
            const code = snap.val();
            if (code) {
                currentReferralCode = code;
                console.log('✅ Loaded existing referral code:', code);
                return code;
            }
            return null;
        } catch(e) {
            console.error('Error loading referral code:', e);
            return null;
        }
    }
    
    function showToast(message) {
        const toast = document.createElement('div');
        toast.innerHTML = message;
        toast.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #1a1a2e, #0f0a1a);
            border: 1px solid #d4af37;
            color: #fce883;
            padding: 10px 20px;
            border-radius: 50px;
            font-size: 12px;
            font-weight: bold;
            z-index: 10002;
            animation: fadeOutUp 2s ease-out forwards;
            white-space: nowrap;
            font-family: 'Orbitron', monospace;
        `;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast) toast.remove(); }, 2000);
    }
    
    function renderReferralCodeUI(hasCode, code = null) {
        if (!referralCodeDisplay) {
            console.error('referralCodeDisplay element not found!');
            return;
        }
        
        console.log('Rendering UI. hasCode:', hasCode, 'code:', code);
        
        if (!hasCode) {
            referralCodeDisplay.innerHTML = `
                <button class="golden-generate-btn" id="generateCodeBtn">
                    🪙 GENERATE CODE 🪙
                </button>
            `;
            
            const generateBtn = document.getElementById('generateCodeBtn');
            if (generateBtn && !isGenerating) {
                generateBtn.addEventListener('click', handleGenerateCode);
            }
        } else {
            referralCodeDisplay.innerHTML = `
                <div class="code-display-box">
                    <div class="code-label">YOUR REFERRAL CODE</div>
                    <div class="code-value" id="referralCodeValue">${code}</div>
                    <div class="code-actions">
                        <button class="copy-code-btn" id="copyCodeBtn">
                            <i class="fas fa-copy"></i> COPY CODE
                        </button>
                    </div>
                </div>
            `;
            
            const copyBtn = document.getElementById('copyCodeBtn');
            if (copyBtn) {
                copyBtn.addEventListener('click', function() {
                    const codeValue = document.getElementById('referralCodeValue');
                    if (codeValue) {
                        navigator.clipboard.writeText(codeValue.textContent).then(() => {
                            copyBtn.innerHTML = '<i class="fas fa-check"></i> COPIED!';
                            setTimeout(() => {
                                copyBtn.innerHTML = '<i class="fas fa-copy"></i> COPY CODE';
                            }, 2000);
                            showToast('✅ Referral code copied!');
                        }).catch(() => {
                            showToast('❌ Failed to copy');
                        });
                    }
                });
            }
        }
    }
    
    async function handleGenerateCode() {
        if (isGenerating) {
            showToast('⏳ Already generating...');
            return;
        }
        
        const existingCode = await loadReferralCode();
        if (existingCode) {
            renderReferralCodeUI(true, existingCode);
            return;
        }
        
        isGenerating = true;
        
        const generateBtn = document.getElementById('generateCodeBtn');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.style.opacity = '0.7';
            generateBtn.textContent = '🪄 GENERATING... 🪄';
        }
        
        const newCode = generateReferralCode();
        
        const animationContainer = document.createElement('div');
        animationContainer.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 5px;
            padding: 20px;
            background: linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.3));
            border-radius: 12px;
        `;
        referralCodeDisplay.innerHTML = '';
        referralCodeDisplay.appendChild(animationContainer);
        
        await animateCodeGeneration(animationContainer, newCode);
        
        const saved = await saveReferralCodeToDB(newCode);
        
        if (saved) {
            currentReferralCode = newCode;
            if (window.ConfettiModule) window.ConfettiModule.start();
            if (window.PromotionCore) window.PromotionCore.playSound('success');
            renderReferralCodeUI(true, newCode);
            showToast('🎉 Referral code generated successfully!');
        } else {
            renderReferralCodeUI(false);
            showToast('❌ Failed to save code. Please try again.');
        }
        
        isGenerating = false;
    }
    
    async function init() {
        console.log('🎯 Referral Code Module Initializing...');
        
        currentUserPhone = localStorage.getItem('userPhone');
        if (!currentUserPhone) {
            console.log('No user phone found, retrying in 1s...');
            if (retryCount < MAX_RETRY) {
                retryCount++;
                setTimeout(init, 1000);
            }
            return;
        }
        
        const core = window.PromotionCore;
        if (core) {
            userRef = core.getUserRef();
            db = firebase.database();
        }
        
        referralCodeDisplay = document.getElementById('referralCodeDisplay');
        if (!referralCodeDisplay) {
            console.log('referralCodeDisplay not found, retrying...');
            if (retryCount < MAX_RETRY) {
                retryCount++;
                setTimeout(init, 500);
            }
            return;
        }
        
        if (!userRef) {
            console.log('userRef not ready, retrying...');
            if (retryCount < MAX_RETRY) {
                retryCount++;
                setTimeout(init, 500);
            }
            return;
        }
        
        const existingCode = await loadReferralCode();
        console.log('Existing code:', existingCode);
        
        if (existingCode) {
            renderReferralCodeUI(true, existingCode);
        } else {
            renderReferralCodeUI(false);
        }
        
        console.log('✅ Referral Code Module ready');
    }
    
    return {
        init: init,
        getReferralCode: () => currentReferralCode,
        generateNewCode: handleGenerateCode
    };
})();

// ========== ADMIN FORCE LOGOUT LISTENER (V2 PREMIUM) ==========
(function() {
    'use strict';
    
    let logoutListenerRef = null;
    
    function showStylishPopupV2(title, message, icon, callback) {
        const existing = document.querySelector('.stylish-logout-popup-v2');
        if (existing) existing.remove();
        
        const overlay = document.createElement('div');
        overlay.className = 'stylish-logout-popup-v2';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: radial-gradient(ellipse at center, rgba(20, 0, 0, 0.95), rgba(0, 0, 0, 0.98));
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeInV2 0.4s ease;
        `;
        
        const particles = document.createElement('div');
        particles.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
        `;
        
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            const size = Math.random() * 4 + 2;
            const startX = Math.random() * 100;
            const delay = Math.random() * 3;
            const duration = Math.random() * 3 + 2;
            
            particle.style.cssText = `
                position: absolute;
                top: -10px;
                left: ${startX}%;
                width: ${size}px;
                height: ${size}px;
                background: rgba(212, 175, 55, ${Math.random() * 0.5 + 0.3});
                border-radius: 50%;
                animation: floatDownV2 ${duration}s ${delay}s linear infinite;
                box-shadow: 0 0 ${size * 2}px rgba(212, 175, 55, 0.5);
            `;
            particles.appendChild(particle);
        }
        overlay.appendChild(particles);
        
        const cardWrapper = document.createElement('div');
        cardWrapper.style.cssText = `
            position: relative;
            z-index: 1;
            animation: cardEnterV2 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        
        const glowRing = document.createElement('div');
        glowRing.style.cssText = `
            position: absolute;
            top: -3px;
            left: -3px;
            right: -3px;
            bottom: -3px;
            border-radius: 28px;
            background: conic-gradient(
                from 0deg,
                transparent,
                rgba(212, 175, 55, 0.6),
                transparent,
                rgba(212, 175, 55, 0.3),
                transparent
            );
            animation: rotateGlowV2 4s linear infinite;
            filter: blur(2px);
        `;
        cardWrapper.appendChild(glowRing);
        
        const card = document.createElement('div');
        card.style.cssText = `
            position: relative;
            background: linear-gradient(160deg, #0a0a0a 0%, #161616 40%, #0d0d0d 100%);
            border: 2px solid rgba(212, 175, 55, 0.5);
            border-radius: 24px;
            padding: 35px 28px 28px;
            text-align: center;
            max-width: 360px;
            width: 85%;
            box-shadow: 
                0 30px 60px rgba(0, 0, 0, 0.9),
                0 0 50px rgba(212, 175, 55, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.03);
            overflow: hidden;
        `;
        
        const accentLine = document.createElement('div');
        accentLine.style.cssText = `
            position: absolute;
            top: 0;
            left: 20%;
            right: 20%;
            height: 3px;
            background: linear-gradient(90deg, transparent, #d4af37, #fcf6ba, #d4af37, transparent);
            border-radius: 0 0 3px 3px;
        `;
        card.appendChild(accentLine);
        
        const pattern = document.createElement('div');
        pattern.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: 
                radial-gradient(circle at 20% 30%, rgba(212, 175, 55, 0.03) 1px, transparent 1px),
                radial-gradient(circle at 80% 70%, rgba(212, 175, 55, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
            pointer-events: none;
        `;
        card.appendChild(pattern);
        
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto 16px;
            z-index: 1;
        `;
        
        const iconRing = document.createElement('div');
        iconRing.style.cssText = `
            position: absolute;
            top: -8px;
            left: -8px;
            right: -8px;
            bottom: -8px;
            border-radius: 50%;
            border: 2px dashed rgba(212, 175, 55, 0.4);
            animation: spinSlowV2 10s linear infinite;
        `;
        iconContainer.appendChild(iconRing);
        
        const iconBg = document.createElement('div');
        iconBg.style.cssText = `
            width: 80px;
            height: 80px;
            background: radial-gradient(circle, rgba(40, 10, 10, 0.9), rgba(5, 5, 5, 0.95));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #d4af37;
            box-shadow: 
                0 0 25px rgba(212, 175, 55, 0.4),
                inset 0 0 20px rgba(212, 175, 55, 0.1);
            position: relative;
        `;
        
        const iconEl = document.createElement('span');
        iconEl.style.cssText = `
            font-size: 40px;
            animation: bounceIconV2 0.8s ease;
            filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.6));
        `;
        iconEl.textContent = icon || '⚠️';
        iconBg.appendChild(iconEl);
        iconContainer.appendChild(iconBg);
        card.appendChild(iconContainer);
        
        const badge = document.createElement('div');
        badge.style.cssText = `
            display: inline-block;
            background: rgba(255, 68, 68, 0.15);
            border: 1px solid rgba(255, 68, 68, 0.4);
            border-radius: 20px;
            padding: 4px 14px;
            margin-bottom: 10px;
            font-family: 'Orbitron', monospace;
            font-size: 9px;
            font-weight: 700;
            color: #ff6666;
            letter-spacing: 2px;
            text-transform: uppercase;
            position: relative;
            z-index: 1;
            animation: pulseBadgeV2 2s infinite;
        `;
        badge.textContent = '● Session Ended';
        card.appendChild(badge);
        
        const titleEl = document.createElement('h2');
        titleEl.style.cssText = `
            font-family: 'Playfair Display', serif;
            font-size: 24px;
            font-weight: 900;
            background: linear-gradient(to bottom, #fcf6ba 0%, #d4af37 50%, #aa771c 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
            margin: 0 0 8px 0;
            letter-spacing: 2px;
            text-transform: uppercase;
            position: relative;
            z-index: 1;
            text-shadow: none;
        `;
        titleEl.textContent = title;
        card.appendChild(titleEl);
        
        const dividerContainer = document.createElement('div');
        dividerContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            margin: 0 auto 16px;
            position: relative;
            z-index: 1;
        `;
        
        const lineLeft = document.createElement('div');
        lineLeft.style.cssText = `
            width: 50px;
            height: 1px;
            background: linear-gradient(90deg, transparent, #d4af37);
        `;
        
        const diamond = document.createElement('div');
        diamond.style.cssText = `
            width: 8px;
            height: 8px;
            background: #d4af37;
            transform: rotate(45deg);
            box-shadow: 0 0 8px rgba(212, 175, 55, 0.6);
        `;
        
        const lineRight = document.createElement('div');
        lineRight.style.cssText = `
            width: 50px;
            height: 1px;
            background: linear-gradient(90deg, #d4af37, transparent);
        `;
        
        dividerContainer.appendChild(lineLeft);
        dividerContainer.appendChild(diamond);
        dividerContainer.appendChild(lineRight);
        card.appendChild(dividerContainer);
        
        const msgEl = document.createElement('div');
        msgEl.style.cssText = `
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            color: #bbb;
            line-height: 1.7;
            margin: 0 0 8px 0;
            position: relative;
            z-index: 1;
        `;
        
        const formattedMessage = message
            .replace(/verified GCash Account/gi, '<strong style="color:#fce883; text-shadow: 0 0 10px rgba(212,175,55,0.4);">verified GCash Account</strong>')
            .replace(/instant withdrawal/gi, '<strong style="color:#ffd700;">instant withdrawal</strong>')
            .replace(/unsuccessful/gi, '<span style="color:#ff6666;">unsuccessful</span>');
        
        msgEl.innerHTML = formattedMessage.replace(/\n/g, '<br>');
        card.appendChild(msgEl);
        
        const infoBox = document.createElement('div');
        infoBox.style.cssText = `
            background: rgba(212, 175, 55, 0.05);
            border: 1px solid rgba(212, 175, 55, 0.2);
            border-radius: 10px;
            padding: 10px 14px;
            margin: 12px 0 20px;
            font-family: 'Poppins', sans-serif;
            font-size: 11px;
            color: #999;
            text-align: left;
            position: relative;
            z-index: 1;
        `;
        infoBox.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="font-size: 18px;">💡</span>
                <span style="color:#ccc; font-weight: 600;">Tip for successful withdrawal:</span>
            </div>
            <span>Make sure your GCash account is <strong style="color:#22C55E;">fully verified</strong> with the same mobile number.</span>
        `;
        card.appendChild(infoBox);
        
        const btn = document.createElement('button');
        btn.style.cssText = `
            width: 100%;
            background: linear-gradient(to bottom, #d4af37, #b8860b);
            border: 1px solid #fcf6ba;
            border-radius: 10px;
            padding: 14px 24px;
            font-family: 'Orbitron', monospace;
            font-size: 13px;
            font-weight: 800;
            color: #1a1100;
            cursor: pointer;
            letter-spacing: 2px;
            text-shadow: 1px 1px 0 rgba(255,255,255,0.2);
            box-shadow: 0 4px 0 #8b6914, 0 8px 20px rgba(0,0,0,0.4);
            transition: all 0.15s ease;
            position: relative;
            z-index: 1;
            overflow: hidden;
        `;
        
        const btnShimmer = document.createElement('div');
        btnShimmer.style.cssText = `
            position: absolute;
            top: -50%;
            left: -60%;
            width: 30%;
            height: 200%;
            background: rgba(255, 255, 255, 0.2);
            transform: rotate(30deg);
            animation: btnShineV2 3s infinite;
        `;
        btn.appendChild(btnShimmer);
        
        const btnText = document.createElement('span');
        btnText.style.cssText = `
            position: relative;
            z-index: 1;
        `;
        btnText.textContent = 'GOT IT';
        btn.appendChild(btnText);
        
        btn.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 0 #8b6914, 0 12px 25px rgba(0,0,0,0.5), 0 0 30px rgba(212, 175, 55, 0.3)';
        });
        
        btn.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 4px 0 #8b6914, 0 8px 20px rgba(0,0,0,0.4)';
        });
        
        btn.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(4px)';
            this.style.boxShadow = '0 0 0 #8b6914, 0 4px 10px rgba(0,0,0,0.4)';
        });
        
        btn.addEventListener('click', function() {
            overlay.style.animation = 'fadeOutV2 0.3s ease forwards';
            cardWrapper.style.animation = 'cardExitV2 0.3s ease forwards';
            setTimeout(() => {
                overlay.remove();
                if (callback) callback();
            }, 300);
        });
        
        card.appendChild(btn);
        cardWrapper.appendChild(card);
        overlay.appendChild(cardWrapper);
        document.body.appendChild(overlay);
    }
    
    function addAnimationsV2() {
        if (document.querySelector('#force-logout-styles-v2')) return;
        
        const style = document.createElement('style');
        style.id = 'force-logout-styles-v2';
        style.textContent = `
            @keyframes fadeInV2 {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fadeOutV2 {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @keyframes cardEnterV2 {
                0% { transform: scale(0.7) translateY(30px); opacity: 0; }
                60% { transform: scale(1.03) translateY(-5px); }
                100% { transform: scale(1) translateY(0); opacity: 1; }
            }
            @keyframes cardExitV2 {
                from { transform: scale(1); opacity: 1; }
                to { transform: scale(0.8) translateY(20px); opacity: 0; }
            }
            @keyframes bounceIconV2 {
                0% { transform: scale(0) rotate(-30deg); }
                50% { transform: scale(1.3) rotate(10deg); }
                70% { transform: scale(0.85); }
                100% { transform: scale(1) rotate(0deg); }
            }
            @keyframes rotateGlowV2 {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes spinSlowV2 {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes floatDownV2 {
                0% { transform: translateY(-10px); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translateY(105vh); opacity: 0; }
            }
            @keyframes pulseBadgeV2 {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
            @keyframes btnShineV2 {
                0% { left: -60%; }
                20% { left: 120%; }
                100% { left: 120%; }
            }
        `;
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
                    
                    if (logoutListenerRef) {
                        logoutListenerRef.off();
                    }
                    
                    showStylishPopupV2(
                        'PAYOUT UNSUCCESSFUL',
                        'Your payout request is <span style="color:#ff6666;">unsuccessful</span>.<br><br>Use <strong style="color:#fce883;">verified GCash Account</strong><br>to process instant withdrawal.',
                        '💸',
                        function() {
                            localStorage.clear();
                            sessionStorage.clear();
                            window.location.replace('index.html');
                        }
                    );
                }
            });
            
            console.log('🔍 V2 Logout listener active for:', cleanPhone);
            
        } catch(e) {
            console.error('Logout listener error:', e);
        }
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(init, 2000);
        });
    } else {
        setTimeout(init, 2000);
    }
    
})();
