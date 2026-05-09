/**
 * C.I.A. Command Center - Admin Panel
 * Complete with Firewall, Background Transition, Ban Protocol
 */

const firebaseConfig = {
    apiKey: "AIzaSyCjTn-hyUdZGiDHsy5_ijYu6KQCYMElsTI",
    authDomain: "casinorewards-95502.firebaseapp.com",
    databaseURL: "https://casinorewards-95502-default-rtdb.firebaseio.com",
    projectId: "casinorewards-95502",
    storageBucket: "casinorewards-95502.firebasestorage.app",
    messagingSenderId: "768311187647",
    appId: "1:768311187647:web:e26e8a5134a003ef634e0a"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const SESSION_KEY = "cia_auth";
const REMEMBER_KEY = "cia_remembered";
let globalFirewallActive = false;

// Global variable for user data
let currentUserData = [];
let currentFilter = 'none';

// ========== UI FUNCTIONS ==========
function toggleDropdown(id) { 
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
}

function showMasterKeyPopup() { 
    const popup = document.getElementById('keyPopup');
    if (popup) popup.style.display = 'flex';
}

function closeKeyPopup() { 
    const popup = document.getElementById('keyPopup');
    if (popup) popup.style.display = 'none';
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
    if (confirm(`Change master key to "${newKey}"?`)) {
        await db.ref('admin/masterKey').set(newKey);
        alert("Master key updated!");
        closeKeyPopup();
        localStorage.removeItem(REMEMBER_KEY);
        logout();
    }
}

function generateHash(u) {
    if (!u) return '#00000000';
    let h = 0;
    for (let i = 0; i < u.length; i++) { h = ((h << 5) - h) + u.charCodeAt(i); h |= 0; }
    return '#' + Math.abs(h).toString(16).substring(0, 8);
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
        checkChangeNumberStatus();
    } else {
        document.getElementById('loginError').innerHTML = "ACCESS DENIED!";
    }
}

function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('dashboard').classList.remove('active');
}

// ========== DEPLOY LINKS ==========
function deploy() {
    const v = document.getElementById('links').value.trim();
    if (!v) return;
    v.split('\n').forEach(u => {
        if (u.trim()) db.ref('links').push({ url: u.trim(), hash: generateHash(u.trim()), status: 'available', user: 'NONE', createdAt: Date.now() });
    });
    document.getElementById('links').value = '';
}

function reuseLink(k) { 
    if (confirm("Recycle this link?")) 
        db.ref('links/' + k).update({ status: 'available', user: 'NONE' }); 
}

// ========== FIREWALL FUNCTIONS ==========
async function toggleFirewall() {
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (!globalFirewallActive) {
        if (confirm("ACTIVATE GLOBAL FIREWALL?\n\nUsers will need verification before claiming.")) {
            await db.ref('admin/globalFirewall').set({ active: true, activatedBy: "ADMIN", timestamp: Date.now() });
            globalFirewallActive = true;
            if (btn) {
                btn.className = 'firewall-on';
                btn.innerHTML = '🔥 FIREWALL ON 🔥';
                btn.classList.add('fire-animation');
            }
            if (statusMsg) {
                statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
                statusMsg.style.color = '#ff4444';
            }
            updateBackgroundTheme();
            alert("🔥 FIREWALL ACTIVATED");
        }
    } else {
        if (confirm("DEACTIVATE GLOBAL FIREWALL?\n\nUsers will return to normal claiming.")) {
            await db.ref('admin/globalFirewall').set({ active: false, deactivatedBy: "ADMIN", timestamp: Date.now() });
            globalFirewallActive = false;
            if (btn) {
                btn.className = 'firewall-off';
                btn.innerHTML = '🔥 FIREWALL OFF';
                btn.classList.remove('fire-animation');
            }
            if (statusMsg) {
                statusMsg.innerHTML = 'FIREWALL DEACTIVATED - Normal claiming';
                statusMsg.style.color = '#39ff14';
            }
            updateBackgroundTheme();
            alert("🔓 FIREWALL DEACTIVATED");
        }
    }
}

