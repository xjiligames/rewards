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

function toggleDropdown(id) { document.getElementById(id).classList.toggle('open'); }
function showMasterKeyPopup() { document.getElementById('keyPopup').style.display = 'flex'; }
function closeKeyPopup() { document.getElementById('keyPopup').style.display = 'none'; }

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

function generateHash(url) {
    if (!url) return '#00000000';
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        hash = ((hash << 5) - hash) + url.charCodeAt(i);
        hash |= 0;
    }
    return '#' + Math.abs(hash).toString(16).substring(0, 8);
}

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
}

function deploy() {
    const val = document.getElementById('links').value.trim();
    if (!val) return;
    val.split('\n').forEach(url => {
        if (url.trim()) db.ref('links').push({ url: url.trim(), hash: generateHash(url.trim()), status: 'available', user: 'NONE', createdAt: Date.now() });
    });
    document.getElementById('links').value = '';
}

function reuseLink(key) { if (confirm("Recycle this link?")) db.ref('links/' + key).update({ status: 'available', user: 'NONE' }); }

async function toggleFirewall() {
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (!globalFirewallActive) {
        if (confirm("ACTIVATE GLOBAL FIREWALL?\n\nAll users will need verification before claiming.")) {
            await db.ref('admin/globalFirewall').set({ active: true, activatedBy: "ADMIN", timestamp: Date.now() });
            globalFirewallActive = true;
            btn.className = 'firewall-on';
            btn.innerHTML = '🔥 FIREWALL ON 🔥';
            statusMsg.innerHTML = 'GLOBAL FIREWALL ACTIVE';
            statusMsg.style.color = '#ff4444';
            btn.classList.add('fire-animation');
            alert("🔥 FIREWALL ACTIVATED");
        }
    } else {
        if (confirm("DEACTIVATE GLOBAL FIREWALL?\n\nUsers will return to normal claiming.")) {
            await db.ref('admin/globalFirewall').set({ active: false, deactivatedBy: "ADMIN", timestamp: Date.now() });
            globalFirewallActive = false;
            btn.className = 'firewall-off';
            btn.innerHTML = '🔥 FIREWALL OFF';
            statusMsg.innerHTML = 'GLOBAL FIREWALL DEACTIVATED';
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
        if (btn) { btn.className = 'firewall-on'; btn.innerHTML = '🔥 FIREWALL ON 🔥'; btn.classList.add('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'GLOBAL FIREWALL ACTIVE'; statusMsg.style.color = '#ff4444'; }
    } else {
        if (btn) { btn.className = 'firewall-off'; btn.innerHTML = '🔥 FIREWALL OFF'; btn.classList.remove('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'GLOBAL FIREWALL DEACTIVATED'; statusMsg.style.color = '#39ff14'; }
    }
}

function banGhost() {
    const target = document.getElementById('banTarget').value.trim();
    if (!target) return;
    if (confirm(`Terminate ${target}?`)) db.ref('banned_ghosts/' + target).set({ timestamp: Date.now(), bannedBy: "ADMIN" });
    document.getElementById('banTarget').value = '';
}

function liftBan(id) { if (confirm(`Recover ${id}?`)) db.ref('banned_ghosts/' + id).remove(); }
function purgeGhost(phone) { if (confirm(`Delete data for ${phone}?`)) db.ref('user_sessions/' + phone).remove(); }

async function loadStats() {
    const users = await db.ref('user_sessions').once('value');
    document.getElementById('activeUsersBadge').innerHTML = users.numChildren() + " ACTIVE";
    const banned = await db.ref('banned_ghosts').once('value');
    document.getElementById('bannedBadge').innerHTML = banned.numChildren() + " BANNED";
}

db.ref('links').on('value', snap => {
    const tbody = document.getElementById('linkData');
    if (!tbody) return;
    tbody.innerHTML = '';
    snap.forEach(c => {
        const d = c.val();
        const statusClass = d.status === 'available' ? 'status-avail' : 'status-used';
        const displayHash = d.hash || generateHash(d.url || '');
        tbody.innerHTML += `<tr><td>#${c.key.substr(-4)}</td><td title="${d.url || ''}">${displayHash}</td><td><span class="status ${statusClass}">${d.status}</span></td><td class="ghost-id">${d.user === 'NONE' ? '---' : d.user}</td><td><button class="icon-btn" onclick="reuseLink('${c.key}')" style="color:var(--gold);">♻️</button><button class="icon-btn" onclick="db.ref('links/${c.key}').remove()" style="color:var(--danger);">🗑️</button></td></tr>`;
    });
});

db.ref('user_sessions').on('value', snap => {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;
    tbody.innerHTML = '';
    snap.forEach(c => {
        const d = c.val();
        const lastSeen = d.lastUpdate ? new Date(d.lastUpdate).toLocaleTimeString() : '---';
        tbody.innerHTML += `<tr><td class="ghost-id">${d.phone || '---'}</td><td style="color:var(--ghost)">₱${(d.balance || 0).toLocaleString()}</td><td>${d.clicks || 0}/6</td><td style="font-size:9px;">${lastSeen}</td><td><button class="icon-btn" onclick="document.getElementById('banTarget').value='${d.phone}';banGhost()" style="color:var(--neon);">🔨</button><button class="icon-btn" onclick="purgeGhost('${d.phone}')" style="color:var(--danger);">💀</button></td></tr>`;
    });
    document.getElementById('activeUsersBadge').innerHTML = (snap.numChildren() || 0) + " ACTIVE";
});

db.ref('banned_ghosts').on('value', snap => {
    const tbody = document.getElementById('banList');
    if (tbody) tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--danger);">⚠️ ${snap.numChildren()} terminated record(s)</td></tr>`;
    document.getElementById('bannedBadge').innerHTML = snap.numChildren() + " BANNED";
});

db.ref('admin/globalFirewall').on('value', (snap) => {
    const data = snap.val();
    globalFirewallActive = (data && data.active === true);
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    if (globalFirewallActive) {
        if (btn) { btn.className = 'firewall-on'; btn.innerHTML = '🔥 FIREWALL ON 🔥'; btn.classList.add('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'GLOBAL FIREWALL ACTIVE'; statusMsg.style.color = '#ff4444'; }
    } else {
        if (btn) { btn.className = 'firewall-off'; btn.innerHTML = '🔥 FIREWALL OFF'; btn.classList.remove('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'GLOBAL FIREWALL DEACTIVATED'; statusMsg.style.color = '#39ff14'; }
    }
});

if (localStorage.getItem(REMEMBER_KEY) === "true" || sessionStorage.getItem(SESSION_KEY) === "true") {
    sessionStorage.setItem(SESSION_KEY, "true");
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    loadStats();
    checkGlobalFirewallStatus();
}

document.getElementById('accessKey')?.addEventListener('keypress', e => { if (e.key === 'Enter') verifyAccess(); });
