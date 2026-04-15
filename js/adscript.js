/**
 * C.I.A. Command Center - Admin Panel
 */

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const SESSION_KEY = "cia_auth";
const REMEMBER_KEY = "cia_remembered";

// Toggle dropdown
function toggleDropdown(id) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('open');
}

// Master Key popup
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

// Generate hash from URL
function generateHash(url) {
    if (!url) return '#00000000';
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        hash = ((hash << 5) - hash) + url.charCodeAt(i);
        hash |= 0;
    }
    return '#' + Math.abs(hash).toString(16).substring(0, 8);
}

// Login
async function verifyAccess() {
    // Clear previous error
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.innerHTML = '';
    
    const input = document.getElementById('accessKey');
    const btn = event?.target;
    
    if (!input || !input.value) {
        if (errorDiv) errorDiv.innerHTML = "ENTER MASTER KEY!";
        return;
    }
    
    // Show loading state
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
        return true;
    }
    return false;
}

function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('dashboard').classList.remove('active');
    // Clear input
    const accessKey = document.getElementById('accessKey');
    if (accessKey) accessKey.value = '';
}

// Deploy
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

// Ban functions
function banGhost() {
    const target = document.getElementById('banTarget');
    if (!target || !target.value.trim()) return;
    const phone = target.value.trim();
    if (confirm(`Terminate ${phone}?`)) {
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

// Real-time listeners (with error handling)
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

db.ref('user_sessions').on('value', snap => {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;
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
    const activeBadge = document.getElementById('activeUsersBadge');
    if (activeBadge) activeBadge.innerHTML = snap.numChildren() + " ACTIVE";
});

db.ref('banned_ghosts').on('value', snap => {
    const tbody = document.getElementById('banList');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center; color:var(--danger);">⚠️ ${snap.numChildren()} terminated record(s) in database</td></tr>`;
    }
    const bannedBadge = document.getElementById('bannedBadge');
    if (bannedBadge) bannedBadge.innerHTML = snap.numChildren() + " BANNED";
});

// Initialize: Check remembered login or auto-login
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem(REMEMBER_KEY) === "true" || sessionStorage.getItem(SESSION_KEY) === "true") {
        sessionStorage.setItem(SESSION_KEY, "true");
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');
        loadStats();
    }
    
    // Enter key support
    const accessKey = document.getElementById('accessKey');
    if (accessKey) {
        accessKey.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') verifyAccess();
        });
    }
});
