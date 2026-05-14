const phone = '09171234567'; // Phone na clinick mo
let digits = phone.replace(/\D/g, '');
if (digits.startsWith('639') && digits.length >= 12) digits = '0' + digits.substring(2);
else if (digits.startsWith('63') && digits.length >= 11) digits = '0' + digits.substring(2);
else if (digits.length === 10 && digits.startsWith('9')) digits = '0' + digits;

console.log('Admin path:', 'user_sessions/' + digits + '/adminClearData');

db.ref('user_sessions/' + digits + '/adminClearData').once('value').then(s => {
    console.log('Value in Firebase:', s.val());
});
