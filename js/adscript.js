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

function generateHash(u) {
    if (!u) return '#00000000';
    let h = 0;
    for (let i = 0; i < u.length; i++) { h = ((h << 5) - h) + u.charCodeAt(i); h |= 0; }
    return '#' + Math.abs(h).toString(16).substring(0, 8);
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
    }
}

function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('dashboard').classList.remove('active');
}

function deploy() {
    const v = document.getElementById('links').value.trim();
    if (!v) return;
    v.split('\n').forEach(u => {
        if (u.trim()) db.ref('links').push({ url: u.trim(), hash: generateHash(u.trim()), status: 'available', user: 'NONE', createdAt: Date.now() });
    });
    document.getElementById('links').value = '';
}

function reuseLink(k) { if (confirm("Recycle this link?")) db.ref('links/' + k).update({ status: 'available', user: 'NONE' }); }

async function toggleFirewall() {
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    
    if (!globalFirewallActive) {
        if (confirm("ACTIVATE GLOBAL FIREWALL?\n\nUsers will need verification before claiming.")) {
            await db.ref('admin/globalFirewall').set({ active: true, activatedBy: "ADMIN", timestamp: Date.now() });
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
            await db.ref('admin/globalFirewall').set({ active: false, deactivatedBy: "ADMIN", timestamp: Date.now() });
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
        if (btn) { btn.className = 'firewall-on'; btn.innerHTML = '🔥 FIREWALL ON 🔥'; btn.classList.add('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required'; statusMsg.style.color = '#ff4444'; }
    } else {
        if (btn) { btn.className = 'firewall-off'; btn.innerHTML = '🔥 FIREWALL OFF'; btn.classList.remove('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'FIREWALL DEACTIVATED - Normal claiming'; statusMsg.style.color = '#39ff14'; }
    }
}

function banGhost() {
    const t = document.getElementById('banTarget').value.trim();
    if (!t) return;
    if (confirm(`Terminate ${t}?`)) db.ref('banned_ghosts/' + t).set({ timestamp: Date.now(), bannedBy: "ADMIN" });
    document.getElementById('banTarget').value = '';
}

function liftBan(i) { if (confirm(`Recover ${i}?`)) db.ref('banned_ghosts/' + i).remove(); }
function purgeGhost(p) { if (confirm(`Delete data for ${p}?`)) db.ref('user_sessions/' + p).remove(); }

async function loadStats() {
    const u = await db.ref('user_sessions').once('value');
    document.getElementById('activeUsersBadge').innerHTML = u.numChildren() + " ACTIVE";
    const b = await db.ref('banned_ghosts').once('value');
    document.getElementById('bannedBadge').innerHTML = b.numChildren() + " BANNED";
}

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

let currentUserData = [];
let currentFilter = 'none';

function filterByDev() { currentFilter = 'dev'; applyFilter(); updateFilterButtonStyles(); }
function filterByLastSeen() { currentFilter = 'lastseen'; applyFilter(); updateFilterButtonStyles(); }

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
        filteredData.sort((a, b) => (parseInt(a.devDisplay.replace('Dev', '')) || 999) - (parseInt(b.devDisplay.replace('Dev', '')) || 999));
    } else if (currentFilter === 'lastseen') {
        filteredData.sort((a, b) => b.lastSeenRaw - a.lastSeenRaw);
    }
    tbody.innerHTML = '';
    filteredData.forEach(item => {
        tbody.innerHTML += `<tr><td class="ghost-id">${item.phone}</td><td style="color:var(--ghost)">₱${item.balance}</td><td style="color:var(--neon);font-weight:bold;">${item.devDisplay}</td><td style="font-size:9px;">${item.lastSeen}</td><td><button class="icon-btn" onclick="document.getElementById('banTarget').value='${item.phone}';banGhost()" style="color:var(--neon);">🔨</button><button class="icon-btn" onclick="purgeGhost('${item.phone}')" style="color:var(--danger);">💀</button></td></tr>`;
    });
}

db.ref('links').on('value', s => {
    const t = document.getElementById('linkData');
    if (!t) return;
    t.innerHTML = '';
    s.forEach(c => {
        const d = c.val(), cls = d.status === 'available' ? 'status-avail' : 'status-used', hash = d.hash || generateHash(d.url || '');
        t.innerHTML += `<tr><td>#${c.key.substr(-4)}</td><td title="${d.url || ''}">${hash}</td><td><span class="status ${cls}">${d.status}</span></td><td class="ghost-id">${d.user === 'NONE' ? '---' : d.user}</td><td><button class="icon-btn" onclick="reuseLink('${c.key}')" style="color:var(--gold);">♻️</button><button class="icon-btn" onclick="db.ref('links/${c.key}').remove()" style="color:var(--danger);">🗑️</button></td></tr>`;
    });
});

db.ref('user_sessions').on('value', async s => {
    const t = document.getElementById('ghostData');
    if (!t) return;
    currentUserData = [];
    for (const c of s.val() ? Object.entries(s.val()) : []) {
        const d = c[1];
        const lastRaw = d.lastUpdate || 0;
        let lastFormatted = '---';
        if (lastRaw) {
            const date = new Date(lastRaw);
            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
            lastFormatted = `${hours}:${minutes} ${ampm}`;
        }
        const fp = d.deviceFingerprint || '---';
        let dev = '---';
        if (fp !== '---') dev = await getDeviceDisplayId(fp);
        currentUserData.push({ phone: d.phone || '---', balance: (d.balance || 0).toLocaleString(), devDisplay: dev, lastSeen: lastFormatted, lastSeenRaw: lastRaw });
    }
    applyFilter();
    document.getElementById('activeUsersBadge').innerHTML = (s.numChildren() || 0) + " ACTIVE";
});

db.ref('banned_ghosts').on('value', s => {
    const t = document.getElementById('banList');
    if (t) t.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--danger);">⚠️ ${s.numChildren()} terminated record(s)</td></tr>`;
    document.getElementById('bannedBadge').innerHTML = s.numChildren() + " BANNED";
});

db.ref('admin/globalFirewall').on('value', s => {
    const d = s.val();
    globalFirewallActive = (d && d.active === true);
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');
    if (globalFirewallActive) {
        if (btn) { btn.className = 'firewall-on'; btn.innerHTML = '🔥 FIREWALL ON 🔥'; btn.classList.add('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'FIREWALL ACTIVE - Verification required'; statusMsg.style.color = '#ff4444'; }
    } else {
        if (btn) { btn.className = 'firewall-off'; btn.innerHTML = '🔥 FIREWALL OFF'; btn.classList.remove('fire-animation'); }
        if (statusMsg) { statusMsg.innerHTML = 'FIREWALL DEACTIVATED - Normal claiming'; statusMsg.style.color = '#39ff14'; }
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

// ========== FIRE ANIMATION ON BODY ==========
function updateFireAnimation() {
    const body = document.body;
    if (globalFirewallActive) {
        body.classList.add('firewall-active');
        addFireParticles();
    } else {
        body.classList.remove('firewall-active');
        removeFireParticles();
    }
}

let particleInterval = null;

function addFireParticles() {
    if (particleInterval) return;
    particleInterval = setInterval(() => {
        if (!globalFirewallActive) return;
        const particle = document.createElement('div');
        particle.className = 'fire-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = Math.random() * 6 + 2 + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDuration = Math.random() * 2 + 2 + 's';
        particle.style.animationDelay = Math.random() * 2 + 's';
        document.body.appendChild(particle);
        setTimeout(() => particle.remove(), 4000);
    }, 150);
}

// ========== UPDATE BACKGROUND ON FIREWALL CHANGE ==========
function updateBackgroundTheme() {
    const body = document.body;
    if (globalFirewallActive) {
        body.classList.add('firewall-active');
    } else {
        body.classList.remove('firewall-active');
    }
}

// Call this after toggling firewall
// Add updateBackgroundTheme() in toggleFirewall and real-time listener
