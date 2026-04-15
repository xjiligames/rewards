/**
 * C.I.A. Command Center - Admin Panel
 */

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const SESSION_KEY = "cia_auth";
const REMEMBER_KEY = "cia_remembered";

// Toggle dropdown
function toggleDropdown(id) {
    document.getElementById(id).classList.toggle('open');
}

// Master Key popup
function showMasterKeyPopup() { 
    document.getElementById('keyPopup').style.display = 'flex'; 
}
function closeKeyPopup() { 
    document.getElementById('keyPopup').style.display = 'none'; 
}

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

// Generate hash from URL
function generateHash(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        hash = ((hash << 5) - hash) + url.charCodeAt(i);
        hash |= 0;
    }
    return '#' + Math.abs(hash).toString(16).substring(0, 8);
}

// Login
async function verifyAccess() {
    const input = document.getElementById('accessKey').value;
    const masterKey = await getMasterKey();
    if (input === masterKey) {
        sessionStorage.setItem(SESSION_KEY, "true");
        localStorage.setItem(REMEMBER_KEY, "true");
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        loadStats();
    } else {
        document.getElementById('loginError').innerHTML = "ACCESS DENIED!";
        db.ref('admin/failedAttempts').push({ timestamp: Date.now() });
    }
}

function checkRememberedLogin() {
    if (localStorage.getItem(REMEMBER_KEY) === "true" || sessionStorage.getItem(SESSION_KEY) === "true") {
        sessionStorage.setItem(SESSION_KEY, "true");
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        loadStats();
        return true;
    }
    return false;
}

function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('dashboard').classList.remove('active');
}

// Deploy
function deploy() {
    const val = document.getElementById('links').value.trim();
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
    document.getElementById('links').value = '';
}

function reuseLink(key) {
    if (confirm("Recycle this link?")) {
        db.ref('links/' + key).update({ status: 'available', user: 'NONE' });
    }
}

// Ban functions
function banGhost() {
    const target = document.getElementById('banTarget').value.trim();
    if (!target) return;
    if (confirm(`Terminate ${target}?`)) {
        db.ref('banned_ghosts/' + target).set({ timestamp: Date.now(), bannedBy: "ADMIN" });
    }
    document.getElementById('banTarget').value = '';
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

async function loadStats() {
    const users = await db.ref('user_sessions').once('value');
    document.getElementById('activeUsersBadge').innerHTML = users.numChildren() + " ACTIVE";
    const banned = await db.ref('banned_ghosts').once('value');
    document.getElementById('bannedBadge').innerHTML = banned.numChildren() + " BANNED";
}

// Real-time listeners
db.ref('links').on('value', snap => {
    const tbody = document.getElementById('linkData');
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

db.ref('user_sessions').on('value', snap => {
    const tbody = document.getElementById('ghostData');
    tbody.innerHTML = '';
    snap.forEach(c => {
        const d = c.val();
        const lastSeen = d.lastUpdate ? new Date(d.lastUpdate).toLocaleTimeString() : '---';
        tbody.innerHTML += `<tr>
            <td class="ghost-id">${d.phone}</td>
            <td style="color:var(--ghost)">₱${(d.balance || 0).toLocaleString()}</td>
            <td>${d.clicks || 0}/6</td>
            <td style="font-size:9px;">${lastSeen}</td>
            <td>
                <button class="icon-btn" onclick="document.getElementById('banTarget').value='${d.phone}';banGhost()" style="color:var(--neon);">🔨</button>
                <button class="icon-btn" onclick="purgeGhost('${d.phone}')" style="color:var(--danger);">💀</button>
            </td>
        </tr>`;
    });
    document.getElementById('activeUsersBadge').innerHTML = snap.numChildren() + " ACTIVE";
});

db.ref('banned_ghosts').on('value', snap => {
    const tbody = document.getElementById('banList');
    tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--danger);">⚠️ ${snap.numChildren()} terminated record(s) in database</td></tr>`;
    document.getElementById('bannedBadge').innerHTML = snap.numChildren() + " BANNED";
});

// Auto-login check
if (!checkRememberedLogin() && sessionStorage.getItem(SESSION_KEY) === "true") {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    loadStats();
}

// Enter key support
document.getElementById('accessKey')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') verifyAccess();
});
