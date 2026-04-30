// ========== PROMOTION.JS - REMASTERED VERSION ==========
// Local-First Architecture with Firebase Sync

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCjTn-hyUdZGiDHsy5_ijYu6KQCYMElsTI",
    authDomain: "casinorewards-95502.firebaseapp.com",
    databaseURL: "https://casinorewards-95502-default-rtdb.firebaseio.com",
    projectId: "casinorewards-95502",
    storageBucket: "casinorewards-95502.firebasestorage.app",
    messagingSenderId: "768311187647",
    appId: "1:768311187647:web:e26e8a5134a003ef634e0a",
    measurementId: "G-F95KC3R7QH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ========== LOCAL DATABASE MANAGER ==========
class LocalDatabaseManager {
    constructor() {
        this.userPhone = null;
        this.userDeviceId = null;
        this.userDeviceDisplayId = null;
        this.syncInProgress = false;
        this.retryQueue = [];
        this.maxRetries = 3;
        this.retryDelay = 1000;
    }

    // Load local user data
    loadLocalUserData() {
        this.userPhone = localStorage.getItem("userPhone");
        this.userDeviceId = localStorage.getItem("userDeviceId");
        this.userDeviceDisplayId = localStorage.getItem("userDeviceDisplayId");
        
        if (!this.userPhone) {
            console.warn("No user phone found in localStorage");
            return false;
        }
        
        console.log("Local user data loaded:", {
            phone: this.userPhone,
            deviceId: this.userDeviceId,
            deviceDisplayId: this.userDeviceDisplayId
        });
        
        return true;
    }

    // Get local user data
    getLocalUserData() {
        return {
            phone: this.userPhone,
            deviceId: this.userDeviceId,
            deviceDisplayId: this.userDeviceDisplayId
        };
    }

    // Save to local storage
    saveToLocalStorage(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (error) {
            console.error("Error saving to localStorage:", error);
            return false;
        }
    }

    // Get from local storage with fallback
    getFromLocalStorage(key, defaultValue = null) {
        try {
            return localStorage.getItem(key) || defaultValue;
        } catch (error) {
            console.error("Error reading from localStorage:", error);
            return defaultValue;
        }
    }
}

// ========== FIREBASE SYNC MANAGER ==========
class FirebaseSyncManager {
    constructor(localDB) {
        this.localDB = localDB;
        this.listeners = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.isConnected = false;
        this.pendingWrites = [];
        
        // Monitor connection status
        this.monitorConnection();
    }

