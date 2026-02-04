// emailService.js - Email notifcation service

const nodemailer = require('nodemailer');

let transporter = null;
let emailConfig = {
    user: null,
    isConfigured: false
};

/**
 * Configure email service with user credentials
 * @param {string} email - User's email address
 * @param {string} password - Email password (App Password for Gmail)
 * @returns {Promise<boolean>} - Success status
 */

async function configure(email, password) { 
    try {
        // Create transporter
        transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: email,
            pass: password
          }
        });
    
        // Verify connection
        await transporter.verify();
        
        emailConfig.user = email;
        emailConfig.isConfigured = true;
        
        console.log('Email service configured successfully');
        return true;
      } catch (error) {
        console.error('Email configuration failed:', error.message);
        emailConfig.isConfigured = false;
        throw new Error('Failed to configure email. Check your credentials.');
      }
}

/**
 * Send confirmation email when monitoring starts
 */

async function sendConfirmation(toEmail, name, crn, sessionId) {
    if (!emailConfig.isConfigured) {
        console.log('Emai is not configured, skipping confirmation');
        return false;
    }
    try {
        const mailOptions = {
            from: emailConfig.user,
            to: toEmail,
            subject: '🔍 Course Monitor Started - MRU Course Checker',
            text: `Hello ${name},\n\nYour course monitor for CRN ${crn} has been started successfully!\n\nYou will receive an email notification when a seat becomes available.\n\nMonitor ID: ${sessionId}\n\nBest regards,\nMRU Course Monitor`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">🔍 Course Monitor Started</h2>
                <p>Hello <strong>${name}</strong>,</p>
                <p>Your course monitor has been started successfully!</p>
                
                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>CRN:</strong> ${crn}</p>
                  <p style="margin: 5px 0;"><strong>Monitor ID:</strong> ${sessionId}</p>
                  <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #22c55e;">Active</span></p>
                </div>
                
                <p> You will receive an email notification when a seat becomes available.</p>
                <p>The system checks every 2 minutes for availability.</p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 12px;">
                  This is an automated message from MRU Course Monitor.<br>
                  Monitor started at ${new Date().toLocaleString()}
                </p>
              </div>
            `
          };
      
          await transporter.sendMail(mailOptions);
          console.log(`📧 Confirmation email sent to ${toEmail}`);
          return true;
    } catch (error) {
        console.error('Error sending cofirmation email:', error.message)
        return false;
    }
}

/**
 * Send notification when seats become available
 */
async function sendAvailabilityNotification(toEmail, courseInfo) {
    if (!emailConfig.isConfigured) {
        console.log('Emai is not configured, skipping confirmation');
        return false;
    }

    try {
        const { crn, courseTitle, seatsAvailable, capacity, enrollment } = courseInfo;
    
        const mailOptions = {
          from: emailConfig.user,
          to: toEmail,
          subject: `🎉 SEAT AVAILABLE! ${courseTitle || `CRN ${crn}`}`,
          text: `Great news!\n\nA seat is now available in your monitored course!\n\nCourse: ${courseTitle || 'Unknown Course'}\nCRN: ${crn}\nSeats Available: ${seatsAvailable}\nCapacity: ${capacity}\nCurrent Enrollment: ${enrollment}\n\n🏃 Go register now before it's taken!\n\nMRU Registration: https://ssb-prod.ec.mru.ca/PROD_Registration`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #22c55e; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">🎉 SEAT AVAILABLE!</h1>
              </div>
              
              <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="font-size: 18px; color: #1f2937;">Great news! A seat is now available!</p>
                
                <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
                  <h3 style="margin-top: 0; color: #166534;">${courseTitle || 'Course Details'}</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0;"><strong>CRN:</strong></td>
                      <td style="padding: 8px 0;">${crn}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0;"><strong>Seats Available:</strong></td>
                      <td style="padding: 8px 0; color: #22c55e; font-weight: bold; font-size: 18px;">${seatsAvailable}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0;"><strong>Capacity:</strong></td>
                      <td style="padding: 8px 0;">${capacity}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0;"><strong>Current Enrollment:</strong></td>
                      <td style="padding: 8px 0;">${enrollment}</td>
                    </tr>
                  </table>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://ssb-prod.ec.mru.ca/PROD_Registration" 
                     style="display: inline-block; background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    🏃 Register Now
                  </a>
                </div>
                
                <p style="color: #ef4444; font-weight: bold;">⚡ Act fast! Seats fill up quickly.</p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                <p style="color: #6b7280; font-size: 12px;">
                  This notification was sent because you requested to be alerted when seats become available.<br>
                  Notification sent at ${new Date().toLocaleString()}
                </p>
              </div>
            </div>
          `
        };
    
        await transporter.sendMail(mailOptions);
        console.log(`📧 Availability notification sent to ${toEmail} for CRN ${crn}`);
        return true;
    } catch (error) {
        console.error('Error sending availability notification:', error.message);
        return false;
    }
}

/**
 * Send test email to verify configuration
 */
async function sendTestEmail(toEmail) {
    if (!emailConfig.isConfigured) {
      throw new Error('Email not configured');
    }
  
    try {
      const mailOptions = {
        from: emailConfig.user,
        to: toEmail,
        subject: 'Test Email - MRU Course Monitor',
        text: 'This is a test email from MRU Course Monitor. Your email is configured correctly!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #22c55e;">Email Test Successful</h2>
            <p>This is a test email from MRU Course Monitor.</p>
            <p>Your email is configured correctly and ready to send notifications!</p>
          </div>
        `
      };
  
      await transporter.sendMail(mailOptions);
      console.log(`📧 Test email sent to ${toEmail}`);
      return true;
    } catch (error) {
      console.error('Error sending test email:', error.message);
      throw error;
    }
  }
  
  /**
   * Check if email is configured
   */
  function isConfigured() {
    return emailConfig.isConfigured;
  }
  
  /**
   * Get current email configuration (without sensitive data)
   */
  function getConfig() {
    return {
      user: emailConfig.user,
      isConfigured: emailConfig.isConfigured
    };
  }
  
  /**
   * Reset email configuration
   */
  function reset() {
    transporter = null;
    emailConfig = {
      user: null,
      isConfigured: false
    };
    console.log('📧 Email configuration reset');
  }
  
  module.exports = {
    configure,
    sendConfirmation,
    sendAvailabilityNotification,
    sendTestEmail,
    isConfigured,
    getConfig,
    reset
  };
