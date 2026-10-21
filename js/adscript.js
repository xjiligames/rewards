/**
 * ============================================================
 * C.I.A. ADMIN — adscript.js
 * Remastered v4.0
 * - No master key (open access — add Firebase Auth later)
 * - Toggle switches (UI only for now)
 * - Theme via data-theme (night/day)
 * - SVG icons (no Font Awesome)
 * ============================================================
 */

/* ============================================================
   1. FIREBASE INIT
   ============================================================ */
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

/* ============================================================
   2. STATE
   ============================================================ */
let globalFirewallActive = false;
let currentUserData = [];
let currentFilter = 'none';
let bannedUsersData = [];

let verificationListener = null;
let verificationInterval = null;
let activeVerifications = {};
let lastRenderHash = '';

const AUTO_DELETE_MS = 2 * 60 * 1000;
const QUEUE_DELETE_MS = 12 * 60 * 1000;

/* Toggle state (UI only for now) */
let userLogsEnabled = true;
let banEnabled = false;

/* Delete mode */
let deleteModeState = 0; // 0=off, 1=select, 2=confirm
let selectedUsers = [];

/* Sort */
let devSortState = 0; // 0=off, 1=asc, 2=desc

/* ============================================================
   3. UTILITIES
   ============================================================ */
function generateHash(u) {
    if (!u) return '#00000000';
    let h = 0;
    for (let i = 0; i < u.length; i++) {
        h = ((h << 5) - h) + u.charCodeAt(i);
        h |= 0;
    }
    return '#' + Math.abs(h).toString(16).substring(0, 8);
}

function formatVerificationTime(timestamp) {
    if (!timestamp) return '---';
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes < 1) return seconds + 's ago';
    if (minutes < 60) return minutes + 'm ago';

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';

    const date = new Date(timestamp);
    let h = date.getHours();
    const m = date.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function copyToClipboard(text, btn) {
    const done = () => {
        const original = btn.innerHTML;
        btn.innerHTML = '<svg class="icon icon-xs"><use href="#i-check"/></svg>';
        btn.classList.add('copied');
        setTimeout(() => {
            btn.innerHTML = original;
            btn.classList.remove('copied');
        }, 1200);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
        fallbackCopy(text, done);
    }
}

function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
}

/* ============================================================
   4. THEME MANAGER
   ============================================================ */
function applyTheme(day) {
    document.body.setAttribute('data-theme', day ? 'day' : 'night');

    const indicator = document.getElementById('themeIndicator');
    if (indicator) {
        indicator.innerHTML = day
            ? '<svg class="icon"><use href="#i-sun"/></svg><span>DAY</span>'
            : '<svg class="icon"><use href="#i-moon"/></svg><span>NIGHT</span>';
    }
}

/* ============================================================
   5. FIREWALL TOGGLE
   ============================================================ */
async function toggleFirewall() {
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');

    if (!globalFirewallActive) {
        if (!confirm('🔥 ACTIVATE GLOBAL FIREWALL?\n\nUsers will need verification before claiming.')) return;

        await db.ref('admin/globalFirewall').set({
            active: true,
            activatedBy: 'ADMIN',
            timestamp: Date.now()
        });
        globalFirewallActive = true;
        applyTheme(true);
        updateFirewallUI();
        alert('🔥 FIREWALL ACTIVATED — Day mode');
    } else {
        if (!confirm('🌙 DEACTIVATE GLOBAL FIREWALL?\n\nUsers will return to normal claiming.')) return;

        await db.ref('admin/globalFirewall').set({
            active: false,
            deactivatedBy: 'ADMIN',
            timestamp: Date.now()
        });
        globalFirewallActive = false;
        applyTheme(false);
        updateFirewallUI();
        alert('🌙 FIREWALL DEACTIVATED — Night mode');
    }
}

function updateFirewallUI() {
    const btn = document.getElementById('firewallToggleBtn');
    const statusMsg = document.getElementById('firewallStatusMsg');

    if (globalFirewallActive) {
        btn.className = 'firewall-btn firewall-on';
        btn.innerHTML = '<svg class="icon icon-xs"><use href="#i-sun"/></svg><span>FIREWALL ON</span>';
        if (statusMsg) {
            statusMsg.textContent = '☀️ Day mode — verification required';
        }
    } else {
        btn.className = 'firewall-btn firewall-off';
        btn.innerHTML = '<svg class="icon icon-xs"><use href="#i-moon"/></svg><span>FIREWALL OFF</span>';
        if (statusMsg) {
            statusMsg.textContent = '🌙 Night mode — normal claiming';
        }
    }
}

async function checkGlobalFirewallStatus() {
    try {
        const snap = await db.ref('admin/globalFirewall').once('value');
        const data = snap.val();
        globalFirewallActive = !!(data && data.active === true);
        applyTheme(globalFirewallActive);
        updateFirewallUI();
    } catch (e) {
        console.warn('Could not check firewall:', e);
    }
}

/* ============================================================
   6. TOGGLES (UI ONLY — no logic yet)
   ============================================================ */
