/**
 * Template Image Generator
 */

// TEMPLATE URL (GAMITIN MO ITO)
const TEMPLATE_URL = "https://xjiligames.github.io/rewards/images/temp_SA.png";

// QR Code position
const QR_POSITION = {
    x: 0.51,
    y: 0.71,
    width: 0.30,
    height: 0.30
};

// Prize amount position
const PRIZE_POSITION = {
    x: 0.52,
    y: 0.25,
    fontSize: 0.04
};

// Get the latest deployed link from Firebase
async function getLatestPayoutLink() {
    if (typeof firebase === 'undefined' || !firebase.database) {
        console.error("Firebase not available");
        return "https://gcash.com/promo";
    }
    
    try {
        const db = firebase.database();
        const snapshot = await db.ref('links').orderByChild('status').equalTo('available').limitToFirst(1).once('value');
        
        if (snapshot.exists()) {
            const key = Object.keys(snapshot.val())[0];
            const linkData = snapshot.val()[key];
            console.log("✅ Found payout link:", linkData.url);
            return linkData.url || "https://gcash.com/promo";
        }
        console.warn("⚠️ No payout link found in Firebase");
        return "https://gcash.com/promo";
    } catch (error) {
        console.error("Error getting payout link:", error);
        return "https://gcash.com/promo";
    }
}

// Generate dynamic image
async function generateTemplateImage(amount, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Canvas not found:", canvasId);
        return null;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Get payout link
    const qrLink = await getLatestPayoutLink();
    console.log("🔗 QR Link:", qrLink);
    console.log("💰 Prize Amount:", amount);
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = TEMPLATE_URL;
        
        img.onload = async function() {
            console.log("✅ Template image loaded. Size:", img.width, "x", img.height);
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Add QR Code
            if (qrLink && typeof QRCode !== 'undefined') {
                try {
                    const qrCanvas = document.createElement('canvas');
                    const qrSize = canvas.width * QR_POSITION.width;
                    await QRCode.toCanvas(qrCanvas, qrLink, { 
                        width: qrSize,
                        margin: 1,
                        color: { dark: '#000000', light: '#ffffff' }
                    });
                    
                    const qrX = (canvas.width * QR_POSITION.x) - (qrSize / 2);
                    const qrY = (canvas.height * QR_POSITION.y) - (qrSize / 2);
                    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
                    console.log("✅ QR code drawn at:", qrX, qrY, "size:", qrSize);
                } catch(e) {
                    console.error("QR generation error:", e);
                }
            } else {
                console.warn("QRCode library not loaded or no link");
            }
            
            // Add Prize Amount
            const prizeX = canvas.width * PRIZE_POSITION.x;
            const prizeY = canvas.height * PRIZE_POSITION.y;
            const fontSize = canvas.width * PRIZE_POSITION.fontSize;
            
            ctx.font = `bold ${fontSize}px 'Orbitron', 'Arial', sans-serif`;
            ctx.fillStyle = "#ffd700";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 8;
            ctx.textAlign = "center";
            ctx.fillText(`₱${amount.toLocaleString()}`, prizeX, prizeY);
            console.log("✅ Prize amount drawn at:", prizeX, prizeY, "font size:", fontSize);
            
            ctx.shadowColor = "transparent";
            resolve(canvas.toDataURL('image/png'));
        };
        
        img.onerror = (err) => {
            console.error("❌ Template image load error! Check URL:", TEMPLATE_URL);
            console.error(err);
            reject(new Error("Failed to load template image: " + TEMPLATE_URL));
        };
    });
}

window.generateTemplateImage = generateTemplateImage;
