/**
 * Promotion.js - Combined Modules
 * Order: 10(Main Core) | 1(Timer) | 2(Dropdown) | 3(Ticker) | 6(Popup) | 7(Claim Button) | 9(Share/Facebook)
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
    
    // Export core functions for other modules
    window.PromotionCore = {
        addToBalance: addToBalance,
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
