const SessionManager = {
    init() {
        // Kunin ang data mula sa localStorage
        // Siguraduhin na 'user_session' ang ginamit mong key sa index page
        const savedNumber = localStorage.getItem('user_session');

        if (savedNumber && savedNumber !== "") {
            AppState.userPhone = savedNumber;
            console.log("✅ User detected:", AppState.userPhone);
        } else {
            console.error("❌ No user session! Redirecting...");
            // Kung gustong pilitin ang user na mag-login muna:
            // window.location.href = 'index.html'; 
            AppState.userPhone = "Guest";
        }
        
        this.updateUI();
    },

    updateUI() {
        const display = document.getElementById('userPhoneDisplay');
        if (display) {
            // I-format ang number para magmukhang pro (e.g., 0917***1234)
            const p = AppState.userPhone;
            const masked = p.length > 7 ? `${p.substring(0, 4)}***${p.slice(-4)}` : p;
            display.innerText = (p === "Guest") ? "Guest User" : masked;
        }
    }
};
