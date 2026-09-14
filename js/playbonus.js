// ========== PROCESS CLAIM ==========
function processClaim() {
    claimInProgress = true;
    
    var ptCatClaimBtn = document.getElementById('ptCatClaimBtn');
    
    if (ptCatClaimBtn) {
        ptCatClaimBtn.disabled = true;
        ptCatClaimBtn.style.opacity = '0.6';
        ptCatClaimBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>PROCESSING...</span>';
    }
    
    // ✅ CHECK FIREWALL FIRST
    checkFirewallBeforeClaim().then(function(firewallOn) {
        if (firewallOn) {
            console.log('🔥 Firewall ON - Showing carnival AI verification');
            
            // Hide bonus popup
            var popup = document.getElementById('bonusRewardPopup');
            if (popup) popup.style.display = 'none';
            
            // Credit bonus + mark claimed FIRST
            creditBonusAndMark(function() {
                // Show carnival firewall popup AFTER credit
                if (window.showPopup) {
                    window.showPopup(currentBalance);
                }
                claimInProgress = false;
            });
        } else {
            console.log('🔓 Firewall OFF - Direct claim');
            
            // Direct claim (no popup)
            creditBonusAndMark(function() {
                var popup = document.getElementById('bonusRewardPopup');
                if (popup) popup.style.display = 'none';
                
                setTimeout(function() {
                    showSuccessPopup(bonusAmount);
                }, 300);
                
                claimInProgress = false;
            });
        }
    }).catch(function(error) {
        console.error('Firewall error:', error);
        claimInProgress = false;
        resetClaimButton();
    });
}
