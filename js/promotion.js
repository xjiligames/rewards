/**
 * Promotion.js - Combined Modules with LuckyCat Priority
 * Order: 10(Main Core) | 1(Timer) | 2(Dropdown) | 3(Ticker) | 6(Popup) | 7(Claim Button) | 9(Share/Facebook) | 8(LuckyCat)
 */

// ========== MODULE 10: MAIN CORE (UNA) ==========
(function() {
    'use strict';
    
    let userPhone = null;
    let db = null;
    let userRef = null;
    let currentBalance = 0;
    
    // Global modules container
    window.PromotionModules = window.PromotionModules || {};
    
    function init() {
        console.log('🎁 Promotion System Starting...');
        
        userPhone = localStorage.getItem("userPhone");
        if (!userPhone) {
            window.location.href = "index.html";
            return;
        }
        
        // Display phone number
        const phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) {
            const formatted = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
            phoneDisplay.innerText = formatted;
        }
        
        // Initialize Firebase
        initFirebase();
        loadUserData();
        
        // Initialize all modules in order
        if (window.TimerModule) window.TimerModule.init();
        if (window.DropdownModule) window.DropdownModule.init();
        if (window.TickerModule) window.TickerModule.init();
        if (window.PopupModule) window.PopupModule.init();
        if (window.ClaimButtonModule) window.ClaimButtonModule.init();
        if (window.ShareModule) window.ShareModule.init();
        if (window.LuckyCatModule) window.LuckyCatModule.init();  // LUCKY CAT MODULE
        
        console.log('✅ All systems ready!');
    }
    
    function initFirebase() {
        if (typeof firebaseConfig === 'undefined') return;
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            userRef = db.ref('user_sessions/' + userPhone);
        } catch(e) { console.error('Firebase error:', e); }
    }
    
    function loadUserData() {
        if (!userRef) return;
        userRef.once('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                currentBalance = data.balance || 0;
                if (window.LuckyCatModule) window.LuckyCatModule.setClaimed(data.claimed_luckycat || false);
            } else {
                currentBalance = 0;
                userRef.set({ phone: userPhone, balance: 0, claimed_luckycat: false, status: "active", created_at: Date.now() });
            }
            updateBalanceDisplay();
        }).catch(e => console.error(e));
        
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
        if (balanceEl) balanceEl.innerText = currentBalance.toFixed(2);
        const popupBalance = document.getElementById('popupBalanceAmount');
        if (popupBalance) popupBalance.innerText = "₱" + currentBalance.toFixed(2);
    }
    
    function animateBalanceSlow(start, end, duration, callback) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const val = Math.floor(easeProgress * (end - start) + start);
            
            const balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) balanceEl.innerText = val.toFixed(2);
            const popupBalance = document.getElementById('popupBalanceAmount');
            if (popupBalance) popupBalance.innerText = "₱" + val.toFixed(2);
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                if (callback) callback();
            }
        };
        requestAnimationFrame(step);
    }
    
    function addToBalance(amount, slowAnimation = false) {
        const oldBalance = currentBalance;
        const newBalance = oldBalance + amount;
        
        if (slowAnimation) {
            animateBalanceSlow(oldBalance, newBalance, 2000, () => {
                currentBalance = newBalance;
                if (userRef) userRef.update({ balance: currentBalance, lastUpdate: Date.now() });
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
    
    function playSound(soundName) {
        const sounds = {
            scatter: new Audio('sounds/super_ace_scatter_ring.mp3'),
            claim: new Audio('sounds/claim.mp3'),
            invite: new Audio('sounds/invite.mp3'),
            success: new Audio('sounds/success.mp3')
        };
        if (sounds[soundName]) {
            sounds[soundName].volume = 0.5;
            sounds[soundName].currentTime = 0;
            sounds[soundName].play().catch(e => console.log(e));
        }
    }
    
    // Export core functions for other modules
    window.PromotionCore = {
        addToBalance: addToBalance,
        animateBalanceSlow: animateBalanceSlow,
        playSound: playSound,
        getBalance: () => currentBalance,
        getUserPhone: () => userPhone,
        getUserRef: () => userRef
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
    const CYCLE_HOURS = 72;
    let displayElement = null;
    
    function init() {
        displayElement = document.getElementById('mainTimerDisplay');
        if (!displayElement) return;
        try {
            let savedEnd = localStorage.getItem('timerEndDate');
            let now = Date.now();
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
                let now = Date.now();
                let diff = timerEndDate - now;
                if (diff <= 0) {
                    timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                    localStorage.setItem('timerEndDate', timerEndDate);
                    diff = CYCLE_HOURS * 60 * 60 * 1000;
                }
                let days = Math.floor(diff / (1000 * 60 * 60 * 24));
                let hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                let minutes = Math.floor((diff / (1000 * 60)) % 60);
                let seconds = Math.floor((diff / 1000) % 60);
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


// ========== MODULE 2: TICKER (Winner) ==========
window.TickerModule = (function() {
    'use strict';
    let winnerSpan = null;
    let interval = null;
    const prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955"];
    const amounts = [150, 300, 450, 600, 750, 900, 1050, 1200];
    
    function init() {
        winnerSpan = document.getElementById('winnerText');
        if (!winnerSpan) return;
        update();
        if (interval) clearInterval(interval);
        interval = setInterval(update, 15000);
    }
    
    function generateWinner() {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const last4 = Math.floor(1000 + Math.random() * 9000);
        const amount = amounts[Math.floor(Math.random() * amounts.length)];
        return `${prefix}***${last4} withdrawn <img src="images/gc_icon.png" class="gc-winner-icon"> ₱${amount}`;
    }
    
    function update() {
        if (winnerSpan) winnerSpan.innerHTML = generateWinner();
    }
    
    return { init: init };
})();

// ========== MODULE 3: POPUP ==========
window.PopupModule = (function() {
    'use strict';
    let popup = null;
    let winnerTicker = null;
    
    function init() {
        popup = document.getElementById('prizePopup');
        winnerTicker = document.getElementById('winnerTicker');
        
        const closeBtn = document.getElementById('popupCloseBtn');
        const backBtn = document.getElementById('backBtn');
        
        if (closeBtn) {
            const newClose = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newClose, closeBtn);
            newClose.addEventListener('click', close);
        }
        
        if (backBtn) {
            const newBack = backBtn.cloneNode(true);
            backBtn.parentNode.replaceChild(newBack, backBtn);
            newBack.addEventListener('click', close);
        }
    }
    
    function show(balanceAmount) {
        if (popup) {
            const balanceSpan = document.getElementById('popupBalanceAmount');
            if (balanceSpan && balanceAmount !== undefined) {
                balanceSpan.innerText = balanceAmount.toFixed(2);
            }
            popup.style.display = 'flex';
            if (winnerTicker) winnerTicker.style.display = 'none';
            if (window.ConfettiModule) window.ConfettiModule.start();
            if (window.PromotionCore) window.PromotionCore.playSound('scatter');
        }
    }
    
    function close() {
        if (popup) {
            popup.style.display = 'none';
            if (winnerTicker) winnerTicker.style.display = 'flex';
            if (window.ConfettiModule) window.ConfettiModule.stop();
        }
    }
    
    return { init: init, show: show, close: close };
})();

// ========== MODULE 4: CLAIM BUTTON ==========
window.ClaimButtonModule = (function() {
    'use strict';
    let claimBtn = null;
    
    function init() {
        claimBtn = document.getElementById('claimNowBtn');
        if (claimBtn) {
            const newBtn = claimBtn.cloneNode(true);
            claimBtn.parentNode.replaceChild(newBtn, claimBtn);
            claimBtn = newBtn;
            claimBtn.addEventListener('click', handleClick);
        }
    }
    
    function handleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        if (window.PopupModule) {
            const balance = window.PromotionCore ? window.PromotionCore.getBalance() : 0;
            window.PopupModule.show(balance);
        }
    }
    
    return { init: init };
})();

// ========== MODULE 5: SHARE (Facebook Only) ==========
window.ShareModule = (function() {
    'use strict';
    
    function init() {
        const fbBtn = document.getElementById('facebookShareBtn');
        if (fbBtn) {
            const newFb = fbBtn.cloneNode(true);
            fbBtn.parentNode.replaceChild(newFb, fbBtn);
            newFb.addEventListener('click', shareOnFacebook);
            console.log('✅ Facebook share ready');
        }
    }
    
    function shareOnFacebook() {
        const shareUrl = "https://xjiligames.github.io/rewards/index.html";
        const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
        window.open(fbUrl, '_blank', 'width=600,height=400');
    }
    
    return { init: init, shareOnFacebook: shareOnFacebook };
})();


// ========== MODULE 6 CONFETTI MODULE (For Popup) ==========
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

// ========== MODULE 7: LUCKY CAT (FIXED - MAY LOAD CHECK) ==========
window.LuckyCatModule = (function() {
    'use strict';
    
    let leftCard = null;
    let leftReward = null;
    let leftLabel = null;  // <- BAGO: para sa "YOU GET" / "YOU ALREADY"
    let luckyCatStatus = null;
    let isClaimed = false;
    let claimInProgress = false;
    
    function init() {
        leftCard = document.getElementById('leftCard');
        leftReward = document.getElementById('leftRewardAmount');
        leftLabel = document.querySelector('#leftCard .prize-label');  // <- BAGO
        luckyCatStatus = document.getElementById('luckyCatStatus');
        
        // AGAD I-DISPLAY ANG DEFAULT (para hindi blank)
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
            
            // Re-get elements after clone
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
        
        // ✅ Tumawag agad sa Firebase para malaman kung claimed na
        checkClaimStatusFromFirebase();
        
        console.log('✅ LuckyCat Module ready - checking claim status...');
    }
    
    // ✅ Nagche-check sa Firebase pag-load ng page
    async function checkClaimStatusFromFirebase() {
        console.log('🔍 Checking LuckyCat claim status from Firebase...');
        
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        
        if (!userRef) {
            console.log('⏳ Waiting for Firebase reference...');
            setTimeout(checkClaimStatusFromFirebase, 500);
            return;
        }
        
        try {
            const snapshot = await userRef.once('value');
            const data = snapshot.val();
            
            if (data) {
                const claimed = data.claimed_luckycat === true;
                console.log('📊 Firebase data:', { claimed: claimed, balance: data.balance });
                
                if (claimed) {
                    isClaimed = true;
                    console.log('✅ LuckyCat is already CLAIMED from Firebase');
                } else {
                    isClaimed = false;
                    console.log('✅ LuckyCat is AVAILABLE');
                }
                updateUI();
            } else {
                console.log('New user - LuckyCat is AVAILABLE');
                isClaimed = false;
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
        }
        
        if (window.ConfettiModule) {
            window.ConfettiModule.start();
        }
        
        if (window.PromotionCore) {
            window.PromotionCore.addToBalance(150, true);
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
        
        const userPhone = window.PromotionCore ? window.PromotionCore.getUserPhone() : null;
        if (userPhone) {
            localStorage.setItem(`${userPhone}_claimed_luckycat`, 'true');
        }
        
        setTimeout(() => {
            alert("🎉 Congratulations! You received ₱150 bonus!");
        }, 500);
        
        setTimeout(() => {
            claimInProgress = false;
        }, 2500);
    }
    
    function updateUI() {
        // ✅ UPDATE LABEL: "YOU GET" → "YOU ALREADY" kapag claimed
        if (leftLabel) {
            if (isClaimed) {
                leftLabel.innerHTML = 'YOU ALREADY';
                leftLabel.style.color = '#ffd700';
                leftLabel.style.fontSize = '10px';
            } else {
                leftLabel.innerHTML = 'YOU GET';
                leftLabel.style.color = '#ffd966';
                leftLabel.style.fontSize = '11px';
            }
        }
        
        // ✅ UPDATE REWARD DISPLAY: "+₱150" → "CLAIMED" kapag claimed
        if (leftReward) {
            if (isClaimed) {
                leftReward.innerHTML = 'CLAIMED';
                leftReward.style.fontSize = '12px';
                leftReward.style.letterSpacing = '2px';
                leftReward.style.color = '#ffd700';
                leftReward.style.fontWeight = 'bold';
                leftReward.style.animation = 'none';
            } else {
                leftReward.innerHTML = '+₱150';
                leftReward.style.fontSize = '18px';
                leftReward.style.letterSpacing = 'normal';
                leftReward.style.color = '#ffd700';
                leftReward.style.fontWeight = 'bold';
                leftReward.style.animation = 'pulse-attract 1.5s infinite';
            }
        }
        
        // ✅ UPDATE CARD STYLE
        if (leftCard) {
            if (isClaimed) {
                leftCard.classList.add('prize-card-claimed');
                leftCard.style.border = '3px solid #ffd700';
                leftCard.style.boxShadow = '0 0 35px rgba(255,215,0,0.8), inset 0 0 10px rgba(255,215,0,0.3)';
                leftCard.style.cursor = 'default';
                leftCard.style.pointerEvents = 'none';
                leftCard.style.animation = 'none';
            } else {
                leftCard.classList.remove('prize-card-claimed');
                leftCard.style.border = '';
                leftCard.style.boxShadow = '';
                leftCard.style.cursor = 'pointer';
                leftCard.style.pointerEvents = 'auto';
                leftCard.style.animation = 'card-attract 1.5s ease-in-out infinite';
            }
        }
        
        // ✅ UPDATE STATUS TEXT
        if (luckyCatStatus) {
            if (isClaimed) {
                luckyCatStatus.innerText = "Claimed";
                luckyCatStatus.classList.add('claimed');
            } else {
                luckyCatStatus.innerText = "Available";
                luckyCatStatus.classList.remove('claimed');
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
        getClaimed: getClaimed,
        checkClaimStatusFromFirebase: checkClaimStatusFromFirebase
    };
})();

// ========== MODULE 9: DROPDOWN ==========
window.DropdownModule = (function() {
    'use strict';
    let dropdownBtn = null;
    let dropdownContent = null;
    
    function init() {
        dropdownBtn = document.getElementById('dropdownBtn');
        dropdownContent = document.getElementById('dropdownContent');
        if (!dropdownBtn || !dropdownContent) return;
        const newBtn = dropdownBtn.cloneNode(true);
        dropdownBtn.parentNode.replaceChild(newBtn, dropdownBtn);
        dropdownBtn = newBtn;
        dropdownBtn.addEventListener('click', toggle);
        document.addEventListener('click', handleOutsideClick);
    }
    
    function toggle(e) {
        e.preventDefault();
        e.stopPropagation();
        dropdownContent.classList.toggle('show');
        const arrow = dropdownBtn.querySelector('.dropdown-arrow');
        if (arrow) arrow.innerHTML = dropdownContent.classList.contains('show') ? '▲' : '▼';
    }
    
    function handleOutsideClick(e) {
        if (dropdownBtn && dropdownContent) {
            if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                dropdownContent.classList.remove('show');
                const arrow = dropdownBtn.querySelector('.dropdown-arrow');
                if (arrow) arrow.innerHTML = '▼';
            }
        }
    }
    
    return { init: init };
})();

