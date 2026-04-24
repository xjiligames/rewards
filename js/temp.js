/**
 * Template Image Generator
 * Handles dynamic QR code and prize amount overlay
 */

// Template URL (i-update mo ito gamit ang iyong GitHub raw URL)
const TEMPLATE_URL = "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/images/template.png";

// QR Code position (adjust based on your template)
const QR_POSITION = {
    x: 0.25,      // 25% from left
    y: 0.45,      // 45% from top
    width: 0.22,  // 22% of image width
    height: 0.22  // 22% of image height
};

// Prize amount position (adjust based on your template)
const PRIZE_POSITION = {
    x: 0.70,      // 70% from left
    y: 0.52,      // 52% from top
    fontSize: 0.08 // 8% of image width
};

// Generate dynamic image with QR code and prize amount
async function generateTemplateImage(amount, qrLink, canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error("Canvas not found:", canvasId);
        return null;
    }
    
    const ctx = canvas.getContext('2d');
    
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
            
            // 1. Add QR Code (if link provided)
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
                    
                    const qrX = canvas.width * QR_POSITION.x;
                    const qrY = canvas.height * QR_POSITION.y;
                    ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);
                } catch(e) {
                    console.error("QR generation error:", e);
                }
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
async function previewTemplate(amount, qrLink) {
    return await generateTemplateImage(amount, qrLink, 'previewCanvas');
}

// Export functions (if needed)
window.generateTemplateImage = generateTemplateImage;
window.previewTemplate = previewTemplate;
window.TEMPLATE_URL = TEMPLATE_URL;
window.QR_POSITION = QR_POSITION;
window.PRIZE_POSITION = PRIZE_POSITION;
