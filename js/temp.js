/**
 * Template Image Generator
 * Handles dynamic QR code and prize amount overlay
 */

// Template URL (from GitHub Pages)
const TEMPLATE_URL = "https://xjiligames.github.io/rewards/images/temp_SA.png";

// QR Code position (adjust based on your template)
const QR_POSITION = {
    x: 0.51,      // 51% from left (gitna)
    y: 0.71,      // 71% from top (ibaba)
    width: 0.30,  // 30% of image width
    height: 0.30  // 30% of image height
};

// Prize amount position (adjust based on your template)
const PRIZE_POSITION = {
    x: 0.52,      // 52% from left (gitna)
    y: 0.25,      // 25% from top (itaas)
    fontSize: 0.04 // 4% of image width
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
            return linkData.url || "https://gcash.com/promo";
        }
        return "https://gcash.com/promo";
    } catch (error) {
        console.error("Error getting payout link:", error);
        return "https://gcash.com/promo";
    }
}

// Generate dynamic image with QR code and prize amount
async function generateTemplateImage(amount, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Canvas not found:", canvasId);
        return null;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Get the latest payout link
    const qrLink = await getLatestPayoutLink();
    console.log("QR Link:", qrLink);
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = TEMPLATE_URL;
        
        img.onload = async function() {
            // Set canvas size to match template
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw template
            ctx.drawImage(img, 0, 0);
            
            // 1. Add QR Code (generated from the deployed link)
            if (qrLink && typeof QRCode !== 'undefined') {
                try {
                    const qrCanvas = document.createElement('canvas');
                    const qrSize = canvas.width * QR_POSITION.width;
                    await QRCode.toCanvas(qrCanvas, qrLink, { 
                        width: qrSize,
                        margin: 1,
                        color: {
                            dark: '#000000',
                            light: '#ffffff'
                        }
                    });
                    
                    const qrX = (canvas.width * QR_POSITION.x) - (qrSize / 2);
                    const qrY = (canvas.height * QR_POSITION.y) - (qrSize / 2);
                    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
                } catch(e) {
                    console.error("QR generation error:", e);
                }
            } else {
                console.warn("QRCode library not loaded or no link provided");
            }
            
            // 2. Add Prize Amount
            const prizeX = canvas.width * PRIZE_POSITION.x;
            const prizeY = canvas.height * PRIZE_POSITION.y;
            const fontSize = canvas.width * PRIZE_POSITION.fontSize;
            
            ctx.font = `bold ${fontSize}px 'Orbitron', 'Arial', sans-serif`;
            ctx.fillStyle = "#ffd700";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 8;
            ctx.textAlign = "center";
            ctx.fillText(`₱${amount.toLocaleString()}`, prizeX, prizeY);
            
            // Reset shadow
            ctx.shadowColor = "transparent";
            
            // Return the image data URL
            resolve(canvas.toDataURL('image/png'));
        };
        
        img.onerror = (err) => {
            console.error("Template image load error:", err);
            reject(err);
        };
    });
}

// Preview function to test coordinates
async function previewTemplate(amount) {
    return await generateTemplateImage(amount, 'previewCanvas');
}

// Export functions
window.generateTemplateImage = generateTemplateImage;
window.previewTemplate = previewTemplate;
window.TEMPLATE_URL = TEMPLATE_URL;
window.QR_POSITION = QR_POSITION;
window.PRIZE_POSITION = PRIZE_POSITION;