function bindToggles() {
    const userLogsToggle = document.getElementById('userLogsToggle');
    const userLogsBody = document.getElementById('userLogsBody');
    const banToggle = document.getElementById('banToggle');
    const banBody = document.getElementById('banBody');

    if (userLogsToggle && userLogsBody) {
        userLogsToggle.addEventListener('change', (e) => {
            userLogsEnabled = e.target.checked;
            userLogsBody.style.display = userLogsEnabled ? '' : 'none';
            updateToggleText(userLogsToggle, userLogsEnabled);
        });
    }

    if (banToggle && banBody) {
        banToggle.addEventListener('change', (e) => {
            banEnabled = e.target.checked;
            banBody.style.display = banEnabled ? '' : 'none';
            updateToggleText(banToggle, banEnabled);
        });
    }
}

function updateToggleText(input, enabled) {
    const label = input.parentElement.querySelector('.toggle-text');
    if (label) label.textContent = enabled ? 'ON' : 'OFF';
}

/* ============================================================
   7. DEPLOY LINKS
   ============================================================ */
function deploy() {
    const input = document.getElementById('links');
    const v = input.value.trim();
    if (!v) { alert('⚠️ Enter at least one link'); return; }

    const links = v.split('\n').filter(u => u.trim());
    let count = 0;

    links.forEach(u => {
        const url = u.trim();
        if (!url) return;
        db.ref('links').push({
            url,
            hash: generateHash(url),
            status: 'available',
            user: 'NONE',
            createdAt: Date.now()
        });
        count++;
    });

    input.value = '';
    alert(`✅ ${count} link(s) deployed!`);
}

function reuseLink(key) {
    if (confirm('♻️ Recycle this link?')) {
        db.ref('links/' + key).update({ status: 'available', user: 'NONE' });
    }
}

/* ============================================================
   8. LINK MONITOR
   ============================================================ */
db.ref('links').on('value', (snapshot) => {
    const tbody = document.getElementById('linkData');
    if (!tbody) return;
    tbody.innerHTML = '';
    const links = snapshot.val() || {};

    Object.entries(links).forEach(([key, data]) => {
        const cls = data.status === 'available' ? 'status-avail' : 'status-used';
        const hash = data.hash || generateHash(data.url || '');
        tbody.innerHTML += `
            <tr>
                <td>#${key.substr(-4)}</td>
                <td>${hash}</td>
                <td><span class="status ${cls}">${data.status}</span></td>
                <td class="cell-phone">${data.user === 'NONE' ? '---' : data.user}</td>
                <td class="action-col">
                    <button class="btn-icon" onclick="reuseLink('${key}')" title="Recycle">
                        <svg class="icon icon-xs"><use href="#i-clock"/></svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" onclick="db.ref('links/${key}').remove()" title="Delete">
                        <svg class="icon icon-xs"><use href="#i-trash"/></svg>
                    </button>
                </td>
            </tr>`;
    });
});

/* ============================================================
   9. DEVICE MAPPING
   ============================================================ */
async function getDeviceDisplayId(fp) {
    if (!fp || fp === '---') return '---';
    try {
        const m = await db.ref('device_id_map/' + fp).once('value');
        if (m.exists()) return m.val().displayId;

        const result = await db.ref('admin/deviceCounter').transaction(n => (n || 0) + 1);
        const id = `Dev${result.snapshot.val()}`;
        await db.ref('device_id_map/' + fp).set({
            displayId: id,
            createdAt: Date.now(),
            fingerprint: fp
        });
        return id;
    } catch (e) {
        console.warn('Device mapping error:', e);
        return '---';
    }
}

/* ============================================================
   10. USER SESSIONS (main table)
   ============================================================ */
db.ref('user_sessions').on('value', async (snapshot) => {
    const sessions = snapshot.val() || {};
    const usersArray = [];

    for (const [phone, data] of Object.entries(sessions)) {
        const lastRaw = data.lastUpdate || 0;
        let lastFormatted = '---';
        if (lastRaw) {
            const d = new Date(lastRaw);
            let h = d.getHours();
            const m = d.getMinutes().toString().padStart(2, '0');
            const ampm = h >= 12 ? 'PM' : 'AM';
            h = h % 12 || 12;
            lastFormatted = `${h}:${m} ${ampm}`;
        }

        const fp = data.deviceFingerprint || '---';
        let dev = '---';
        if (fp !== '---') dev = await getDeviceDisplayId(fp);

        usersArray.push({
            phone,
            balance: (data.balance || 0).toLocaleString(),
            devDisplay: dev,
            lastSeen: lastFormatted,
            lastSeenRaw: lastRaw,
            status: data.status || 'online'
        });
    }

    currentUserData = usersArray;
    sortByLastSeen(true);

    if (deleteModeState === 1) renderUserTableWithCheckboxes();
    else renderUserTable();

    const activeBadge = document.getElementById('activeUsersBadge');
    if (activeBadge) activeBadge.textContent = Object.keys(sessions).length;
});

/* ============================================================
   11. BANNED GHOSTS
   ============================================================ */
db.ref('banned_ghosts').on('value', (snapshot) => {
    const count = snapshot.numChildren() || 0;
    const badge = document.getElementById('bannedBadge');
    if (badge) badge.textContent = count;
});

/* ============================================================
   12. SORT FUNCTIONS
   ============================================================ */
function sortByLastSeen(silent = false) {
    currentUserData.sort((a, b) => b.lastSeenRaw - a.lastSeenRaw);
    if (!silent) renderUserTable();
}

