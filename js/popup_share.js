/**
 * popup_share.js
 * CLAIM THRU GCASH LOGIC
 */

// ========== SIMPLE TEST - ALERT LANG MUNA ==========
function handleClaimThruGCash() {
    alert("CLAIM THRU GCASH button is working!");
}

// ========== HANAPIN ANG BUTTON AT LAGYAN NG CLICK EVENT ==========
function initClaimThruGCashButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    
    if (claimBtn) {
        console.log("CLAIM THRU GCASH button found");
        
        // Remove existing listeners
        var newBtn = claimBtn.cloneNode(true);
        claimBtn.parentNode.replaceChild(newBtn, claimBtn);
        claimBtn = newBtn;
        
        // Add click event
        claimBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Button clicked");
            handleClaimThruGCash();
        };
        
        console.log("Button ready");
    } else {
        console.log("Button not found, retrying...");
        setTimeout(initClaimThruGCashButton, 500);
    }
}

// ========== SIMULAN PAG NA-LOAD ANG PAGE ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Popup_share.js loaded");
    initClaimThruGCashButton();
});

// ========== EXPOSE PARA MAGAMIT SA IBANG FILE ==========
window.handleClaimThruGCash = handleClaimThruGCash;