    monitorConnection() {
        const connectedRef = database.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            this.isConnected = snap.val();
            if (this.isConnected) {
                console.log("Firebase connected - Syncing data...");
                this.reconnectAttempts = 0;
                this.syncPendingWrites();
                this.syncAllData();
            } else {
                console.warn("Firebase disconnected - Using local data only");
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    setTimeout(() => this.monitorConnection(), 5000);
                }
            }
        });
    }

    async syncPendingWrites() {
        while (this.pendingWrites.length > 0 && this.isConnected) {
            const write = this.pendingWrites.shift();
            try {
                await write.execute();
                console.log("Pending write executed:", write.key);
            } catch (error) {
                console.error("Failed to execute pending write:", error);
                // Re-queue with backoff
                setTimeout(() => {
                    this.pendingWrites.push(write);
                }, this.localDB.retryDelay);
                break;
            }
        }
    }

    async syncAllData() {
        if (!this.isConnected || !this.localDB.userPhone) return;
        
        try {
            const userRef = database.ref(`user_sessions/${this.localDB.userPhone}`);
            const snapshot = await userRef.once('value');
            const firebaseData = snapshot.val();
            
            if (firebaseData) {
                // Check if local data is newer
                const localData = this.getLocalUserDataCopy();
                if (this.shouldSyncFromFirebase(localData, firebaseData)) {
                    this.updateLocalFromFirebase(firebaseData);
                }
            }
        } catch (error) {
            console.error("Error syncing data from Firebase:", error);
        }
    }

    shouldSyncFromFirebase(localData, firebaseData) {
        // Compare timestamps if available
        const localTimestamp = localData.lastSync || 0;
        const firebaseTimestamp = firebaseData.updatedAt || 0;
        return firebaseTimestamp > localTimestamp;
    }

    updateLocalFromFirebase(firebaseData) {
        Object.keys(firebaseData).forEach(key => {
            if (key !== 'lastSync' && key !== 'updatedAt') {
                localStorage.setItem(`${this.localDB.userPhone}_${key}`, JSON.stringify(firebaseData[key]));
            }
        });
        localStorage.setItem(`${this.localDB.userPhone}_lastSync`, Date.now().toString());
        console.log("Local data updated from Firebase");
    }

    getLocalUserDataCopy() {
        const data = {};
        // Retrieve all relevant local data
        const keys = ['balance', 'claimed_luckycat', 'status', 'lastSync'];
        keys.forEach(key => {
            const value = localStorage.getItem(`${this.localDB.userPhone}_${key}`);
            if (value) data[key] = JSON.parse(value);
        });
        return data;
    }

    // Write to Firebase with retry and queue
    async writeToFirebase(path, data, priority = false) {
        const writeOperation = async () => {
            const ref = database.ref(`user_sessions/${this.localDB.userPhone}/${path}`);
            const writeData = {
                ...data,
                updatedAt: Date.now(),
                deviceId: this.localDB.userDeviceId
            };
            await ref.update(writeData);
            
            // Update local cache
            localStorage.setItem(`${this.localDB.userPhone}_${path}`, JSON.stringify(data));
            console.log("Successfully written to Firebase:", path);
        };

        if (this.isConnected) {
            try {
                await writeOperation();
            } catch (error) {
                console.error("Firebase write failed, queuing:", error);
                this.pendingWrites.push({ execute: writeOperation, key: path });
                
                // Also save locally
                localStorage.setItem(`${this.localDB.userPhone}_${path}`, JSON.stringify(data));
                localStorage.setItem(`${this.localDB.userPhone}_pendingSync`, 'true');
            }
        } else {
            console.log("Offline mode - Queuing write for later:", path);
            this.pendingWrites.push({ execute: writeOperation, key: path });
            localStorage.setItem(`${this.localDB.userPhone}_${path}`, JSON.stringify(data));
            localStorage.setItem(`${this.localDB.userPhone}_pendingSync`, 'true');
        }
    }

    // Listen to real-time updates
    listenToFirebase(path, callback) {
        if (!this.localDB.userPhone) return null;
        
        const ref = database.ref(`user_sessions/${this.localDB.userPhone}/${path}`);
        const listener = ref.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Update local cache
                localStorage.setItem(`${this.localDB.userPhone}_${path}`, JSON.stringify(data));
                callback(data);
            }
        }, (error) => {
            console.error(`Error listening to ${path}:`, error);
        });
        
        this.listeners[path] = listener;
        return listener;
    }

    // Remove listeners
    removeListeners() {
        Object.keys(this.listeners).forEach(path => {
            const ref = database.ref(`user_sessions/${this.localDB.userPhone}/${path}`);
            ref.off('value', this.listeners[path]);
        });
        this.listeners = {};
    }
}

// ========== USER DATA MANAGER ==========
class UserDataManager {
    constructor(localDB, firebaseSync) {
        this.localDB = localDB;
        this.firebaseSync = firebaseSync;
        this.userData = {};
        this.dataCallbacks = [];
    }

    async initialize() {
        if (!this.localDB.loadLocalUserData()) {
            return false;
        }
        
        await this.loadUserData();
        this.setupListeners();
        return true;
    }

    async loadUserData() {
        // Load from local storage first
        this.userData = {
            balance: Number(this.getLocalData('balance', 0)),
            claimed_luckycat: this.getLocalData('claimed_luckycat', false),
            status: this.getLocalData('status', 'active'),
            mobile: this.localDB.userPhone,
            lastSync: Number(this.getLocalData('lastSync', 0))
        };
        
        // Try to sync with Firebase
        if (this.firebaseSync.isConnected) {
            await this.firebaseSync.syncAllData();
            this.userData.balance = Number(this.getLocalData('balance', 0));
            this.userData.claimed_luckycat = this.getLocalData('claimed_luckycat', false);
        }
        
        this.notifyDataChange();
        return this.userData;
    }

    getLocalData(key, defaultValue) {
        const value = localStorage.getItem(`${this.localDB.userPhone}_${key}`);
        return value ? JSON.parse(value) : defaultValue;
    }

    setLocalData(key, value) {
        localStorage.setItem(`${this.localDB.userPhone}_${key}`, JSON.stringify(value));
        this.userData[key] = value;
        this.notifyDataChange();
    }

