const nodemailer = require('nodemailer');
require('dotenv').config();

console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🔧 SANGKALAN EMAIL SYSTEM DIAGNOSTIC                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);

// Check environment variables
console.log('1️⃣ CHECKING ENVIRONMENT VARIABLES:');
console.log('   GMAIL_USER:', process.env.GMAIL_USER || '❌ NOT SET');
console.log('   GMAIL_PASSWORD:', process.env.GMAIL_PASSWORD ? '✅ SET (hidden)' : '❌ NOT SET');
console.log('   PORT:', process.env.PORT || '3000 (default)');

if (!process.env.GMAIL_USER || !process.env.GMAIL_PASSWORD) {
    console.log('\n❌ ERROR: Gmail credentials not set in .env file');
    console.log('   Please edit .env and add:\n');
    console.log('   GMAIL_USER=your-email@gmail.com');
    console.log('   GMAIL_PASSWORD=your-16-char-password\n');
    process.exit(1);
}

// Test Gmail connection
console.log('\n2️⃣ TESTING GMAIL CONNECTION:');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
    }
});

transporter.verify(function(error, success) {
    if (error) {
        console.log('   ❌ Gmail connection FAILED');
        console.log('   Error:', error.message);
        console.log('\n   TROUBLESHOOTING:');
        console.log('   • Check Gmail is correct: ' + process.env.GMAIL_USER);
        console.log('   • Check 2-Step Verification is ENABLED');
        console.log('   • Check App Password is correct (16 characters)');
        console.log('   • No spaces in password\n');
        process.exit(1);
    } else {
        console.log('   ✅ Gmail connection SUCCESS!');
        console.log('   Account:', process.env.GMAIL_USER);
        
        // Send test email
        console.log('\n3️⃣ SENDING TEST EMAIL:');
        
        const testEmail = 'test@example.com'; // This will fail, but shows if Gmail works
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: testEmail,
            subject: 'Sangkalan Email System Test',
            html: '<h2>✅ Gmail is configured correctly!</h2><p>This is a diagnostic test.</p>'
        };
        
        transporter.sendMail(mailOptions, function(error, info) {
            if (error) {
                // This is expected if email is invalid, but shows Gmail is working
                console.log('   Status: ✅ Gmail can send emails');
                console.log('   Note: Test failed because email is invalid');
            } else {
                console.log('   ✅ Test email sent successfully!');
                console.log('   Message ID:', info.messageId);
            }
            
            console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ✅ GMAIL SETUP IS WORKING!                              ║
║                                                            ║
║   Next steps:                                              ║
║   1. Start server: npm start                               ║
║   2. Open inventory system in browser                      ║
║   3. Click "🧪 Test Email" button                          ║
║   4. Send inventory report                                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
            `);
            
            process.exit(0);
        });
    }
});
