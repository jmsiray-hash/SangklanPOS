const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Gmail Configuration - UPDATE THESE WITH YOUR GMAIL CREDENTIALS
const GMAIL_USER = process.env.GMAIL_USER || 'your-email@gmail.com';
const GMAIL_PASSWORD = process.env.GMAIL_PASSWORD || 'your-app-password'; // Use Gmail App Password

// Create transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASSWORD
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'Server is running', timestamp: new Date().toLocaleString('en-PH') });
});

// Send Email Endpoint
app.post('/send-inventory-email', async (req, res) => {
    try {
        const { to_email, subject, html_content } = req.body;

        // Validate input
        if (!to_email || !subject || !html_content) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: to_email, subject, html_content'
            });
        }

        console.log(`📧 Sending email to: ${to_email}`);
        console.log(`📝 Subject: ${subject}`);

        // Send email
        const result = await transporter.sendMail({
            from: GMAIL_USER,
            to: to_email,
            subject: subject,
            html: html_content,
            replyTo: GMAIL_USER
        });

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', result.messageId);

        res.json({
            success: true,
            message: 'Email sent successfully',
            messageId: result.messageId,
            recipient: to_email
        });

    } catch (error) {
        console.error('❌ Email sending error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Failed to send email',
            error: error.message,
            details: error.toString()
        });
    }
});

// Test Email Endpoint
app.post('/test-email', async (req, res) => {
    try {
        const { to_email } = req.body;

        if (!to_email) {
            return res.status(400).json({
                success: false,
                message: 'Email address required'
            });
        }

        const testHtml = `
            <table width="100%" style="font-family: Arial, sans-serif; color: #333;">
                <tr><td style="text-align: center; padding: 20px;">
                    <h2>🧪 TEST EMAIL</h2>
                    <p>This is a test email from Sangkalan Restaurant Inventory System.</p>
                    <p><strong>If you received this, the email system is working correctly!</strong></p>
                    <p style="margin-top: 20px; color: #666; font-size: 12px;">
                        Sent from: ${GMAIL_USER}<br>
                        Sent at: ${new Date().toLocaleString('en-PH')}<br>
                        Status: SUCCESS ✅
                    </p>
                </td></tr>
            </table>
        `;

        const result = await transporter.sendMail({
            from: GMAIL_USER,
            to: to_email,
            subject: 'Test Email - Sangkalan Inventory System',
            html: testHtml,
            replyTo: GMAIL_USER
        });

        console.log('✅ Test email sent successfully!');

        res.json({
            success: true,
            message: 'Test email sent successfully',
            messageId: result.messageId,
            recipient: to_email
        });

    } catch (error) {
        console.error('❌ Test email error:', error);
        
        res.status(500).json({
            success: false,
            message: 'Test email failed',
            error: error.message
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🍽️  SANGKALAN INVENTORY EMAIL SERVER                     ║
║                                                            ║
║   ✅ Server running on: http://localhost:${PORT}              ║
║   📧 Gmail Account: ${GMAIL_USER}              ║
║                                                            ║
║   Ready to send inventory emails!                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
});
