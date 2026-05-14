// SIMPLIFIED ADCOM.JS - Test Version

// USER SIDE - Simple listener
const userPhone = localStorage.getItem('userPhone');
console.log('Raw phone from localStorage:', userPhone);

if (userPhone) {
    // Use phone directly (no standardization)
    db.ref('user_sessions/' + userPhone + '/adminClearData').on('value', snapshot => {
        console.log('Listener fired! Value:', snapshot.val());
        
        if (snapshot.val() === true) {
            console.log('Clearing data...');
            localStorage.clear();
            window.location.href = 'index.html';
        }
    });
    
    console.log('Listening to:', 'user_sessions/' + userPhone + '/adminClearData');
}

// ADMIN SIDE - Simple send
function sendClearDataCommand(phone) {
    // Use phone directly (no standardization)
    db.ref('user_sessions/' + phone + '/adminClearData').set(true)
        .then(() => console.log('Command sent to:', phone))
        .catch(e => console.error('Error:', e));
}