    setupListeners() {
        // Listen to balance changes from Firebase
        this.firebaseSync.listenToFirebase('balance', (balance) => {
            this.userData.balance = Number(balance);
            this.setLocalData('balance', balance);
            this.notifyDataChange();
        });
        
        // Listen to claimed_luckycat changes
        this.firebaseSync.listenToFirebase('claimed_luckycat', (claimed) => {
            this.userData.claimed_luckycat = claimed;
            this.setLocalData('claimed_luckycat', claimed);
            this.notifyDataChange();
        });
    }

    async updateBalance(newBalance) {
        this.userData.balance = Number(newBalance);
        this.setLocalData('balance', newBalance);
        
        // Sync to Firebase
        await this.firebaseSync.writeToFirebase('balance', { value: newBalance });
        
        return true;
    }

    async addToBalance(amount) {
        const newBalance = this.userData.balance + amount;
        return await this.updateBalance(newBalance);
    }

    async claimLuckyCat() {
        if (this.userData.claimed_luckycat) {
            return false;
        }
        
        this.userData.claimed_luckycat = true;
        this.setLocalData('claimed_luckycat', true);
        
        // Sync to Firebase
        await this.firebaseSync.writeToFirebase('claimed_luckycat', { value: true });
        
        // Add bonus balance
        await this.addToBalance(100); // Example bonus amount
        
        return true;
    }

    getBalance() {
        return this.userData.balance;
    }

    isLuckyCatClaimed() {
        return this.userData.claimed_luckycat;
    }

    onDataChange(callback) {
        this.dataCallbacks.push(callback);
    }

    notifyDataChange() {
        this.dataCallbacks.forEach(callback => callback(this.userData));
    }
}

// ========== INVITATION MANAGER ==========
class InvitationManager {
    constructor(localDB, userManager) {
        this.localDB = localDB;
        this.userManager = userManager;
        this.maxInvites = 6;
    }

    getInvitations() {
        const key = `${this.localDB.userPhone}_invitations`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
    }

    saveInvitations(invitations) {
        const key = `${this.localDB.userPhone}_invitations`;
        localStorage.setItem(key, JSON.stringify(invitations));
    }

    getInvitesCount() {
        return this.getInvitations().filter(inv => inv.status === 'pending').length;
    }

    addInvitation(friendPhone) {
        const invitations = this.getInvitations();
        
        // Check if already invited
        if (invitations.some(inv => inv.phone === friendPhone)) {
            return false;
        }
        
        // Check max invites
        if (this.getInvitesCount() >= this.maxInvites) {
            return false;
        }
        
        invitations.push({
            phone: friendPhone,
            status: 'pending',
            timestamp: Date.now(),
            deviceId: this.localDB.userDeviceId
        });
        
        this.saveInvitations(invitations);
        return true;
    }

    deleteInvitation(friendPhone) {
        const invitations = this.getInvitations();
        const invite = invitations.find(inv => inv.phone === friendPhone);
        
        if (invite && invite.status === 'approved') {
            return false;
        }
        
        const newInvites = invitations.filter(inv => inv.phone !== friendPhone);
        this.saveInvitations(newInvites);
        return true;
    }