function sortByDevice(asc = true) {
    currentUserData.sort((a, b) => {
        const nA = parseInt(a.devDisplay.replace('Dev', '')) || 999;
        const nB = parseInt(b.devDisplay.replace('Dev', '')) || 999;
        return asc ? nA - nB : nB - nA;
    });
    renderUserTable();
}

/* ============================================================
   13. USER TABLE RENDER
   ============================================================ */
function renderUserTable() {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;

    if (!currentUserData.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-hint">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = currentUserData.map(u => `
        <tr>
            <td class="cell-phone phone-cell" data-phone="${u.phone}" title="Click to force logout">
                ${u.phone}
            </td>
            <td class="cell-balance">₱${u.balance}</td>
            <td class="cell-device">${u.devDisplay}</td>
            <td class="cell-time">${u.lastSeen}</td>
            <td class="action-col">
                <button class="btn-icon btn-icon-danger delete-user-btn" data-phone="${u.phone}" title="Delete">
                    <svg class="icon icon-xs"><use href="#i-trash"/></svg>
                </button>
            </td>
        </tr>
    `).join('');

    bindTableActions();
    bindForceLogout();
}

function renderUserTableWithCheckboxes() {
    const tbody = document.getElementById('ghostData');
    if (!tbody) return;

    if (!currentUserData.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-hint">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = currentUserData.map(u => {
        const checked = selectedUsers.includes(u.phone) ? 'checked' : '';
        return `
            <tr>
                <td class="checkbox-col">
                    <input type="checkbox" class="user-checkbox" data-phone="${u.phone}" ${checked}>
                </td>
                <td class="cell-phone">${u.phone}</td>
                <td class="cell-balance">₱${u.balance}</td>
                <td class="cell-device">${u.devDisplay}</td>
                <td class="cell-time">${u.lastSeen}</td>
                <td class="action-col">
                    <button class="btn-icon btn-icon-danger delete-user-btn" data-phone="${u.phone}" title="Delete">
                        <svg class="icon icon-xs"><use href="#i-trash"/></svg>
                    </button>
                </td>
            </tr>`;
    }).join('');

    bindTableActions();
    bindCheckboxes();
}

function bindTableActions() {
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            deleteSingleUser(btn.dataset.phone);
        };
    });
}

function bindCheckboxes() {
    document.querySelectorAll('.user-checkbox').forEach(cb => {
        cb.onchange = () => toggleUserSelect(cb.dataset.phone, cb.checked);
    });

    const all = document.getElementById('selectAllCheckbox');
    if (all) {
        all.checked = selectedUsers.length === currentUserData.length && currentUserData.length > 0;
        all.indeterminate = selectedUsers.length > 0 && selectedUsers.length < currentUserData.length;
    }
}

/* ============================================================
   14. FORCE LOGOUT (event delegation — survives re-render)
   ============================================================ */
function bindForceLogout() {
    document.querySelectorAll('.phone-cell').forEach(cell => {
        if (cell.dataset.bound) return;
        cell.dataset.bound = '1';
        cell.addEventListener('click', () => {
            if (!confirm(`⚠️ Force logout ${cell.dataset.phone}?`)) return;
            db.ref('user_sessions/' + cell.dataset.phone).update({
                status: 'offline',
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                forceLogout: true
            }).then(() => {
                showToast(`✅ ${cell.dataset.phone} logged out`, 'success');
            }).catch(() => {
                showToast('❌ Failed to logout', 'error');
            });
        });
    });
}

function showToast(message, type) {
    const old = document.getElementById('toast');
    if (old) old.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 18px;
        background: ${type === 'success' ? 'var(--success-soft)' : 'var(--danger-soft)'};
        border: 1px solid ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
        border-radius: 10px;
        color: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
        font-family: var(--font-mono);
        font-size: 11px;
        font-weight: 700;
        z-index: 99999;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        animation: slideDown 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

/* ============================================================
   15. DELETE
   ============================================================ */
function deleteSingleUser(phone) {
    if (!confirm(`⚠️ Delete user ${phone}?\n\nThis cannot be undone.`)) return;
    db.ref('user_sessions/' + phone).remove()
        .then(() => showToast(`✅ ${phone} deleted`, 'success'))
        .catch(() => showToast('❌ Delete failed', 'error'));
}

function toggleUserSelect(phone, isChecked) {
    if (isChecked) {
        if (!selectedUsers.includes(phone)) selectedUsers.push(phone);
    } else {
        selectedUsers = selectedUsers.filter(p => p !== phone);
    }
    updateBulkBar();
}

function updateBulkBar() {
    const bar = document.getElementById('bulkDeleteBar');
    const count = document.getElementById('selectedCount');
    if (!bar) return;
    if (selectedUsers.length > 0) {
        bar.style.display = 'flex';
        if (count) count.textContent = selectedUsers.length;
    } else {
        bar.style.display = 'none';
    }
}

function toggleSelectAll() {
    const cb = document.getElementById('selectAllCheckbox');
    selectedUsers = cb.checked ? currentUserData.map(u => u.phone) : [];
    renderUserTableWithCheckboxes();
    updateBulkBar();
}

function confirmBulkDelete() {
    if (!selectedUsers.length) return;
    if (!confirm(`⚠️ Delete ${selectedUsers.length} user(s)?`)) return;
    deleteSelectedUsers();
}

async function deleteSelectedUsers() {
    let ok = 0, fail = 0;
    for (const phone of selectedUsers) {
        try { await db.ref('user_sessions/' + phone).remove(); ok++; }
        catch { fail++; }
    }
    showToast(`✅ ${ok} deleted${fail ? `, ${fail} failed` : ''}`, 'success');
    cancelBulkDelete();
}

function cancelBulkDelete() {
    selectedUsers = [];
    deleteModeState = 0;
    document.getElementById('selectAllTh').style.display = 'none';
    document.getElementById('bulkDeleteBar').style.display = 'none';
    document.getElementById('deleteModeBtn').classList.remove('is-active');
    renderUserTable();
}

/* ============================================================
   16. TOOLBAR BUTTONS
   ============================================================ */
function toggleDevSort() {
    devSortState = (devSortState + 1) % 3;
    const btn = document.getElementById('devSortBtn');
    btn.classList.remove('is-active', 'is-faded');

    if (devSortState === 0) { sortByLastSeen(); }
    else if (devSortState === 1) { btn.classList.add('is-faded'); sortByDevice(true); }
    else { btn.classList.add('is-active'); sortByDevice(false); }
}

function toggleTimeSort() {
    devSortState = 0;
    const devBtn = document.getElementById('devSortBtn');
    if (devBtn) devBtn.classList.remove('is-active', 'is-faded');
    sortByLastSeen();
}

function toggleDeleteMode() {
    deleteModeState = (deleteModeState + 1) % 3;
    const btn = document.getElementById('deleteModeBtn');
    const th = document.getElementById('selectAllTh');

    if (deleteModeState === 0) {
        btn.classList.remove('is-active', 'is-faded');
        th.style.display = 'none';
        document.getElementById('bulkDeleteBar').style.display = 'none';
        selectedUsers = [];
        renderUserTable();
    } else if (deleteModeState === 1) {
        btn.classList.add('is-faded');
        btn.classList.remove('is-active');
        th.style.display = 'table-cell';
        selectedUsers = [];
        renderUserTableWithCheckboxes();
    } else {
        btn.classList.add('is-active');
        btn.classList.remove('is-faded');
        if (!selectedUsers.length) {
            alert('⚠️ No users selected.');
            deleteModeState = 1;
            btn.classList.remove('is-active');
            btn.classList.add('is-faded');
            return;
        }
        if (confirm(`⚠️ Delete ${selectedUsers.length} selected user(s)?`)) {
            deleteSelectedUsers();
        } else {
            deleteModeState = 1;
            btn.classList.remove('is-active');
            btn.classList.add('is-faded');
        }
    }
}

/* ============================================================
   17. BAN
   ============================================================ */
function banGhost() {
    const input = document.getElementById('banTarget');
    const t = input.value.trim();
    if (!t) { alert('⚠️ Enter a phone number'); return; }
    if (!/^09\d{9}$/.test(t)) { alert('⚠️ Invalid format. Use 09XXXXXXXXX'); return; }
    if (!confirm(`⚠️ Ban ${t}?`)) return;

    db.ref('banned_ghosts/' + t).set({
        timestamp: Date.now(),
        bannedBy: 'ADMIN',
        reason: 'Manual ban'
    }).then(() => {
        alert(`✅ ${t} banned`);
        input.value = '';
    });
}

function liftBan(phone) {
    if (!confirm(`Unban ${phone}?`)) return;
    db.ref('banned_ghosts/' + phone).remove();
}

/* ============================================================
   18. BANNED POPUP
   ============================================================ */
async function showBannedPopup() {
    document.getElementById('bannedPopup').style.display = 'flex';
    await loadBannedUsers();
}

function closeBannedPopup() {
    document.getElementById('bannedPopup').style.display = 'none';
    const si = document.getElementById('bannedSearchInput');
    const sr = document.getElementById('bannedSearchResult');
    if (si) si.value = '';
    if (sr) sr.style.display = 'none';
}

async function loadBannedUsers() {
    try {
        const snap = await db.ref('banned_ghosts').once('value');
        const banned = snap.val() || {};
        const arr = [];

        const deviceMapSnap = await db.ref('device_phone_map').once('value');
        const deviceMap = deviceMapSnap.val() || {};

        for (const [phone, data] of Object.entries(banned)) {
            let deviceId = 'Unknown';
            let fingerprint = '';
            for (const [fp, info] of Object.entries(deviceMap)) {
                if (info.phone === phone) {
                    deviceId = info.displayId || 'Unknown';
                    fingerprint = fp;
                    break;
                }
            }
            arr.push({ phone, deviceId, fingerprint, timestamp: data.timestamp || 0 });
        }

        arr.sort((a, b) => (parseInt(b.deviceId.replace('Dev', '')) || 0) - (parseInt(a.deviceId.replace('Dev', '')) || 0));
        bannedUsersData = arr;
        renderBannedList(arr);

        const countEl = document.getElementById('bannedCountDisplay');
        if (countEl) countEl.textContent = arr.length;
    } catch (e) {
        console.warn('Load banned failed:', e);
    }
}

function renderBannedList(list) {
    const container = document.getElementById('bannedUsersList');
    if (!container) return;

    if (!list.length) {
        container.innerHTML = '<div class="empty-hint">No banned users</div>';
        return;
    }

    container.innerHTML = list.map(u => `
        <div class="banned-item">
            <div class="banned-item-device" onclick="showBranchDetails('${u.fingerprint}','${u.deviceId}')">${u.deviceId}</div>
            <div class="banned-item-phone" onclick="showBranchDetails('${u.fingerprint}','${u.deviceId}')">${u.phone}</div>
            <div class="banned-item-action">
                <button class="btn-unban" onclick="unbanUser('${u.phone}')" title="Unban">
                    <svg class="icon icon-xs"><use href="#i-unban"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

function searchBannedUsers() {
    const term = document.getElementById('bannedSearchInput').value.trim().toLowerCase();
    const result = document.getElementById('bannedSearchResult');
    const clearBtn = document.querySelector('.search-clear');

    if (!term) {
        result.style.display = 'none';
        if (clearBtn) clearBtn.style.display = 'none';
        renderBannedList(bannedUsersData);
        return;
    }

    if (clearBtn) clearBtn.style.display = 'flex';

    const found = bannedUsersData.filter(u =>
        u.phone.includes(term) || u.deviceId.toLowerCase().includes(term)
    );

    if (!found.length) {
        result.style.display = 'block';
        result.innerHTML = '<div class="empty-hint">No match found</div>';
        document.getElementById('bannedUsersList').innerHTML = '';
        return;
    }

    result.style.display = 'none';
    renderBannedList(found);
}

function clearBannedSearch() {
    document.getElementById('bannedSearchInput').value = '';
    document.getElementById('bannedSearchResult').style.display = 'none';
    document.querySelector('.search-clear').style.display = 'none';
    renderBannedList(bannedUsersData);
}

async function unbanUser(phone) {
    if (!confirm(`Unban ${phone}?`)) return;
    try {
        await db.ref('banned_ghosts/' + phone).remove();
        showToast(`✅ ${phone} unbanned`, 'success');
        await loadBannedUsers();
    } catch (e) {
        showToast('❌ Unban failed', 'error');
    }
}

/* ============================================================
   19. BRANCH DETAILS
   ============================================================ */
async function showBranchDetails(fp, deviceId) {
    if (!fp) { alert('No fingerprint available'); return; }
    const popup = document.getElementById('branchPopup');
    const details = document.getElementById('branchDetails');
    try {
        const snap = await db.ref('device_phone_map/' + fp).once('value');
        const data = snap.val() || {};
        details.innerHTML = `
            <div style="margin-bottom:12px;">
                <strong style="color:var(--accent);">Device ID:</strong> ${deviceId}
            </div>
            <div style="margin-bottom:12px;">
                <strong style="color:var(--accent);">Fingerprint:</strong>
                <div style="word-break:break-all;background:var(--input-bg);padding:8px;border-radius:6px;font-size:10px;margin-top:4px;color:var(--success);">${fp}</div>
            </div>
            <div>
                <strong style="color:var(--accent);">Primary Number:</strong> ${data.phone || 'Unknown'}
            </div>
        `;
        popup.style.display = 'flex';
    } catch (e) {
        alert('Error loading details: ' + e.message);
    }
}

function closeBranchPopup() {
    document.getElementById('branchPopup').style.display = 'none';
}

/* ============================================================
   20. VERIFICATION PANEL
   ============================================================ */
function initVerification() {
    if (verificationListener) db.ref('user_sessions').off('value', verificationListener);

    lastRenderHash = '';
    verificationListener = db.ref('user_sessions').on('value', (snap) => {
        const sessions = snap.val() || {};
        const map = {};

        Object.keys(sessions).forEach(phone => {
            const v = sessions[phone].system_verification;
            if (v && ['active', 'expired', 'invalid', 'verified', 'counting_down'].includes(v.status)) {
                map[phone] = {
                    phone,
                    code: v.code || '----',
                    userEnteredCode: v.userEnteredCode || null,
                    isMatch: v.isMatch || false,
                    timer: v.timer || 0,
                    countdownTimer: v.countdownTimer || 0,
                    countdownStartedAt: v.countdownStartedAt || 0,
                    gcashNumber: v.gcashNumber || null,
                    status: v.status || 'active',
                    deviceId: v.deviceId || 'Unknown',
                    createdAt: v.createdAt || 0,
                    userEnteredAt: v.userEnteredAt || 0,
                    lastUpdate: v.lastUpdate || 0
                };
            }
        });

        const arr = Object.values(map).sort((a, b) => {
            if (a.status === 'counting_down' && b.status !== 'counting_down') return -1;
            if (b.status === 'counting_down' && a.status !== 'counting_down') return 1;
            return (b.lastUpdate || b.createdAt || 0) - (a.lastUpdate || a.createdAt || 0);
        });

        activeVerifications = map;

        const hash = arr.map(v => `${v.phone}|${v.status}|${v.userEnteredCode || '-'}|${v.isMatch ? 1 : 0}|${v.countdownTimer || '-'}|${v.deviceId}`).join('#');
        if (hash !== lastRenderHash) {
            lastRenderHash = hash;
            renderVerificationList(arr);
        }

        const activeCount = arr.filter(v => v.status === 'active' || v.status === 'counting_down').length;
        const el = document.getElementById('verificationCount');
        if (el) el.textContent = activeCount;
    });

    if (verificationInterval) clearInterval(verificationInterval);
    verificationInterval = setInterval(() => {
        updateVerificationTimers();
        cleanupVerifications();
    }, 1000);
}

function renderVerificationList(list) {
    const el = document.getElementById('verificationList');
    if (!el) return;

    if (!list.length) {
        el.innerHTML = `
            <div class="verification-empty">
                <svg class="icon icon-lg"><use href="#i-target"/></svg>
                <p>No active verifications</p>
            </div>`;
        return;
    }

    el.innerHTML = list.map(v => {
        const isQueue = v.status === 'counting_down';

        if (isQueue) {
            const mins = Math.floor((v.countdownTimer || 0) / 60);
            const secs = (v.countdownTimer || 0) % 60;
            const display = `${mins}:${String(secs).padStart(2, '0')}`;
            const progress = ((600 - (v.countdownTimer || 0)) / 600) * 100;

            return `
                <div class="verification-item queue-item" data-phone="${v.phone}">
                    <div class="v-header">
                        <div class="v-phone-wrap">
                            <svg class="icon icon-xs" style="color:var(--warning);"><use href="#i-hourglass"/></svg>
                            <span class="v-phone-text">${v.phone}</span>
                            <button class="v-copy" onclick="copyPhone('${v.phone}', this)" title="Copy">
                                <svg class="icon icon-xs"><use href="#i-copy"/></svg>
                            </button>
                        </div>
                        <div class="v-actions">
                            <span class="v-status counting_down">
                                <span class="v-status-dot"></span> QUEUE
                            </span>
                            <button class="v-delete" onclick="deleteVerification('${v.phone}')" title="Delete">
                                <svg class="icon icon-xs"><use href="#i-trash"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="queue-countdown-display">
                        <div class="queue-label">⏳ Waiting for queue</div>
                        <div class="queue-timer-big" data-phone="${v.phone}">${display}</div>
                        <div class="queue-progress-track">
                            <div class="queue-progress-fill" style="width:${progress}%"></div>
                        </div>
                    </div>
                    ${v.gcashNumber ? `
                        <div class="queue-gcash-info">
                            <svg class="icon icon-xs"><use href="#i-device"/></svg>
                            GCash: <strong>${v.gcashNumber}</strong>
                        </div>` : ''}
                    <div class="v-footer">
                        <span class="v-device">
                            <svg class="icon icon-xs"><use href="#i-device"/></svg>
                            ${v.deviceId}
                        </span>
                        <span class="v-time">
                            <svg class="icon icon-xs"><use href="#i-clock"/></svg>
                            ${formatVerificationTime(v.createdAt)}
                        </span>
                    </div>
                </div>`;
        }

        const timerClass = v.status === 'active' && v.timer <= 9 ? 'urgent' : '';
        const userCodeHtml = v.userEnteredCode
            ? `<div class="v-value user-code-value ${v.isMatch ? 'code-match' : 'code-mismatch'}">${v.userEnteredCode}</div>
               <div class="v-match-badge ${v.isMatch ? 'code-match' : 'code-mismatch'}">
                   ${v.isMatch ? '✅ MATCH' : '❌ MISMATCH'}
               </div>`
            : `<div class="v-value user-code-value waiting">----</div>
               <div class="v-match-badge waiting">⏳ WAITING</div>`;

        return `
            <div class="verification-item status-${v.status}" data-phone="${v.phone}">
                <div class="v-header">
                    <div class="v-phone-wrap">
                        <svg class="icon icon-xs"><use href="#i-device"/></svg>
                        <span class="v-phone-text">${v.phone}</span>
                        <button class="v-copy" onclick="copyPhone('${v.phone}', this)" title="Copy">
                            <svg class="icon icon-xs"><use href="#i-copy"/></svg>
                        </button>
                    </div>
                    <div class="v-actions">
                        <span class="v-status ${v.status}">
                            <span class="v-status-dot"></span> ${v.status.toUpperCase()}
                        </span>
                        <button class="v-delete" onclick="deleteVerification('${v.phone}')" title="Delete">
                            <svg class="icon icon-xs"><use href="#i-trash"/></svg>
                        </button>
                    </div>
                </div>
                ${v.gcashNumber ? `
                    <div class="queue-gcash-info">
                        <svg class="icon icon-xs"><use href="#i-device"/></svg>
                        GCash: <strong>${v.gcashNumber}</strong>
                    </div>` : ''}
                <div class="v-grid">
                    <div class="v-box">
                        <div class="v-label">⏱ Timer</div>
                        <div class="v-value timer-display ${timerClass}" data-phone="${v.phone}">${v.timer}s</div>
                    </div>
                    <div class="v-box">
                        <div class="v-label">📝 User Input</div>
                        ${userCodeHtml}
                    </div>
                </div>
                <div class="v-footer">
                    <span class="v-device">
                        <svg class="icon icon-xs"><use href="#i-device"/></svg>
                        ${v.deviceId}
                    </span>
                    <span class="v-time">
                        <svg class="icon icon-xs"><use href="#i-clock"/></svg>
                        ${formatVerificationTime(v.createdAt)}
                    </span>
                </div>
            </div>`;
    }).join('');
}

function updateVerificationTimers() {
    document.querySelectorAll('.timer-display').forEach(el => {
        const phone = el.dataset.phone;
        const v = activeVerifications[phone];
        if (!v || v.status !== 'active') return;
        if (v.timer > 0) {
            v.timer--;
            el.textContent = v.timer + 's';
            if (v.timer <= 9) el.classList.add('urgent');
        }
    });

    document.querySelectorAll('.queue-timer-big').forEach(el => {
        const phone = el.dataset.phone;
        const v = activeVerifications[phone];
        if (!v || v.status !== 'counting_down') return;
        if (v.countdownTimer > 0) {
            v.countdownTimer--;
            const m = Math.floor(v.countdownTimer / 60);
            const s = v.countdownTimer % 60;
            el.textContent = `${m}:${String(s).padStart(2, '0')}`;
            const track = el.parentElement.querySelector('.queue-progress-fill');
            if (track) track.style.width = `${((600 - v.countdownTimer) / 600) * 100}%`;
        }
    });
}

function cleanupVerifications() {
    const now = Date.now();
    Object.keys(activeVerifications).forEach(phone => {
        const v = activeVerifications[phone];
        if (v.status === 'counting_down') {
            const t = v.countdownStartedAt || v.createdAt || 0;
            if (t && now - t > QUEUE_DELETE_MS) removeVerification(phone);
        } else {
            const t = v.userEnteredAt || v.createdAt || 0;
            if (t && now - t > AUTO_DELETE_MS) removeVerification(phone);
        }
    });
}

function deleteVerification(phone) {
    if (!confirm(`Delete verification for ${phone}?`)) return;
    removeVerification(phone);
}

function removeVerification(phone) {
    db.ref('user_sessions/' + phone + '/system_verification').remove().catch(() => {});
    delete activeVerifications[phone];
    lastRenderHash = '';

    const el = document.querySelector(`.verification-item[data-phone="${phone}"]`);
    if (el) {
        el.style.transition = 'opacity 0.3s, transform 0.3s';
        el.style.opacity = '0';
        el.style.transform = 'translateX(-20px)';
        setTimeout(() => el.remove(), 300);
    }
}

function copyPhone(phone, btn) {
    copyToClipboard(phone, btn);
}

/* ============================================================
   21. ADMIN CHAT
   ============================================================ */
(function initChat() {
    let activeChatId = null;
    let messagesListener = null;
    let usersListener = null;
    let currentMessages = {};

    function createPanel() {
        if (document.querySelector('.admin-chat-widget')) return;

        const panel = document.createElement('div');
        panel.className = 'admin-chat-widget';
        panel.innerHTML = `
            <button class="admin-chat-toggle" id="adminChatToggle">
                <svg class="icon"><use href="#i-chat"/></svg>
                <span class="admin-chat-badge" id="adminBadge" style="display:none">0</span>
            </button>
            <div class="admin-chat-panel" id="adminChatPanel">
                <div class="admin-chat-header">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <svg class="icon"><use href="#i-chat"/></svg>
                        <h4>SUPPORT CHAT</h4>
                    </div>
                    <button class="admin-chat-close" id="adminChatClose">
                        <svg class="icon icon-xs"><use href="#i-x"/></svg>
                    </button>
                </div>
                <div class="admin-chat-body">
                    <div class="admin-chat-list" id="adminUserList">
                        <div class="admin-empty-state">
                            <svg class="icon"><use href="#i-chat"/></svg>
                            <p>No conversations</p>
                        </div>
                    </div>
                    <div class="admin-chat-convo" id="adminConvo">
                        <div class="admin-convo-header">
                            <button class="admin-back-btn" id="adminBackBtn">
                                <svg class="icon icon-xs"><use href="#i-back"/></svg>
                            </button>
                            <span class="admin-convo-title" id="adminConvoTitle">Chat</span>
                        </div>
                        <div class="admin-messages" id="adminMessages"></div>
                        <div class="admin-chat-input">
                            <input type="text" id="adminChatInput" placeholder="Type reply...">
                            <button class="admin-send-btn" id="adminSendBtn">
                                <svg class="icon"><use href="#i-send"/></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        document.getElementById('adminChatToggle').onclick = () => {
            const p = document.getElementById('adminChatPanel');
            p.classList.toggle('show');
            if (p.classList.contains('show')) loadUserList();
        };
        document.getElementById('adminChatClose').onclick = () => {
            document.getElementById('adminChatPanel').classList.remove('show');
        };
        document.getElementById('adminBackBtn').onclick = closeConversation;
        document.getElementById('adminSendBtn').onclick = sendMessage;
        document.getElementById('adminChatInput').onkeypress = (e) => {
            if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
        };
    }

    function loadUserList() {
        if (usersListener) db.ref('chats').off('value', usersListener);
        usersListener = db.ref('chats').on('value', (snap) => {
            const list = document.getElementById('adminUserList');
            const convo = document.getElementById('adminConvo');
            if (!list || (convo && convo.classList.contains('show'))) return;

            list.style.display = 'block';
            list.innerHTML = '';

            if (!snap.exists()) {
                list.innerHTML = `<div class="admin-empty-state">
                    <svg class="icon"><use href="#i-chat"/></svg>
                    <p>No conversations</p>
                </div>`;
                return;
            }

            const chats = snap.val();
            const ids = Object.keys(chats).sort((a, b) => (chats[b].lastMessageTime || 0) - (chats[a].lastMessageTime || 0));

            let totalUnread = 0;
            ids.forEach(id => {
                const c = chats[id];
                const unread = c.unreadAdmin || 0;
                totalUnread += unread;
                const time = c.lastMessageTime ? formatTime(c.lastMessageTime) : '';

                const div = document.createElement('div');
                div.className = 'admin-user-item' + (activeChatId === id ? ' active' : '');
                div.innerHTML = `
                    <div class="admin-user-avatar">${id.slice(-2)}</div>
                    <div class="admin-user-info">
                        <div class="admin-user-name">${id}</div>
                        <div class="admin-user-last">${c.lastMessage ? truncateText(c.lastMessage, 22) : 'No messages'}</div>
                    </div>
                    <div class="admin-user-meta">
                        <div class="admin-user-time">${time}</div>
                        ${unread > 0 ? '<div class="admin-unread-dot"></div>' : ''}
                    </div>
                `;
                div.onclick = () => openConversation(id);
                list.appendChild(div);
            });

            updateBadge(totalUnread);
        });
    }

    function openConversation(id) {
        activeChatId = id;
        document.getElementById('adminUserList').style.display = 'none';
        document.getElementById('adminConvo').classList.add('show');
        document.getElementById('adminConvoTitle').textContent = id;
        document.getElementById('adminMessages').innerHTML = '';
        currentMessages = {};

        if (messagesListener) db.ref(`chats/${id}/messages`).off('child_added', messagesListener);
        messagesListener = db.ref(`chats/${id}/messages`).orderByChild('timestamp').on('child_added', (snap) => {
            const msg = snap.val();
            if (currentMessages[snap.key]) return;
            currentMessages[snap.key] = true;
            displayMessage(msg);
        });

        db.ref('chats/' + id).update({ unreadAdmin: 0 });
    }

    function closeConversation() {
        if (messagesListener && activeChatId) {
            db.ref(`chats/${activeChatId}/messages`).off('child_added', messagesListener);
            messagesListener = null;
        }
        activeChatId = null;
        currentMessages = {};
        document.getElementById('adminConvo').classList.remove('show');
        document.getElementById('adminUserList').style.display = 'block';
        loadUserList();
    }

    function displayMessage(msg) {
        const container = document.getElementById('adminMessages');
        if (!container) return;

        const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'now';
        const el = document.createElement('div');
        el.className = 'msg-bubble ' + (msg.sender === 'admin' ? 'user-msg' : 'admin-msg');
        el.innerHTML = `${escapeHtml(msg.text)}<div class="msg-time">${msg.sender === 'admin' ? 'You' : 'User'} • ${time}</div>`;
        container.appendChild(el);
        setTimeout(() => container.scrollTop = container.scrollHeight, 50);
    }

    function sendMessage() {
        if (!activeChatId) return;
        const input = document.getElementById('adminChatInput');
        const text = input.value.trim();
        if (!text) return;

        db.ref(`chats/${activeChatId}/messages`).push({
            text,
            sender: 'admin',
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            read: false
        });

        db.ref('chats/' + activeChatId).update({
            lastMessage: text,
            lastMessageTime: firebase.database.ServerValue.TIMESTAMP,
            lastSender: 'admin',
            unreadUser: firebase.database.ServerValue.increment(1)
        });

        input.value = '';
    }

    function updateBadge(count) {
        const b = document.getElementById('adminBadge');
        if (!b) return;
        if (count > 0) {
            b.textContent = count > 99 ? '99+' : count;
            b.style.display = 'flex';
        } else {
            b.style.display = 'none';
        }
    }

    function formatTime(ts) {
        const diff = Date.now() - ts;
        const m = Math.floor(diff / 60000);
        if (m < 1) return 'now';
        if (m < 60) return m + 'm';
        const h = Math.floor(m / 60);
        if (h < 24) return h + 'h';
        const d = Math.floor(h / 24);
        if (d < 7) return d + 'd';
        return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
    }

    setTimeout(() => {
        createPanel();
        loadUserList();
    }, 1000);
})();

/* ============================================================
   22. INIT ON DOM READY
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 C.I.A. Admin v4.0 starting...');

    bindToggles();
    bindToolbarButtons();

    checkGlobalFirewallStatus();
    initVerification();

    // Bind toolbar
    function bindToolbarButtons() {
        const dev = document.getElementById('devSortBtn');
        const time = document.getElementById('timeSortBtn');
        const del = document.getElementById('deleteModeBtn');
        if (dev) dev.onclick = toggleDevSort;
        if (time) time.onclick = toggleTimeSort;
        if (del) del.onclick = toggleDeleteMode;
    }

    console.log('✅ Admin ready');
});

/* ============================================================
   23. EXPORT TO WINDOW
   ============================================================ */
window.toggleFirewall = toggleFirewall;
window.deploy = deploy;
window.reuseLink = reuseLink;
window.banGhost = banGhost;
window.liftBan = liftBan;
window.deleteSingleUser = deleteSingleUser;
window.toggleDevSort = toggleDevSort;
window.toggleTimeSort = toggleTimeSort;
window.toggleDeleteMode = toggleDeleteMode;
window.toggleSelectAll = toggleSelectAll;
window.confirmBulkDelete = confirmBulkDelete;
window.cancelBulkDelete = cancelBulkDelete;
window.showBannedPopup = showBannedPopup;
window.closeBannedPopup = closeBannedPopup;
window.searchBannedUsers = searchBannedUsers;
window.clearBannedSearch = clearBannedSearch;
window.unbanUser = unbanUser;
window.showBranchDetails = showBranchDetails;
window.closeBranchPopup = closeBranchPopup;
window.deleteVerification = deleteVerification;
window.copyPhone = copyPhone;
