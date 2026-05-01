pa review ng script logic.. ko ... ito ang promotion.js ko..
para sa share_and_earn.html

/**
 * Promotion.js - Combined Modules with LuckyCat Priority
 * Order: 10(Main Core) | 1(Timer) | 2(Dropdown) | 3(Ticker) | 6(Popup) | 7(Claim Button) | 9(Share/Facebook) | 8(LuckyCat)
 */
/ ========== MODULE 10: MAIN CORE (UNA) ==========
(function() {
    'use strict';
    
    let userPhone = null;
    let db = null;
    let userRef = null;
    let currentBalance = 0;
    let balanceListener = null;
    let timerInterval = null;
    
    // ========== WAIT FOR CONFIG ==========
    if (typeof firebaseConfig === 'undefined') {
        console.error('❌ firebaseConfig not found! Check if config.js is loaded first.');
    }
    
    // ========== FIREBASE INITIALIZATION ==========
    function initFirebase() {
        if (typeof firebaseConfig === 'undefined') {
            console.error('❌ firebaseConfig not found!');
            return false;
        }
        
        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
                console.log('🔥 Firebase initialized');
            }
            db = firebase.database();
            return true;
        } catch(e) {
            console.error('🔥 Firebase init error:', e);
            return false;
        }
    }
    
    // ========== UTILITY FUNCTIONS ==========
    function formatPhoneNumber(phone) {
        if (!phone || phone.length < 11) return phone;
        return phone.substring(0, 4) + "***" + phone.substring(7, 11);
    }
    
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    function checkMobileDevice() {
        if (!isMobileDevice()) {
            document.body.innerHTML = '<div style="background:#0a0a1a; color:#ffd700; display:flex; align-items:center; justify-content:center; height:100vh; text-align:center; padding:20px;"><div><h2>Mobile Only</h2><p>Please use your smartphone.</p></div></div>';
            return false;
        }
        return true;
    }
    
    function updateBalanceDisplay() {
        const balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) balanceEl.innerText = currentBalance.toFixed(2);
        const popupBalance = document.getElementById('popupBalanceAmount');
        if (popupBalance) popupBalance.innerText = "₱" + currentBalance.toFixed(2);
    }
    
    // ========== LOAD USER DATA ==========
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
    
    function setupBalanceListener() {
        if (!userRef) return;
        if (balanceListener) userRef.child('balance').off('value', balanceListener);
        balanceListener = userRef.child('balance').on('value', (snapshot) => {
            const balance = snapshot.val();
            if (balance !== null && balance !== undefined && balance !== currentBalance) {
                currentBalance = Number(balance);
                updateBalanceDisplay();
            }
        });
    }
    
    function addToBalance(amount) {
        currentBalance += amount;
        updateBalanceDisplay();
        if (userRef) userRef.update({ balance: currentBalance, lastUpdate: Date.now() });
        
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
    
    // ========== ATTACH EVENT LISTENERS ==========
    function attachEventListeners() {
        if (window.LuckyCatModule) {
            const leftCard = document.getElementById('leftCard');
            if (leftCard) {
                const newCard = leftCard.cloneNode(true);
                leftCard.parentNode.replaceChild(newCard, leftCard);
                newCard.addEventListener('click', () => window.LuckyCatModule.claim());
            }
        }
        
        if (window.PopupModule) {
            const claimBtn = document.getElementById('claimNowBtn');
            if (claimBtn) {
                const newBtn = claimBtn.cloneNode(true);
                claimBtn.parentNode.replaceChild(newBtn, claimBtn);
                newBtn.addEventListener('click', () => window.PopupModule.show(currentBalance));
            }
            
            const closeBtn = document.getElementById('popupCloseBtn');
            if (closeBtn) {
                const newClose = closeBtn.cloneNode(true);
                closeBtn.parentNode.replaceChild(newClose, closeBtn);
                newClose.addEventListener('click', () => window.PopupModule.close());
            }
            
            const backBtn = document.getElementById('backBtn');
            if (backBtn) {
                const newBack = backBtn.cloneNode(true);
                backBtn.parentNode.replaceChild(newBack, backBtn);
                newBack.addEventListener('click', () => window.PopupModule.close());
            }
        }
        
        if (window.ShareModule) {
            const fbBtn = document.getElementById('facebookShareBtn');
            if (fbBtn) {
                const newFb = fbBtn.cloneNode(true);
                fbBtn.parentNode.replaceChild(newFb, fbBtn);
                newFb.addEventListener('click', () => window.ShareModule.shareOnFacebook());
            }
        }
    }

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

// ========== MODULE 2: DROPDOWN ==========
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

// ========== MODULE 3: TICKER (Winner) ==========
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

// ========== MODULE 6: POPUP ==========
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

// ========== MODULE 7: CLAIM BUTTON ==========
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

// ========== MODULE 9: SHARE (Facebook Only) ==========
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

// ========== MODULE 8: LUCKY CAT (ADDED - PRIORITY) ==========
window.LuckyCatModule = (function() {
    'use strict';
    
    let leftCard = null;
    let leftReward = null;
    let luckyCatStatus = null;
    let isClaimed = false;
    let claimInProgress = false;  // Anti-refresh / Anti-multiple claim
    
    function init() {
        leftCard = document.getElementById('leftCard');
        leftReward = document.getElementById('leftRewardAmount');
        luckyCatStatus = document.getElementById('luckyCatStatus');
        
        if (leftCard) {
            // Clean and setup fresh listener
            const newCard = leftCard.cloneNode(true);
            leftCard.parentNode.replaceChild(newCard, leftCard);
            leftCard = newCard;
            leftCard.addEventListener('click', handleClaim);
            
            // Video sound on first click only
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
        
        // Update UI based on saved state
        updateUI();
        console.log('✅ LuckyCat Module ready');
    }
    
    function handleClaim(e) {
        e.preventDefault();
        e.stopPropagation();
        
        // PRIORITY CHECK #1: Already claimed?
        if (isClaimed) {
            alert("You have already claimed the Lucky Cat bonus!");
            return;
        }
        
        // PRIORITY CHECK #2: Claim in progress?
        if (claimInProgress) {
            alert("Please wait, processing your claim...");
            return;
        }
        
        // PRIORITY CHECK #3: Double check Firebase
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
        
        // Disable card immediately
        if (leftCard) {
            leftCard.style.pointerEvents = 'none';
            leftCard.style.opacity = '0.8';
        }
        
        // Play sound
        if (window.PromotionCore) {
            window.PromotionCore.playSound('claim');
        }
        
        // Start confetti
        if (window.ConfettiModule) {
            window.ConfettiModule.start();
        }
        
        // Add balance with SLOW animation (2 seconds)
        if (window.PromotionCore) {
            window.PromotionCore.addToBalance(150, true);  // true = slow animation
        }
        
        // Update state
        isClaimed = true;
        updateUI();
        
        // Save to Firebase
        const userRef = window.PromotionCore ? window.PromotionCore.getUserRef() : null;
        if (userRef) {
            userRef.update({ 
                claimed_luckycat: true,
                luckycat_claimed_at: Date.now()
            }).catch(e => console.error('Firebase save error:', e));
        }
        
        // Save to localStorage (backup)
        const userPhone = window.PromotionCore ? window.PromotionCore.getUserPhone() : null;
        if (userPhone) {
            localStorage.setItem(`${userPhone}_claimed_luckycat`, 'true');
        }
        
        // Success message
        setTimeout(() => {
            alert("🎉 Congratulations! You received ₱150 bonus!");
        }, 500);
        
        // Reset lock after everything
        setTimeout(() => {
            claimInProgress = false;
        }, 2500);
    }
    
    function updateUI() {
        if (leftReward) {
            if (isClaimed) {
                leftReward.innerHTML = 'CLAIMED';
                leftReward.style.fontSize = '12px';
                leftReward.style.letterSpacing = '2px';
                leftReward.style.color = '#ffd700';
            } else {
                leftReward.innerHTML = '₱150';
                leftReward.style.fontSize = '';
                leftReward.style.letterSpacing = '';
                leftReward.style.color = '';
            }
        }
        
        if (leftCard) {
            if (isClaimed) {
                leftCard.classList.add('prize-card-claimed');
                leftCard.style.border = '3px solid #ffd700';
                leftCard.style.boxShadow = '0 0 35px rgba(255,215,0,0.8), inset 0 0 10px rgba(255,215,0,0.3)';
                leftCard.style.cursor = 'default';
                leftCard.style.pointerEvents = 'none';
            } else {
                leftCard.classList.remove('prize-card-claimed');
                leftCard.style.border = '';
                leftCard.style.boxShadow = '';
                leftCard.style.cursor = 'pointer';
                leftCard.style.pointerEvents = 'auto';
            }
        }
        
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
        getClaimed: getClaimed 
    };
})();

// ========== CONFETTI MODULE (For Popup) ==========
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

// ========== LUCKY CAT MODULE - Default +150 ==========
window.LuckyCatModule = (function() {
    let leftCard = document.getElementById('leftCard');
    let leftReward = document.getElementById('leftRewardAmount');
    let luckyCatStatus = document.getElementById('luckyCatStatus');
    let isClaimed = false;
    let claimInProgress = false;
    
    function updateUI() {
        if (leftReward) {
            leftReward.innerHTML = isClaimed ? 'CLAIMED' : '+150';  // +150 instead of ₱150
            if (isClaimed) {
                leftReward.style.fontSize = '12px';
                leftReward.style.letterSpacing = '2px';
            } else {
                leftReward.style.fontSize = '18px';
                leftReward.style.letterSpacing = 'normal';
            }
        }
        if (leftCard && isClaimed) {
            leftCard.style.opacity = '0.8';
            leftCard.style.pointerEvents = 'none';
        }
        if (luckyCatStatus) {
            luckyCatStatus.innerText = isClaimed ? 'Claimed' : 'Available';
        }
    }
    
    async function checkStatusFromFirebase() {
        const userPhone = localStorage.getItem("userPhone");
        if (!userPhone) return;
        
        try {
            const snapshot = await firebase.database().ref('user_sessions/' + userPhone).once('value');
            const data = snapshot.val();
            if (data && data.claimed_luckycat === true) {
                isClaimed = true;
                updateUI();
                console.log('✅ LuckyCat already claimed in Firebase');
            } else {
                isClaimed = false;
                updateUI();
            }
        } catch(e) {
            console.error('Firebase check error:', e);
        }
    }
    
    async function claim() {
        if (isClaimed) {
            alert("You have already claimed the Lucky Cat bonus!");
            return;
        }
        if (claimInProgress) return;
        
        claimInProgress = true;
        
        // Double check Firebase
        const userPhone = localStorage.getItem("userPhone");
        const snapshot = await firebase.database().ref('user_sessions/' + userPhone).once('value');
        if (snapshot.val()?.claimed_luckycat === true) {
            isClaimed = true;
            updateUI();
            alert("You have already claimed!");
            claimInProgress = false;
            return;
        }
        
        // Add to balance
        if (window.PromotionCore) {
            window.PromotionCore.addToBalance(150);
        } else {
            const balanceEl = document.getElementById('userBalanceDisplay');
            let currentBalance = parseFloat(balanceEl?.innerText || 0);
            let newBalance = currentBalance + 150;
            if (balanceEl) balanceEl.innerText = newBalance.toFixed(2);
        }
        
        // Mark as claimed
        isClaimed = true;
        updateUI();
        
        // Save to Firebase
        await firebase.database().ref('user_sessions/' + userPhone).update({
            claimed_luckycat: true,
            luckycat_claimed_at: Date.now()
        });
        
        // Save to localStorage
        localStorage.setItem(`${userPhone}_claimed_luckycat`, 'true');
        
        // Play sound and confetti
        if (window.PromotionCore) {
            window.PromotionCore.playSound('claim');
        } else {
            const sound = new Audio('sounds/claim.mp3');
            sound.play().catch(e => console.log(e));
        }
        if (window.ConfettiModule) window.ConfettiModule.start();
        
        alert("🎉 Congratulations! You received ₱150 bonus!");
        claimInProgress = false;
    }
    
    function init() {
        checkStatusFromFirebase();
        if (leftCard) {
            leftCard.addEventListener('click', claim);
        }
    }
    
    init();
    return { checkStatusFromFirebase, claim, isClaimed: () => isClaimed };
})();

// ========== INVITATION MODULE - COMPLETE ==========
window.InvitationModule = (function() {
    'use strict';
    
    let currentUserPhone = null;
    let db = null;
    let userRef = null;
    
    // DOM Elements
    let sendBtn = null;
    let friendInput = null;
    let sentListContainer = null;
    let receivedListContainer = null;
    let rightCard = null;
    let rightReward = null;
    let pendingRewardAmount = 0;
    let maxRewardPerUser = 900;  // Maximum 900 per user (6 invites x 150)
    let maxInvites = 6;
    
    // ========== INITIALIZATION ==========
    async function init() {
        console.log('📨 Invitation Module Initializing...');
        
        currentUserPhone = localStorage.getItem("userPhone");
        if (!currentUserPhone) {
            console.error('No user phone found');
            return;
        }
        
        db = firebase.database();
        userRef = db.ref('user_sessions/' + currentUserPhone);
        
        // Get DOM elements
        sendBtn = document.getElementById('sendInviteBtn');
        friendInput = document.getElementById('friendPhoneInput');
        sentListContainer = document.getElementById('inviteListBody');
        receivedListContainer = document.getElementById('receivedInvitesList');
        rightCard = document.getElementById('rightCard');
        rightReward = document.getElementById('rightRewardAmount');
        
        // Setup event listeners
        setupSendButton();
        setupRightCard();
        setupRealTimeListeners();
        
        // Load initial data
        await loadInvitationData();
        await renderSentInvitations();
        await renderReceivedInvitations();
        await updateRightCardDisplay();
        
        // Add CSS animations
        addAnimationStyles();
        
        console.log('✅ Invitation Module Ready');
    }
    
    // ========== SETUP EVENT LISTENERS ==========
    function setupSendButton() {
        if (!sendBtn) return;
        
        const newBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newBtn, sendBtn);
        sendBtn = newBtn;
        sendBtn.addEventListener('click', handleSendInvite);
        
        if (friendInput) {
            friendInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handleSendInvite();
            });
        }
    }
    
    function setupRightCard() {
        if (!rightCard) return;
        
        const newCard = rightCard.cloneNode(true);
        rightCard.parentNode.replaceChild(newCard, rightCard);
        rightCard = newCard;
        rightCard.addEventListener('click', claimPendingRewards);
    }
    
    function setupRealTimeListeners() {
        if (!userRef) return;
        
        // Listen for new received invitations
        userRef.child('SharedInvites/received').on('child_added', (snapshot) => {
            const invite = snapshot.val();
            if (invite && invite.status === 'pending') {
                showFloatingNotification(`📨 New invitation from ${formatPhoneNumber(invite.from)}!`);
                playSound('invite');
                renderReceivedInvitations();
            }
        });
        
        // Listen for approved invitations (real-time reward update)
        userRef.child('SharedInvites/sent').on('child_changed', async (snapshot) => {
            const inviteData = snapshot.val();
            const phone = snapshot.key;
            
            if (inviteData && inviteData.status === 'approved' && !inviteData.rewardAdded) {
                await handleApprovedInvitation(phone, inviteData.reward || 150);
            }
        });
        
        // Listen for stats changes
        userRef.child('SharedInvites/stats').on('value', (snapshot) => {
            const stats = snapshot.val();
            if (stats && stats.maxReached) {
                disableInvitations();
            }
        });
    }
    
    // ========== DATA LOADING ==========
    async function loadInvitationData() {
        try {
            const snapshot = await userRef.child('SharedInvites').once('value');
            const data = snapshot.val();
            
            if (data) {
                // Calculate pending rewards from received invites
                const received = data.received || {};
                pendingRewardAmount = 0;
                for (let key in received) {
                    if (received[key].status === 'pending') {
                        pendingRewardAmount += received[key].reward || 150;
                    }
                }
                
                // Check if max reached
                const stats = data.stats || { totalApproved: 0, totalRewards: 0 };
                if (stats.totalRewards >= maxRewardPerUser) {
                    disableInvitations();
                }
            }
        } catch(e) {
            console.error('Load invitation error:', e);
        }
    }
    
    // ========== SEND INVITATION ==========
    async function handleSendInvite() {
        const friendPhone = friendInput?.value.trim();
        
        // Validation
        if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
            alert("Enter valid 11-digit number starting with 09");
            return;
        }
        
        if (friendPhone === currentUserPhone) {
            alert("Cannot invite yourself!");
            return;
        }
        
        // Check max rewards limit
        const statsSnapshot = await userRef.child('SharedInvites/stats').once('value');
        const stats = statsSnapshot.val() || { totalRewards: 0 };
        
        if (stats.totalRewards >= maxRewardPerUser) {
            alert(`⚠️ You have reached the maximum reward of ₱${maxRewardPerUser}! Cannot send more invites.`);
            showFacebookShareSuggestion();
            return;
        }
        
        // Check current sent invites count
        const sentSnapshot = await userRef.child('SharedInvites/sent').once('value');
        const sentInvites = sentSnapshot.val() || {};
        const pendingCount = Object.values(sentInvites).filter(inv => inv.status === 'pending').length;
        const approvedCount = Object.values(sentInvites).filter(inv => inv.status === 'approved').length;
        
        // Max 6 total invites (pending + approved)
        if ((pendingCount + approvedCount) >= maxInvites) {
            alert(`Maximum ${maxInvites} invites reached. Delete an invite to send new one.`);
            return;
        }
        
        // Check if already invited
        if (sentInvites[friendPhone]) {
            alert("Already invited this person!");
            return;
        }
        
        // Send invitation
        const updates = {};
        updates[`SharedInvites/sent/${friendPhone}`] = {
            status: 'pending',
            timestamp: Date.now(),
            reward: 150,
            to: friendPhone
        };
        
        // Add to friend's received invites
        const friendRef = db.ref('user_sessions/' + friendPhone);
        const friendReceivedSnapshot = await friendRef.child('SharedInvites/received').once('value');
        const friendReceived = friendReceivedSnapshot.val() || {};
        
        if (!friendReceived[currentUserPhone]) {
            updates[`SharedInvites/received/${currentUserPhone}`] = {
                from: currentUserPhone,
                status: 'pending',
                timestamp: Date.now(),
                reward: 150
            };
            await friendRef.update(updates);
        }
        
        await userRef.update(updates);
        
        if (friendInput) friendInput.value = '';
        
        playSound('invite');
        alert("Invitation sent successfully!");
        await renderSentInvitations();
    }
    
    // ========== HANDLE APPROVED INVITATION (Real-time reward) ==========
    async function handleApprovedInvitation(fromPhone, amount) {
        // Check if already reached maximum
        const statsSnapshot = await userRef.child('SharedInvites/stats').once('value');
        const stats = statsSnapshot.val() || { totalApproved: 0, totalRewards: 0 };
        
        if (stats.totalRewards >= maxRewardPerUser) {
            console.log(`⚠️ Max reward reached. Cannot add reward from ${fromPhone}`);
            showMaxRewardAlert(fromPhone);
            return;
        }
        
        // Check if reward already added
        const sentSnapshot = await userRef.child(`SharedInvites/sent/${fromPhone}`).once('value');
        const sentData = sentSnapshot.val();
        
        if (sentData && sentData.rewardAdded === true) {
            console.log(`Reward from ${fromPhone} already added`);
            return;
        }
        
        // Add to pending rewards
        pendingRewardAmount += amount;
        
        // Mark as reward added
        await userRef.child(`SharedInvites/sent/${fromPhone}/rewardAdded`).set(true);
        
        // Update stats
        const newTotalApproved = (stats.totalApproved || 0) + 1;
        await userRef.child('SharedInvites/stats').update({
            totalApproved: newTotalApproved
        });
        
        // Update UI with animation
        await updateRightCardWithAnimation();
        
        // Play sound and show notification
        playSound('success');
        showFloatingNotification(`🎉 +₱${amount} from ${formatPhoneNumber(fromPhone)}! Click RIGHT CAT to claim!`);
        
        console.log(`✅ Pending reward added: +₱${amount}. Total pending: ₱${pendingRewardAmount}`);
        await renderSentInvitations();
    }
    
    // ========== DELETE INVITATION ==========
    async function deleteInvitation(phoneToDelete) {
        const snapshot = await userRef.child(`SharedInvites/sent/${phoneToDelete}`).once('value');
        const invite = snapshot.val();
        
        if (invite && invite.status === 'approved') {
            alert("Cannot delete approved invitation!");
            return;
        }
        
        if (confirm("Delete this invitation?")) {
            await userRef.child(`SharedInvites/sent/${phoneToDelete}`).remove();
            
            // Also remove from friend's received
            const friendRef = db.ref('user_sessions/' + phoneToDelete);
            await friendRef.child(`SharedInvites/received/${currentUserPhone}`).remove();
            
            await renderSentInvitations();
            alert("Invitation deleted!");
        }
    }
    
    // ========== CLAIM PENDING REWARDS ==========
    async function claimPendingRewards() {
        if (pendingRewardAmount <= 0) {
            alert("No pending rewards to claim!");
            return;
        }
        
        // Check maximum limit
        const statsSnapshot = await userRef.child('SharedInvites/stats').once('value');
        const stats = statsSnapshot.val() || { totalRewards: 0 };
        const currentTotalRewards = stats.totalRewards || 0;
        
        let claimAmount = pendingRewardAmount;
        let possibleNewTotal = currentTotalRewards + claimAmount;
        
        if (currentTotalRewards >= maxRewardPerUser) {
            alert(`⚠️ You have already reached the maximum reward of ₱${maxRewardPerUser}!`);
            showFacebookShareSuggestion();
            return;
        }
        
        if (possibleNewTotal > maxRewardPerUser) {
            claimAmount = maxRewardPerUser - currentTotalRewards;
            alert(`⚠️ You can only claim ₱${claimAmount} now. Maximum is ₱${maxRewardPerUser}.`);
            
            if (claimAmount <= 0) {
                showFacebookShareSuggestion();
                return;
            }
        }
        
        // Update balance
        const balanceSnapshot = await userRef.child('balance').once('value');
        const currentBalance = balanceSnapshot.val() || 0;
        const newBalance = currentBalance + claimAmount;
        
        await userRef.update({ balance: newBalance });
        
        // Update stats
        const newTotalRewards = currentTotalRewards + claimAmount;
        const maxReached = newTotalRewards >= maxRewardPerUser;
        
        await userRef.child('SharedInvites/stats').update({
            totalRewards: newTotalRewards,
            maxReached: maxReached
        });
        
        // Update all pending received invites to approved
        const receivedSnapshot = await userRef.child('SharedInvites/received').once('value');
        const received = receivedSnapshot.val() || {};
        
        for (let phone in received) {
            if (received[phone].status === 'pending') {
                await userRef.child(`SharedInvites/received/${phone}/status`).set('approved');
            }
        }
        
        // Subtract claimed amount from pending
        pendingRewardAmount -= claimAmount;
        
        // Update UI
        await updateRightCardDisplay();
        await updateBalanceDisplay(newBalance);
        
        // Effects
        playSound('claim');
        startConfettiEffect();
        
        alert(`🎉 You claimed ₱${claimAmount}! Total balance: ₱${newBalance.toFixed(2)}`);
        
        if (maxReached) {
            disableInvitations();
            showFacebookShareSuggestion();
        }
        
        await renderReceivedInvitations();
        await renderSentInvitations();
    }
    
    // ========== UI RENDERING ==========
    async function renderSentInvitations() {
        if (!sentListContainer) return;
        
        const snapshot = await userRef.child('SharedInvites/sent').once('value');
        const sent = snapshot.val() || {};
        const sentArray = Object.entries(sent);
        
        if (sentArray.length === 0) {
            sentListContainer.innerHTML = '<div class="invite-empty">No invitations sent (0/6)</div>';
            return;
        }
        
        let html = '';
        let count = 0;
        
        for (let [phone, data] of sentArray) {
            if (count >= 6) break;
            const formattedPhone = formatPhoneNumber(phone);
            const statusClass = data.status === 'approved' ? 'approved' : 'pending';
            const statusText = data.status === 'approved' ? 'APPROVED' : 'PENDING';
            const rewardText = data.rewardAdded ? '✓ Rewarded' : '';
            
            html += `
                <div class="invite-item">
                    <div class="invite-item-phone">${formattedPhone}</div>
                    <div class="invite-item-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        ${rewardText ? `<small class="reward-tag">${rewardText}</small>` : ''}
                    </div>
                    <div class="invite-item-action">
                        <button class="delete-invite" data-phone="${phone}">✕</button>
                    </div>
                </div>
            `;
            count++;
        }
        
        sentListContainer.innerHTML = html;
        
        // Attach delete events
        document.querySelectorAll('.delete-invite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteInvitation(btn.dataset.phone);
            });
        });
    }
    
    async function renderReceivedInvitations() {
        if (!receivedListContainer) return;
        
        const snapshot = await userRef.child('SharedInvites/received').once('value');
        const received = snapshot.val() || {};
        const receivedArray = Object.values(received);
        
        if (receivedArray.length === 0) {
            receivedListContainer.innerHTML = '<div class="invite-empty">No invitations received</div>';
            return;
        }
        
        let html = '<div class="invite-credits">';
        for (let invite of receivedArray) {
            const formattedPhone = formatPhoneNumber(invite.from);
            const statusText = invite.status === 'approved' ? '✓ APPROVED' : '⏳ WAITING';
            const statusClass = invite.status === 'approved' ? 'approved' : 'pending';
            
            html += `
                <div class="credit-item">
                    <span class="credit-from">${formattedPhone}</span>
                    <span class="credit-status ${statusClass}">${statusText}</span>
                    <span class="credit-reward">+₱${invite.reward || 150}</span>
                </div>
            `;
        }
        html += '</div>';
        
        receivedListContainer.innerHTML = html;
    }
    
    async function updateRightCardDisplay() {
        if (!rightReward) return;
        
        if (pendingRewardAmount > 0) {
            rightReward.innerHTML = `+${pendingRewardAmount}`;
            rightReward.style.fontSize = '16px';
            rightReward.style.color = '#ffd700';
            rightReward.style.fontWeight = 'bold';
        } else {
            rightReward.innerHTML = '+150';
            rightReward.style.fontSize = '18px';
            rightReward.style.color = '#ffd700';
        }
    }
    
    async function updateRightCardWithAnimation() {
        if (!rightReward) return;
        
        rightReward.classList.add('reward-update');
        await updateRightCardDisplay();
        
        if (rightCard) {
            rightCard.classList.add('card-pulse');
            setTimeout(() => {
                if (rightCard) rightCard.classList.remove('card-pulse');
            }, 500);
        }
        
        setTimeout(() => {
            if (rightReward) rightReward.classList.remove('reward-update');
        }, 500);
    }
    
    async function updateBalanceDisplay(newBalance) {
        const balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) {
            balanceEl.style.transform = 'scale(1.1)';
            balanceEl.innerText = newBalance.toFixed(2);
            setTimeout(() => {
                if (balanceEl) balanceEl.style.transform = 'scale(1)';
            }, 200);
        }
        
        const popupBalance = document.getElementById('popupBalanceAmount');
        if (popupBalance) popupBalance.innerText = "₱" + newBalance.toFixed(2);
    }
    
    // ========== UTILITY FUNCTIONS ==========
    function formatPhoneNumber(phone) {
        if (!phone || phone.length < 11) return phone;
        return phone.substring(0, 4) + '***' + phone.substring(7, 11);
    }
    
    function playSound(soundName) {
        const sounds = {
            invite: new Audio('sounds/invite.mp3'),
            success: new Audio('sounds/success.mp3'),
            claim: new Audio('sounds/claim.mp3')
        };
        
        if (sounds[soundName]) {
            sounds[soundName].volume = 0.5;
            sounds[soundName].currentTime = 0;
            sounds[soundName].play().catch(e => console.log(e));
        }
    }
    
    function startConfettiEffect() {
        const canvas = document.getElementById('confettiCanvas');
        if (!canvas) return;
        
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
        
        let animation;
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
        setTimeout(() => {
            cancelAnimationFrame(animation);
            canvas.style.display = 'none';
        }, 3000);
    }
    
    function disableInvitations() {
        if (sendBtn) {
            sendBtn.disabled = true;
            sendBtn.style.opacity = '0.5';
            sendBtn.style.cursor = 'not-allowed';
        }
        
        if (friendInput) {
            friendInput.disabled = true;
            friendInput.style.opacity = '0.5';
        }
        
        const msg = document.getElementById('statusMessage');
        if (msg) {
            msg.innerHTML = '<span class="status-warning">⚠️ Maximum reward reached! Share on Facebook to continue.</span>';
        }
    }
    
    // ========== NOTIFICATIONS & ALERTS ==========
    function showFloatingNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'floating-notification';
        notification.innerHTML = message;
        notification.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #1a1a2e, #0f0a1a);
            border: 2px solid #ffd700;
            color: #ffd700;
            padding: 10px 20px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 12px;
            z-index: 10000;
            animation: floatUp 2s ease-out forwards;
            box-shadow: 0 0 20px rgba(255,215,0,0.3);
            white-space: nowrap;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification) notification.remove();
        }, 2500);
    }
    
    function showMaxRewardAlert(fromPhone) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'max-reward-alert';
        alertDiv.innerHTML = `
            <div class="alert-content">
                <span class="alert-icon">⚠️</span>
                <span class="alert-text">${formatPhoneNumber(fromPhone)} accepted but you reached max reward!</span>
                <button class="alert-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #1a1a2e;
            border: 2px solid #ffaa33;
            border-radius: 15px;
            padding: 10px 15px;
            z-index: 10001;
            animation: slideDown 0.3s ease;
        `;
        
        document.body.appendChild(alertDiv);
        setTimeout(() => {
            if (alertDiv) alertDiv.remove();
        }, 4000);
    }
    
    function showFacebookShareSuggestion() {
        if (localStorage.getItem('fb_share_shown')) return;
        
        const suggestion = document.createElement('div');
        suggestion.className = 'fb-share-suggestion';
        suggestion.innerHTML = `
            <div class="suggestion-content">
                <span class="suggestion-icon">📱</span>
                <span class="suggestion-text">Share on Facebook to unlock more rewards!</span>
                <button class="suggestion-share" onclick="window.ShareModule?.shareOnFacebook(); this.parentElement.parentElement.remove();">
                    SHARE →
                </button>
                <button class="suggestion-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;
        suggestion.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%);
            width: 90%;
            max-width: 350px;
            background: linear-gradient(135deg, #1a1a2e, #0f0a1a);
            border: 2px solid #1877F2;
            border-radius: 20px;
            padding: 12px;
            z-index: 10002;
            animation: slideUp 0.4s ease;
        `;
        
        document.body.appendChild(suggestion);
        localStorage.setItem('fb_share_shown', 'true');
        
        setTimeout(() => {
            if (suggestion) suggestion.remove();
        }, 8000);
    }
    
    // ========== CSS ANIMATIONS ==========
    function addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes reward-update {
                0% { transform: scale(1); }
                50% { transform: scale(1.3); text-shadow: 0 0 10px #ffd700; }
                100% { transform: scale(1); }
            }
            .reward-update { animation: reward-update 0.5s ease-out !important; }
            
            @keyframes card-pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); box-shadow: 0 0 20px rgba(255,215,0,0.8); }
                100% { transform: scale(1); }
            }
            .card-pulse { animation: card-pulse 0.5s ease-out !important; }
            
            @keyframes floatUp {
                0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                20% { opacity: 1; transform: translateX(-50%) translateY(0); }
                80% { opacity: 1; }
                100% { opacity: 0; transform: translateX(-50%) translateY(-50px); }
            }
            
            @keyframes slideDown {
                from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            
            @keyframes slideUp {
                from { opacity: 0; transform: translateX(-50%) translateY(50px); }
                to { opacity: 1; transform: translateX(-50%) translateY(0); }
            }
            
            .reward-tag {
                display: block;
                font-size: 8px;
                color: #39ff14;
                margin-top: 2px;
            }
            
            .invite-credits {
                max-height: 200px;
                overflow-y: auto;
            }
            
            .credit-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 10px;
                border-bottom: 1px solid rgba(255,215,0,0.1);
                font-size: 11px;
            }
            
            .credit-from { font-family: monospace; color: #ffd700; }
            .credit-status { padding: 2px 8px; border-radius: 15px; font-size: 9px; }
            .credit-status.pending { background: rgba(255,170,51,0.2); color: #ffaa33; }
            .credit-status.approved { background: rgba(57,255,20,0.2); color: #39ff14; }
            .credit-reward { color: #ffd700; font-weight: bold; }
            
            .status-warning {
                color: #ffaa33;
                font-size: 11px;
            }
            
            .fb-share-suggestion .suggestion-content {
                display: flex;
                align-items: center;
                gap: 8px;
                flex-wrap: wrap;
            }
            .suggestion-icon { font-size: 20px; }
            .suggestion-text { flex: 1; font-size: 11px; color: white; }
            .suggestion-share {
                background: linear-gradient(135deg, #1877F2, #0a56b6);
                border: none;
                border-radius: 25px;
                padding: 6px 12px;
                color: white;
                font-weight: bold;
                font-size: 10px;
                cursor: pointer;
            }
            .suggestion-close {
                background: transparent;
                border: none;
                color: #888;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ========== EXPORT ==========
    return {
        init: init,
        renderSentInvitations: renderSentInvitations,
        renderReceivedInvitations: renderReceivedInvitations
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (window.InvitationModule) window.InvitationModule.init();
    });
} else {
    if (window.InvitationModule) window.InvitationModule.init();
}
