/**
 * PROMOTION.JS - REMASTERED
 * Optimized for Firebase Sync, LocalStorage Integrity, and UI Responsiveness
 */

// --- UTILITIES & STORAGE KEYS ---
const getKeys = () => {
    const phone = localStorage.getItem("userPhone");
    if (!phone) return null;
    return {
        phone,
        balance: `userBalance_${phone}`,
        leftReward: `leftReward_${phone}`,
        invites: `invitations_${phone}`,
        invitesCount: `invitesCount_${phone}`
    };
};

const getDBRef = () => {
    const phone = localStorage.getItem("userPhone");
    if (!phone || typeof firebase === 'undefined') return null;
    return firebase.database().ref(`user_sessions/${phone}`);
};

// --- CORE DATA ACTIONS ---
async function syncDataFromFirebase() {
    const userPhone = localStorage.getItem("userPhone");
    const keys = getKeys();
    if (!userPhone || !keys) return;

    const dbRef = getDBRef();
    if (!dbRef) return;

    try {
        const snapshot = await dbRef.once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            
            // Sync Balance
            if (data.balance !== undefined) {
                localStorage.setItem(keys.balance, data.balance);
            }
            
            // Sync Left Reward Status
            if (data.leftRewardClaimed) {
                localStorage.setItem(keys.leftReward, 'true');
            }

            // Sync Invitations if exists in DB
            if (data.invitations) {
                localStorage.setItem(keys.invites, JSON.stringify(data.invitations));
                localStorage.setItem(keys.invitesCount, data.invitations.length);
            }

            refreshUI();
        }
    } catch (error) {
        console.error("Firebase Sync Error:", error);
    }
}

async function updateBalance(amount) {
    const keys = getKeys();
    const dbRef = getDBRef();
    if (!keys) return;

    let current = parseInt(localStorage.getItem(keys.balance)) || 0;
    let updated = current + amount;

    // Hard Cap at 1200
    if (updated > 1200) updated = 1200;

    // Save Locally
    localStorage.setItem(keys.balance, updated);
    
    // Save to Firebase
    if (dbRef) {
        try {
            await dbRef.update({ 
                balance: updated, 
                lastUpdate: firebase.database.ServerValue.TIMESTAMP 
            });
        } catch (e) { console.warn("Firebase update failed, saved locally only."); }
    }
    
    refreshUI();
    return updated;
}

// --- UI UPDATERS ---
function refreshUI() {
    const keys = getKeys();
    if (!keys) return;

    // Update Balance Display
    const bal = localStorage.getItem(keys.balance) || "0";
    const balEl = document.getElementById('userBalanceDisplay');
    if (balEl) balEl.innerHTML = `₱${bal}`;

    // Update Invites Count
    const count = localStorage.getItem(keys.invitesCount) || "0";
    const countEl = document.getElementById('invitesCountDisplay');
    if (countEl) countEl.innerHTML = `${count} / 6`;

    // Update Left Card
    const isClaimed = localStorage.getItem(keys.leftReward) === 'true';
    const leftCard = document.getElementById('leftCard');
    if (leftCard) {
        leftCard.classList.toggle('prize-card-claimed', isClaimed);
        leftCard.classList.toggle('prize-card-glow', !isClaimed);
    }

    renderInviteList();
}

function renderInviteList() {
    const keys = getKeys();
    const listBody = document.getElementById('sentInvitesList'); // Fixed ID
    if (!listBody || !keys) return;

    const invites = JSON.parse(localStorage.getItem(keys.invites) || "[]");
    
    if (invites.length === 0) {
        listBody.innerHTML = '<div style="opacity:0.5; text-align:center; padding:10px;">No invitations yet</div>';
        return;
    }

    listBody.innerHTML = invites.map(inv => {
        const maskedPhone = inv.phone.replace(/(\d{4})\d{4}(\d{3})/, "$1****$2");
        const statusClass = inv.status === 'approved' ? 'approved' : 'pending';
        return `
            <div class="invite-item">
                <span>${maskedPhone}</span>
                <span class="status-badge ${statusClass}">${inv.status.toUpperCase()}</span>
                <button onclick="deleteInvite('${inv.phone}')" 
                        ${inv.status === 'approved' ? 'disabled' : ''} 
                        style="background:none; border:none; color:#ff4444; cursor:pointer;">✕</button>
            </div>
        `;
    }).join('');
}

// --- INTERACTIVE ACTIONS ---
window.sendInviteToStorage = async function() {
    const input = document.getElementById('friendPhoneInput');
    const phone = input.value.trim();
    const keys = getKeys();
    const userPhone = localStorage.getItem("userPhone");

    if (!/^09\d{9}$/.test(phone)) return alert("Enter a valid 11-digit GCash number (09XXXXXXXXX)");
    if (phone === userPhone) return alert("You cannot invite yourself!");
    
    let invites = JSON.parse(localStorage.getItem(keys.invites) || "[]");
    if (invites.length >= 6) return alert("Maximum 6 invites reached!");
    if (invites.some(i => i.phone === phone)) return alert("Already invited!");

    const newInvite = { phone, status: 'pending', timestamp: Date.now() };
    invites.push(newInvite);

    localStorage.setItem(keys.invites, JSON.stringify(invites));
    localStorage.setItem(keys.invitesCount, invites.length);
    
    // Sync to Firebase
    const dbRef = getDBRef();
    if (dbRef) dbRef.update({ invitations: invites });

    input.value = '';
    refreshUI();
    alert("Invitation Sent!");
};

window.deleteInvite = function(phone) {
    const keys = getKeys();
    let invites = JSON.parse(localStorage.getItem(keys.invites) || "[]");
    
    const invite = invites.find(i => i.phone === phone);
    if (invite?.status === 'approved') return alert("Cannot delete approved invites!");

    if (confirm("Remove this invitation?")) {
        invites = invites.filter(i => i.phone !== phone);
        localStorage.setItem(keys.invites, JSON.stringify(invites));
        localStorage.setItem(keys.invitesCount, invites.length);
        
        const dbRef = getDBRef();
        if (dbRef) dbRef.update({ invitations: invites });
        refreshUI();
    }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const userPhone = localStorage.getItem("userPhone");
    if (!userPhone) {
        alert("Please login first.");
        window.location.href = "index.html";
        return;
    }

    // Phone Masking Display
    const display = document.getElementById('userPhoneDisplay');
    if (display) display.innerText = userPhone.replace(/(\d{4})\d{4}(\d{3})/, "$1****$2");

    // Load Data
    syncDataFromFirebase();
    refreshUI();

    // Event Listeners
    const sendBtn = document.getElementById('sendInviteBtn');
    if (sendBtn) sendBtn.onclick = window.sendInviteToStorage;

    const claimNowBtn = document.getElementById('claimNowBtn');
    if (claimNowBtn) {
        claimNowBtn.onclick = () => {
            const popup = document.getElementById('prizePopup');
            if (popup) popup.style.display = 'flex';
        };
    }
    
    // Lucky Card Logic (If present)
    const leftCard = document.getElementById('leftCard');
    if (leftCard) {
        leftCard.onclick = async () => {
            const keys = getKeys();
            if (localStorage.getItem(keys.leftReward) === 'true') return alert("Already claimed!");
            
            await updateBalance(150);
            localStorage.setItem(keys.leftReward, 'true');
            
            const dbRef = getDBRef();
            if (dbRef) dbRef.update({ leftRewardClaimed: true });

            if (window.startConfetti) window.startConfetti();
            refreshUI();
            alert("Congratulations! ₱150 added to your balance.");
        };
    }
});