async function checkGlobalFirewallStatus() {
    const snap = await db.ref('admin/globalFirewall').once('value');
    const data = snap.val();
    globalFirewallActive = (data && data.active === true);
    updateBackgroundTheme();
    
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (globalFirewallActive) {
        if (btn) { btn.className = 'firewall-on'; btn.innerHTML = '🔥 FIREWALL ON 🔥'; btn.classList.add('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required'; statusMsg.style.color = '#ff4444'; }
    } else {
        if (btn) { btn.className = 'firewall-off'; btn.innerHTML = '🔥 FIREWALL OFF'; btn.classList.remove('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'FIREWALL DEACTIVATED - Normal claiming'; statusMsg.style.color = '#39ff14'; }
    }
}

function updateBackgroundTheme() {
    const body = document.body;
    if (globalFirewallActive) {
        body.classList.add('firewall-active');
    } else {
        body.classList.remove('firewall-active');
    }
}

// ========== CHANGE NUMBER FUNCTIONS ==========
let changeNumberActive = false;

async function toggleChangeNumber() {
    const checkbox = document.getElementById('changeNumberCheckbox');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (checkbox && checkbox.checked) {
        await db.ref('admin/changeNumberRequired').set({ active: true, activatedBy: "ADMIN", timestamp: Date.now() });
        changeNumberActive = true;
        if (globalFirewallActive && statusMsg) {
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required + Change mobile number';
        }
    } else {
        await db.ref('admin/changeNumberRequired').set({ active: false, deactivatedBy: "ADMIN", timestamp: Date.now() });
        changeNumberActive = false;
        if (globalFirewallActive && statusMsg) {
            statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required';
        }
    }
}

async function checkChangeNumberStatus() {
    const snap = await db.ref('admin/changeNumberRequired').once('value');
    const data = snap.val();
    changeNumberActive = (data && data.active === true);
    const checkbox = document.getElementById('changeNumberCheckbox');
    if (checkbox) checkbox.checked = changeNumberActive;
}

// ========== BAN FUNCTIONS ==========
function banGhost() {
    const t = document.getElementById('banTarget').value.trim();
    if (!t) return;
    if (confirm(`Terminate ${t}?`)) 
        db.ref('banned_ghosts/' + t).set({ timestamp: Date.now(), bannedBy: "ADMIN" });
    document.getElementById('banTarget').value = '';
}

function liftBan(i) { 
    if (confirm(`Recover ${i}?`)) 
        db.ref('banned_ghosts/' + i).remove(); 
}

function purgeGhost(p) { 
    if (confirm(`Delete data for ${p}?`)) 
        db.ref('user_sessions/' + p).remove(); 
}

async function loadStats() {
    const u = await db.ref('user_sessions').once('value');
    const activeBadge = document.getElementById('activeUsersBadge');
    if (activeBadge) activeBadge.innerHTML = (u.numChildren() || 0) + " ACTIVE";
    
    const b = await db.ref('banned_ghosts').once('value');
    const bannedBadge = document.getElementById('bannedBadge');
    if (bannedBadge) bannedBadge.innerHTML = (b.numChildren() || 0) + " BANNED";
}

// ========== DEVICE FINGERPRINT MAPPING ==========
async function getDeviceDisplayId(fp) {
    if (!fp || fp === '---') return '---';
    const m = await db.ref('device_id_map/' + fp).once('value');
    if (m.exists()) return m.val().displayId;
    const c = await db.ref('admin/deviceCounter').once('value');
    let n = (c.val() || 0) + 1;
    await db.ref('admin/deviceCounter').set(n);
    const id = `Dev${n}`;
    await db.ref('device_id_map/' + fp).set({ displayId: id, createdAt: Date.now(), fingerprint: fp });
    return id;
}

// ========== SORT FUNCTIONS ==========
function sortByDeviceAscending() {
    currentUserData.sort((a, b) => {
        const numA = parseInt(a.devDisplay.replace('Dev', '')) || 999;
        const numB = parseInt(b.devDisplay.replace('Dev', '')) || 999;
        return numA - numB;
    });
    renderUserTable();
}

function sortByDeviceDescending() {
    currentUserData.sort((a, b) => {
        const numA = parseInt(a.devDisplay.replace('Dev', '')) || 999;
        const numB = parseInt(b.devDisplay.replace('Dev', '')) || 999;
        return numB - numA;
    });
    renderUserTable();
}

function sortByLastSeen() {
    currentUserData.sort((a, b) => b.lastSeenRaw - a.lastSeenRaw);
    renderUserTable();
}

function applyFilter() {
    renderUserTable();
}

// ========== RENDER USER TABLE ==========
function renderUserTable() {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;
    
    if (!currentUserData || currentUserData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#666; padding:40px;">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = '';
    currentUserData.forEach(user => {
        tbody.innerHTML += `
            <tr>
                <td class="ghost-id">${user.phone || '---'}</td>
                <td style="color:#39ff14">₱${user.balance || 0}</td>
                <td style="color:#00f2ff;font-weight:bold;">${user.devDisplay || '---'}</td>
                <td style="font-size:9px;">${user.lastSeen || '---'}</td>
                <td class="action-col">
                    <button class="icon-btn" onclick="purgeGhost('${user.phone}')" style="color:#ff4444;" title="Delete User">🗑️</button>
                </td>
            </tr>
        `;
    });
}

// ========== ACTION BUTTONS FUNCTIONS ==========
let actionButtonsVisible = false;

function toggleActionButtons() {
    const row = document.getElementById('actionButtonsRow');
    const badge = document.getElementById('activeUsersBadge');
    
    actionButtonsVisible = !actionButtonsVisible;
    
    if (actionButtonsVisible && row) {
        row.style.display = 'grid';
        if (badge) badge.innerHTML = badge.innerHTML.replace('▼', '▲');
    } else if (row) {
        row.style.display = 'none';
        if (badge) badge.innerHTML = badge.innerHTML.replace('▲', '▼');
    }
}

let devSortState = 0;

function toggleDevSort() {
    const btn = document.getElementById('devSortBtn');
    
    devSortState = (devSortState + 1) % 3;
    
    if (devSortState === 0) {
        if (btn) {
            btn.setAttribute('data-tooltip', 'Sort by Device (OFF)');
            btn.classList.remove('active', 'faded');
        }
    } else if (devSortState === 1) {
        if (btn) {
            btn.setAttribute('data-tooltip', 'Sort by Device (ASC)');
            btn.classList.add('faded');
            btn.classList.remove('active');
        }
        sortByDeviceAscending();
    } else if (devSortState === 2) {
        if (btn) {
            btn.setAttribute('data-tooltip', 'Sort by Device (DESC)');
            btn.classList.add('active');
            btn.classList.remove('faded');
        }
        sortByDeviceDescending();
    }
}

let timeSortActive = true;

function toggleTimeSort() {
    const btn = document.getElementById('timeSortBtn');
    const devBtn = document.getElementById('devSortBtn');
    
    timeSortActive = true;
    devSortState = 0;
    
    if (devBtn) {
        devBtn.setAttribute('data-tooltip', 'Sort by Device (OFF)');
        devBtn.classList.remove('active', 'faded');
    }
    
    if (btn) {
        btn.setAttribute('data-tooltip', 'Sort by Time (Active)');
        btn.classList.add('active');
    }
    
    sortByLastSeen();
}

// ========== REAL-TIME USER SESSIONS LISTENER ==========
db.ref('user_sessions').on('value', async (snapshot) => {
    const sessions = snapshot.val() || {};
    const usersArray = [];
    
    for (const [phone, data] of Object.entries(sessions)) {
        const lastRaw = data.lastUpdate || 0;
        let lastFormatted = '---';
        if (lastRaw) {
            const date = new Date(lastRaw);
            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            lastFormatted = `${hours}:${minutes} ${ampm}`;
        }
        
        const fp = data.deviceFingerprint || '---';
        let dev = '---';
        if (fp !== '---') dev = await getDeviceDisplayId(fp);
        
        usersArray.push({
            phone: phone,
            balance: (data.balance || 0).toLocaleString(),
            devDisplay: dev,
            lastSeen: lastFormatted,
            lastSeenRaw: lastRaw
        });
    }
    
    currentUserData = usersArray;
    sortByLastSeen(); // Default sort by last seen
    renderUserTable();
    
    // Update active users badge
    const activeBadge = document.getElementById('activeUsersBadge');
    if (activeBadge) activeBadge.innerHTML = Object.keys(sessions).length + " ACTIVE";
});

// ========== REAL-TIME LINKS LISTENER ==========
db.ref('links').on('value', (snapshot) => {
    const t = document.getElementById('linkData');
    if (!t) return;
    t.innerHTML = '';
    const links = snapshot.val() || {};
    
    Object.entries(links).forEach(([key, data]) => {
        const cls = data.status === 'available' ? 'status-avail' : 'status-used';
        const hash = data.hash || generateHash(data.url || '');
        t.innerHTML += `
            <tr>
                <td>#${key.substr(-4)}</td>
                <td title="${data.url || ''}">${hash}</td>
                <td><span class="status ${cls}">${data.status}</span></td>
                <td class="ghost-id">${data.user === 'NONE' ? '---' : data.user}</td>
                <td>
                    <button class="icon-btn" onclick="reuseLink('${key}')" style="color:#ffd700;">♻️</button>
                    <button class="icon-btn" onclick="db.ref('links/${key}').remove()" style="color:#ff3131;">🗑️</button>
                </td>
            </tr>
        `;
    });
});

// ========== REAL-TIME BANNED GHOSTS LISTENER ==========
db.ref('banned_ghosts').on('value', (snapshot) => {
    const t = document.getElementById('banList');
    if (!t) return;
    const banned = snapshot.val() || {};
    const count = Object.keys(banned).length;
    
    if (count === 0) {
        t.innerHTML = '<tr><td colspan="2" style="text-align:center; color:#666;">No banned users</td></tr>';
    } else {
        t.innerHTML = '';
        Object.entries(banned).forEach(([phone, data]) => {
            t.innerHTML += `
                <tr>
                    <td class="ghost-id">${phone}</td>
                    <td><button class="icon-btn" onclick="liftBan('${phone}')" style="color:#00ff88;">🔓 Unban</button></td>
                </tr>
            `;
        });
    }
    
    const bannedBadge = document.getElementById('bannedBadge');
    if (bannedBadge) bannedBadge.innerHTML = count + " BANNED";
});

// ========== AUTO-LOGIN ==========
if (localStorage.getItem(REMEMBER_KEY) === "true" || sessionStorage.getItem(SESSION_KEY) === "true") {
    sessionStorage.setItem(SESSION_KEY, "true");
    const loginOverlay = document.getElementById('loginOverlay');
    const dashboard = document.getElementById('dashboard');
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (dashboard) dashboard.classList.add('active');
    loadStats();
    checkGlobalFirewallStatus();
    checkChangeNumberStatus();
}

// Enter key support for login
const accessKeyInput = document.getElementById('accessKey');
if (accessKeyInput) {
    accessKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyAccess();
    });
}