/**
 * C.I.A. Command Center - Admin Panel
 * Complete with Firewall, DEV# Filter, and Last Seen Filter
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
let globalFirewallActive = false;

// ========== FILTER VARIABLES ==========
let currentUserData = [];
let currentFilter = 'none'; // 'dev', 'lastseen'

// ========== UI FUNCTIONS ==========
function toggleDropdown(id) {
    document.getElementById(id).classList.toggle('open');
}

function showMasterKeyPopup() {
    document.getElementById('keyPopup').style.display = 'flex';
}

function closeKeyPopup() {
    document.getElementById('keyPopup').style.display = 'none';
}

// ========== MASTER KEY FUNCTIONS ==========
async function getMasterKey() {
    const snap = await db.ref('admin/masterKey').once('value');
    if (snap.exists()) return snap.val();
    await db.ref('admin/masterKey').set("CIA2024");
    return "CIA2024";
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

// ========== UTILITY FUNCTIONS ==========
function generateHash(url) {
    if (!url) return '#00000000';
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        hash = ((hash << 5) - hash) + url.charCodeAt(i);
        hash |= 0;
    }
    return '#' + Math.abs(hash).toString(16).substring(0, 8);
}

// ========== LOGIN / LOGOUT ==========
async function verifyAccess() {
    const input = document.getElementById('accessKey').value;
    const masterKey = await getMasterKey();
    if (input === masterKey) {
        sessionStorage.setItem(SESSION_KEY, "true");
        localStorage.setItem(REMEMBER_KEY, "true");
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        loadStats();
        checkGlobalFirewallStatus();
    } else {
        document.getElementById('loginError').innerHTML = "ACCESS DENIED!";
        db.ref('admin/failedAttempts').push({ timestamp: Date.now() });
    }
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

// ========== FIREWALL FUNCTIONS ==========
async function toggleFirewall() {
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (!globalFirewallActive) {
        if (confirm("ACTIVATE GLOBAL FIREWALL?\n\nUsers will need verification before claiming.")) {
            await db.ref('admin/globalFirewall').set({
                active: true,
                activatedBy: "ADMIN",
                timestamp: Date.now()
            });
            globalFirewallActive = true;
            btn.className = 'firewall-on';
            btn.innerHTML = '🔥 FIREWALL ON 🔥';
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
            statusMsg.style.color = '#ff4444';
            btn.classList.add('fire-animation');
            alert("🔥 FIREWALL ACTIVATED");
        }
    } else {
        if (confirm("DEACTIVATE GLOBAL FIREWALL?\n\nUsers will return to normal claiming.")) {
            await db.ref('admin/globalFirewall').set({
                active: false,
                deactivatedBy: "ADMIN",
                timestamp: Date.now()
            });
            globalFirewallActive = false;
            btn.className = 'firewall-off';
            btn.innerHTML = '🔥 FIREWALL OFF';
            statusMsg.innerHTML = 'FIREWALL DEACTIVATED - Normal claiming';
            statusMsg.style.color = '#39ff14';
            btn.classList.remove('fire-animation');
            alert("🔓 FIREWALL DEACTIVATED");
        }
    }
}

async function checkGlobalFirewallStatus() {
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
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
            statusMsg.style.color = '#ff4444';
        }
    } else {
        if (btn) {
            btn.className = 'firewall-off';
            btn.innerHTML = '🔥 FIREWALL OFF';
            btn.classList.remove('fire-animation');
        }
        if (statusMsg) {
            statusMsg.innerHTML = 'FIREWALL DEACTIVATED - Normal claiming';
            statusMsg.style.color = '#39ff14';
        }
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

// ========== DEVICE FINGERPRINT MAPPING ==========
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

// ========== FILTER FUNCTIONS ==========
function filterByDev() {
    currentFilter = 'dev';
    applyFilter();
    updateFilterButtonStyles();
}

function filterByLastSeen() {
    currentFilter = 'lastseen';
    applyFilter();
    updateFilterButtonStyles();
}

function updateFilterButtonStyles() {
    const devBtn = document.getElementById('filterDevBtn');
    const lastSeenBtn = document.getElementById('filterLastSeenBtn');
    
    if (currentFilter === 'dev') {
        if (devBtn) devBtn.style.background = 'linear-gradient(135deg, var(--neon), #0066aa)';
        if (lastSeenBtn) lastSeenBtn.style.background = 'rgba(0,242,255,0.2)';
    } else if (currentFilter === 'lastseen') {
        if (devBtn) devBtn.style.background = 'rgba(0,242,255,0.2)';
        if (lastSeenBtn) lastSeenBtn.style.background = 'linear-gradient(135deg, var(--neon), #0066aa)';
    } else {
        if (devBtn) devBtn.style.background = 'rgba(0,242,255,0.2)';
        if (lastSeenBtn) lastSeenBtn.style.background = 'rgba(0,242,255,0.2)';
    }
}

function applyFilter() {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;
    
    let filteredData = [...currentUserData];
    
    if (currentFilter === 'dev') {
        filteredData.sort((a, b) => {
            const numA = parseInt(a.devDisplay.replace('Dev', '')) || 999;
            const numB = parseInt(b.devDisplay.replace('Dev', '')) || 999;
            return numA - numB;
        });
    } else if (currentFilter === 'lastseen') {
        filteredData.sort((a, b) => b.lastSeenRaw - a.lastSeenRaw);
    }
    
    tbody.innerHTML = '';
    filteredData.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td class="ghost-id">${item.phone}</td>
                <td style="color:var(--ghost)">₱${item.balance}</td>
                <td style="color:var(--neon); font-weight:bold;">${item.devDisplay}</td>
                <td style="font-size:9px;">${item.lastSeen}</td>
                <td>
                    <button class="icon-btn" onclick="document.getElementById('banTarget').value='${item.phone}';banGhost()" style="color:var(--neon);">🔨</button>
                    <button class="icon-btn" onclick="purgeGhost('${item.phone}')" style="color:var(--danger);">💀</button>
                </td>
            </tr>
        `;
    });
}

// ========== REAL-TIME LISTENERS ==========
// Links Monitor
db.ref('links').on('value', snap => {
    const tbody = document.getElementById('linkData');
    if (!tbody) return;
    tbody.innerHTML = '';
    snap.forEach(c => {
        const d = c.val();
        const statusClass = d.status === 'available' ? 'status-avail' : 'status-used';
        const displayHash = d.hash || generateHash(d.url || '');
        tbody.innerHTML += `
            <tr>
                <td>#${c.key.substr(-4)}</td>
                <td title="${d.url || ''}">${displayHash}</td>
                <td><span class="status ${statusClass}">${d.status}</span></td>
                <td class="ghost-id">${d.user === 'NONE' ? '---' : d.user}</td>
                <td>
                    <button class="icon-btn" onclick="reuseLink('${c.key}')" style="color:var(--gold);">♻️</button>
                    <button class="icon-btn" onclick="db.ref('links/${c.key}').remove()" style="color:var(--danger);">🗑️</button>
                </td>
            </tr>
        `;
    });
});

// User Sessions with Filter Support
db.ref('user_sessions').on('value', async snap => {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;
    
    currentUserData = [];
    
    for (const c of snap.val() ? Object.entries(snap.val()) : []) {
        const d = c[1];
        const lastSeenRaw = d.lastUpdate || 0;
        
        let lastSeenFormatted = '---';
        if (lastSeenRaw) {
            const date = new Date(lastSeenRaw);
            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            lastSeenFormatted = `${hours}:${minutes} ${ampm}`;
        }
        
        const fingerprint = d.deviceFingerprint || '---';
        let deviceDisplay = '---';
        if (fingerprint !== '---') {
            deviceDisplay = await getDeviceDisplayId(fingerprint);
        }
        
        currentUserData.push({
            phone: d.phone || '---',
            balance: (d.balance || 0).toLocaleString(),
            devDisplay: deviceDisplay,
            lastSeen: lastSeenFormatted,
            lastSeenRaw: lastSeenRaw,
            fingerprint: fingerprint
        });
    }
    
    applyFilter();
    
    const activeBadge = document.getElementById('activeUsersBadge');
    if (activeBadge) activeBadge.innerHTML = (snap.numChildren() || 0) + " ACTIVE";
});

// Banned Ghosts Monitor
db.ref('banned_ghosts').on('value', snap => {
    const tbody = document.getElementById('banList');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--danger);">⚠️ ${snap.numChildren()} terminated record(s) in database</td></tr>`;
    }
    const bannedBadge = document.getElementById('bannedBadge');
    if (bannedBadge) bannedBadge.innerHTML = snap.numChildren() + " BANNED";
});

// Global Firewall Listener
db.ref('admin/globalFirewall').on('value', snap => {
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
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
            statusMsg.style.color = '#ff4444';
        }
    } else {
        if (btn) {
            btn.className = 'firewall-off';
            btn.innerHTML = '🔥 FIREWALL OFF';
            btn.classList.remove('fire-animation');
        }
        if (statusMsg) {
            statusMsg.innerHTML = 'FIREWALL DEACTIVATED - Normal claiming';
            statusMsg.style.color = '#39ff14';
        }
    }
});

// ========== AUTO-LOGIN CHECK ==========
if (localStorage.getItem(REMEMBER_KEY) === "true" || sessionStorage.getItem(SESSION_KEY) === "true") {
    sessionStorage.setItem(SESSION_KEY, "true");
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    loadStats();
    checkGlobalFirewallStatus();
}

// ========== ENTER KEY SUPPORT ==========
document.getElementById('accessKey')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') verifyAccess();
});

// ========== CHANGE NUMBER VERIFICATION ==========
let changeNumberActive = false;

async function toggleChangeNumber() {
    const checkbox = document.getElementById('changeNumberCheckbox');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (checkbox.checked) {
        // Enable change number requirement
        await db.ref('admin/changeNumberRequired').set({
            active: true,
            activatedBy: "ADMIN",
            timestamp: Date.now()
        });
        changeNumberActive = true;
        if (statusMsg) {
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required + Change mobile number';
            statusMsg.style.color = '#ff4444';
        }
        console.log("📱 CHANGE NUMBER REQUIRED ACTIVATED");
    } else {
        // Disable change number requirement
        await db.ref('admin/changeNumberRequired').set({
            active: false,
            deactivatedBy: "ADMIN",
            timestamp: Date.now()
        });
        changeNumberActive = false;
        if (statusMsg) {
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
            statusMsg.style.color = '#ff4444';
        }
        console.log("📱 CHANGE NUMBER REQUIRED DEACTIVATED");
    }
}

async function checkChangeNumberStatus() {
    const snap = await db.ref('admin/changeNumberRequired').once('value');
    const data = snap.val();
    changeNumberActive = (data && data.active === true);
    
    const checkbox = document.getElementById('changeNumberCheckbox');
    const statusMsg = document.getElementById('firewallStatusMsg');
    const firewallActive = globalFirewallActive;
    
    if (checkbox) checkbox.checked = changeNumberActive;
    
    if (firewallActive) {
        if (changeNumberActive) {
            if (statusMsg) {
                statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required + Change mobile number';
                statusMsg.style.color = '#ff4444';
            }
        } else {
            if (statusMsg) {
                statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
                statusMsg.style.color = '#ff4444';
            }
        }
    } else {
        if (statusMsg) {
            statusMsg.innerHTML = 'FIREWALL DEACTIVATED - Normal claiming';
            statusMsg.style.color = '#39ff14';
        }
    }
}

// Add listener for change number
db.ref('admin/changeNumberRequired').on('value', snap => {
    const data = snap.val();
    changeNumberActive = (data && data.active === true);
    const checkbox = document.getElementById('changeNumberCheckbox');
    const statusMsg = document.getElementById('firewallStatusMsg');
    const firewallActive = globalFirewallActive;
    
    if (checkbox) checkbox.checked = changeNumberActive;
    
    if (firewallActive) {
        if (changeNumberActive) {
            if (statusMsg) {
                statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required + Change mobile number';
                statusMsg.style.color = '#ff4444';
            }
        } else {
            if (statusMsg) {
                statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
                statusMsg.style.color = '#ff4444';
            }
        }
    }
});

// Add event listener to checkbox
document.addEventListener('DOMContentLoaded', function() {
    const checkbox = document.getElementById('changeNumberCheckbox');
    if (checkbox) {
        checkbox.addEventListener('change', toggleChangeNumber);
    }
});