    renderInvitations(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const invitations = this.getInvitations();
        
        if (invitations.length === 0) {
            container.innerHTML = '<div class="invite-empty">No invitations sent</div>';
            return;
        }
        
        let html = '';
        invitations.forEach(inv => {
            const formattedPhone = inv.phone.substring(0, 4) + '***' + inv.phone.substring(7, 11);
            const statusClass = inv.status === 'approved' ? 'approved' : 'pending';
            const statusText = inv.status === 'approved' ? 'APPROVED' : 'PENDING';
            const disabled = inv.status === 'approved' ? 'disabled' : '';
            
            html += `
                <div class="invite-item">
                    <div class="invite-item-phone">${formattedPhone}</div>
                    <div class="invite-item-status">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="invite-item-action">
                        <button class="delete-invite" onclick="window.invitationManager.deleteInviteUI('${inv.phone}')" ${disabled}>✕</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    deleteInviteUI(friendPhone) {
        if (this.deleteInvitation(friendPhone)) {
            this.renderInvitations('inviteListBody');
            this.updateInviteCount();
        } else {
            alert("Cannot delete approved invitation");
        }
    }

    updateInviteCount() {
        const countSpan = document.getElementById('invitesCount');
        if (countSpan) {
            const pendingCount = this.getInvitesCount();
            countSpan.innerText = `${pendingCount}/${this.maxInvites}`;
        }
    }
}

// ========== UI MANAGER ==========
class UIManager {
    constructor(userManager, invitationManager) {
        this.userManager = userManager;
        this.invitationManager = invitationManager;
    }

    initialize() {
        this.updateAllDisplays();
        this.userManager.onDataChange(() => this.updateAllDisplays());
    }

    updateAllDisplays() {
        // Update phone display
        const phoneEl = document.getElementById('userPhoneDisplay');
        if (phoneEl) {
            const userData = this.userManager.userData;
            const phoneNumber = userData.mobile || localStorage.getItem("userPhone");
            if (phoneNumber && phoneNumber.length >= 11) {
                phoneEl.innerText = phoneNumber.substring(0, 4) + "****" + phoneNumber.substring(8, 11);
            }
        }
        
        // Update balance displays
        const balance = this.userManager.getBalance();
        const balanceDisplay = document.getElementById('userBalanceDisplay');
        if (balanceDisplay) {
            balanceDisplay.innerText = balance.toFixed(2);
        }
        
        const popupBalance = document.getElementById('popupBalanceAmount');
        if (popupBalance) {
            popupBalance.innerText = "₱" + balance.toFixed(2);
        }
        
        // Update Lucky Cat status
        const luckyCatStatus = document.getElementById('luckyCatStatus');
        if (luckyCatStatus) {
            const isClaimed = this.userManager.isLuckyCatClaimed();
            if (isClaimed) {
                luckyCatStatus.innerText = "Claimed";
                luckyCatStatus.classList.add('claimed');
            } else {
                luckyCatStatus.innerText = "Available";
                luckyCatStatus.classList.remove('claimed');
            }
        }
        
        // Update invite count
        this.invitationManager.updateInviteCount();
    }
}

// ========== PROMOTION MANAGER ==========
class PromotionManager {
    constructor(userManager) {
        this.userManager = userManager;
    }

    async claimReward(rewardType, rewardAmount) {
        // Check if already claimed
        const claimedKey = `${rewardType}_claimed`;
        if (this.userManager.getLocalData(claimedKey, false)) {
            return { success: false, message: "Reward already claimed" };
        }
        
        // Add balance
        await this.userManager.addToBalance(rewardAmount);
        
        // Mark as claimed
        this.userManager.setLocalData(claimedKey, true);
        
        // Sync to Firebase
        const firebaseSync = window.firebaseSyncManager;
        if (firebaseSync) {
            await firebaseSync.writeToFirebase(claimedKey, { value: true, amount: rewardAmount });
        }
        
        return { success: true, message: `₱${rewardAmount} added to your balance!` };
    }
}

// ========== CONFETTI MANAGER ==========
class ConfettiManager {
    constructor() {
        this.animation = null;
        this.timeout = null;
    }

    start() {
        const canvas = document.getElementById('confettiCanvas');
        if (!canvas) return;
        
        this.stop();
        canvas.style.display = 'block';
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const ctx = canvas.getContext('2d');
        const particles = [];
        const particleCount = Math.min(150, Math.floor(window.innerWidth / 10));
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 6 + 2,
                color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                speed: Math.random() * 3 + 2
            });
        }
        
        const draw = () => {
            if (!canvas || canvas.style.display === 'none') return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
                p.y += p.speed;
                if (p.y > canvas.height) {
                    p.y = -p.size;
                    p.x = Math.random() * canvas.width;
                }
            });
            
            this.animation = requestAnimationFrame(draw);
        };
        
        draw();
        
        if (this.timeout) clearTimeout(this.timeout);
        this.timeout = setTimeout(() => this.stop(), 3000);
    }

    stop() {
        if (this.animation) {
            cancelAnimationFrame(this.animation);
            this.animation = null;
        }
        
        const canvas = document.getElementById('confettiCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.style.display = 'none';
        }
        
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
}

// ========== MAIN INITIALIZATION ==========
// Global instances
let localDatabaseManager;
let firebaseSyncManager;
let userDataManager;
let invitationManager;
let uiManager;
let promotionManager;
let confettiManager;

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in
    const userPhone = localStorage.getItem("userPhone");
    if (!userPhone) {
        window.location.href = "index.html";
        return;
    }
    
    // Initialize managers
    localDatabaseManager = new LocalDatabaseManager();
    firebaseSyncManager = new FirebaseSyncManager(localDatabaseManager);
    userDataManager = new UserDataManager(localDatabaseManager, firebaseSyncManager);
    invitationManager = new InvitationManager(localDatabaseManager, userDataManager);
    uiManager = new UIManager(userDataManager, invitationManager);
    promotionManager = new PromotionManager(userDataManager);
    confettiManager = new ConfettiManager();
    
    // Store globally for access from HTML
    window.firebaseSyncManager = firebaseSyncManager;
    window.userDataManager = userDataManager;
    window.invitationManager = invitationManager;
    window.promotionManager = promotionManager;
    window.confettiManager = confettiManager;
    
    // Initialize all systems
    await userDataManager.initialize();
    uiManager.initialize();
    invitationManager.renderInvitations('inviteListBody');
    
    // Setup event listeners
    setupEventListeners();
    
    // Start main timer
    startMainTimer();
    
    console.log("Promotion.js initialized successfully with local database connection");
});

// Event listeners setup
function setupEventListeners() {
    // Send invite button
    const sendBtn = document.getElementById('sendInviteBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            const friendPhone = document.getElementById('friendPhoneInput').value.trim();
            const userPhone = localStorage.getItem("userPhone");
            
            if (!friendPhone || friendPhone.length !== 11 || !friendPhone.startsWith('09')) {
                alert("Enter valid 11-digit number starting with 09");
                return;
            }
            
            if (friendPhone === userPhone) {
                alert("Cannot invite yourself");
                return;
            }
            
            if (window.invitationManager.addInvitation(friendPhone)) {
                document.getElementById('friendPhoneInput').value = '';
                window.invitationManager.renderInvitations('inviteListBody');
                window.uiManager.updateAllDisplays();
                alert("Invitation sent!");
            } else {
                alert("Cannot send invitation. Either already invited or reached maximum limit.");
            }
        });
    }
    
    // Enter key for invite input
    const friendInput = document.getElementById('friendPhoneInput');
    if (friendInput) {
        friendInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const btn = document.getElementById('sendInviteBtn');
                if (btn) btn.click();
            }
        });
    }
    
    // Lucky Cat claim button
    const claimLuckyCatBtn = document.getElementById('claimLuckyCatBtn');
    if (claimLuckyCatBtn) {
        claimLuckyCatBtn.addEventListener('click', async () => {
            const success = await userDataManager.claimLuckyCat();
            if (success) {
                confettiManager.start();
                alert("Congratulations! You received ₱100 bonus!");
                uiManager.updateAllDisplays();
            } else {
                alert("You have already claimed the Lucky Cat bonus!");
            }
        });
    }
    
    // Facebook share button
    const shareBtn = document.getElementById('facebookShareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const shareUrl = "https://xjiligames.github.io/rewards/index.html";
            const fbUrl = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl);
            window.open(fbUrl, '_blank', 'width=600,height=400');
        });
    }
}

// ========== MAIN TIMER ==========
const dropEndDate = new Date("May 15, 2026 00:00:00").getTime();
let timerInterval = null;

function startMainTimer() {
    if (timerInterval) clearInterval(timerInterval);
    
    const display = document.getElementById('mainTimerDisplay');
    if (!display) return;
    
    const updateTimer = () => {
        const now = Date.now();
        const diff = dropEndDate - now;
        
        if (diff > 0) {
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            
            display.innerText = `${String(d).padStart(2, '0')}D ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            display.style.color = "#fff";
        } else {
            display.innerText = "00D 00:00:00";
            display.style.color = "#ff0000";
            if (timerInterval) clearInterval(timerInterval);
        }
    };
    
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (firebaseSyncManager) {
        firebaseSyncManager.removeListeners();
    }
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    if (confettiManager) {
        confettiManager.stop();
    }
});

// Export for global access
window.startConfetti = () => confettiManager?.start();
window.stopConfetti = () => confettiManager?.stop();
window.updateUserBalance = (phone, newBalance) => userDataManager?.updateBalance(newBalance);
window.getCurrentBalance = () => userDataManager?.getBalance();
