/**
 * Share and Earn Page - Main Controller
 * Handles Popup and Claim Now Button
 */

// ========== STRICT MODE ==========
'use strict';

// ========== WAIT FOR DOM ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Share and Earn page loaded');
    
    // Initialize popup module
    initPopup();
    
    // Initialize claim button
    initClaimButton();
});

// ========== INITIALIZE POPUP ==========
function initPopup() {
    // Check if popup element exists
    const popup = document.getElementById('prizePopup');
    if (!popup) {
        console.error('Popup element not found!');
        return;
    }
    
    console.log('✅ Popup ready');
}

// ========== INITIALIZE CLAIM NOW BUTTON ==========
function initClaimButton() {
    const claimBtn = document.getElementById('claimNowBtn');
    
    if (!claimBtn) {
        console.error('Claim Now button not found!');
        return;
    }
    
    // Remove existing listeners by cloning
    const newClaimBtn = claimBtn.cloneNode(true);
    claimBtn.parentNode.replaceChild(newClaimBtn, claimBtn);
    
    // Add click event
    newClaimBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('🔘 Claim Now button clicked');
        
        // Get current balance from PromotionCore
        let balance = 0;
        if (window.PromotionCore) {
            balance = window.PromotionCore.getBalance();
        } else {
            // Fallback: get from DOM
            const balanceEl = document.getElementById('userBalanceDisplay');
            if (balanceEl) {
                balance = parseFloat(balanceEl.innerText) || 0;
            }
        }
        
        // Show popup using popup_share.js
        if (window.showPopup) {
            window.showPopup(balance);
        } else {
            console.error('showPopup function not found! Make sure popup_share.js is loaded.');
            alert('Popup system not ready. Please refresh the page.');
        }
        
        // Play sound
        if (window.PromotionCore) {
            window.PromotionCore.playSound('scatter');
        }
        
        // Start confetti
        if (window.ConfettiModule) {
            window.ConfettiModule.start();
        }
    });
    
    console.log('✅ Claim Now button ready');
}

// ========== HELPER: UPDATE BALANCE DISPLAY ==========
function updateBalanceDisplay(balance) {
    const balanceEl = document.getElementById('userBalanceDisplay');
    if (balanceEl) {
        balanceEl.innerText = balance.toFixed(2);
    }
    
    const popupBalance = document.getElementById('popupBalanceAmount');
    if (popupBalance) {
        popupBalance.innerText = balance.toFixed(2);
    }
}

// ========== HELPER: GET CURRENT BALANCE ==========
function getCurrentBalance() {
    if (window.PromotionCore) {
        return window.PromotionCore.getBalance();
    }
    
    const balanceEl = document.getElementById('userBalanceDisplay');
    if (balanceEl) {
        return parseFloat(balanceEl.innerText) || 0;
    }
    
    return 0;
}

// ========== EXPORT FUNCTIONS ==========
window.updateBalanceDisplay = updateBalanceDisplay;
window.getCurrentBalance = getCurrentBalance;
