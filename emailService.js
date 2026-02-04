// emailService.js - Email notifcation service

const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initializing service with user cridentials
 * REMEMBER: CALL BEFORE SENDING EMAILS
 */

function initializeEmail(config) { 
    const{ service, email, password} = config;

    // Using Gmail, Outlook, etc.
    if (service) {
        transporter = nodemailer.createTransport({
            service: service,
            auth: {
                user: email,
                pass: password
            }
        });
    }
    else { 
        throw new Error('Email service host is required');
    }

    console.log('Email service has been initialized')
}

/**
 * Sending email notification when a seat is free
 */

async function sendSeatAvailableEmail(recipientEmail, courseInfo) {
    if (!transporter) {
        console.error('Email service not initialized')
        return false;
    }

    // email formating from CLAUDE AI 
    try {
        const mailOptions = {
          from: transporter.options.auth.user,
          to: recipientEmail,
          subject: `🎉 Seat Available: ${courseInfo.courseCode}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px; }
                .content { background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; }
                .course-info { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
                .info-row { margin: 8px 0; }
                .label { font-weight: bold; color: #555; }
                .action-button { 
                  display: inline-block; 
                  padding: 12px 24px; 
                  background: #4CAF50; 
                  color: white; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  margin: 20px 0;
                }
                .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🎉 Seat Available!</h1>
                </div>
                
                <div class="content">
                  <p>Great news! A seat has opened up in the course you're monitoring:</p>
                  
                  <div class="course-info">
                    <div class="info-row">
                      <span class="label">Course:</span> ${courseInfo.courseCode} - ${courseInfo.courseTitle}
                    </div>
                    <div class="info-row">
                      <span class="label">CRN:</span> ${courseInfo.crn}
                    </div>
                    <div class="info-row">
                      <span class="label">Term:</span> ${courseInfo.termDesc}
                    </div>
                    <div class="info-row">
                      <span class="label">Seats Available:</span> ${courseInfo.seatsAvailable} out of ${courseInfo.maxEnrollment}
                    </div>
                    ${courseInfo.instructor ? `
                    <div class="info-row">
                      <span class="label">Instructor:</span> ${courseInfo.instructor}
                    </div>
                    ` : ''}
                    ${courseInfo.meetingInfo ? `
                    <div class="info-row">
                      <span class="label">Schedule:</span> ${courseInfo.meetingInfo.days} ${courseInfo.meetingInfo.startTime} - ${courseInfo.meetingInfo.endTime}
                    </div>
                    <div class="info-row">
                      <span class="label">Location:</span> ${courseInfo.meetingInfo.building} ${courseInfo.meetingInfo.room}
                    </div>
                    ` : ''}
                  </div>
    
                  <p><strong>⚠️ Act Fast!</strong> Seats fill up quickly. Enroll now to secure your spot.</p>
                  
                  <center>
                    <a href="${courseInfo.registrationUrl || 'https://your-school-registration.edu'}" class="action-button">
                      Enroll Now
                    </a>
                  </center>
                </div>
    
                <div class="footer">
                  <p>This notification was sent by your Course Monitor</p>
                  <p>Checked at: ${new Date().toLocaleString()}</p>
                </div>
              </div>
            </body>
            </html>
          `,
          // Plain text fallback
          text: `
    Seat Available!
    
    ${courseInfo.courseCode} - ${courseInfo.courseTitle}
    CRN: ${courseInfo.crn}
    Term: ${courseInfo.termDesc}
    Seats Available: ${courseInfo.seatsAvailable}/${courseInfo.maxEnrollment}
    
    Act fast! Enroll now at: ${courseInfo.registrationUrl || 'your registration portal'}
    
    Checked at: ${new Date().toLocaleString()}
          `
        };
    
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent:', info.messageId);
        return true;
    
      } catch (error) {
        console.error('❌ Error sending email:', error.message);
        return false;
      }
    
}

/**
 * Send test email to vwerify configuration
 */

async function sendTestEmail(recipientEmail) {
    if (!transporter) {
        console.log('Enrollment failure email sent');
        return false;
    }

    try {
        const mailOptions = {
            from: transporter.options.auth.user,
            to: recipientEmail,
            subject: 'Course Monitor Email Test',
            html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>✅ Email Service Working!</h2>
            <p>Your course monitor email service is configured correctly.</p>
            <p>You'll receive notifications at this email address when seats become available.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
            </body>
            </html>
        `,
        text: `
        Email Service Working!

        Your course monitor email service is configured correctly.
        You'll receive notifications at this email address when seats become available.

        Sent a: ${new Date().toLocaleString()}
            `
        };

        await transporter.sendMail(mailOptions);
        console.log('Test email sent successdfully!');
        return true;
    
    }   catch (error) {
        console.error(' Error sending test email:', error.message);
        return false;
    }
}

module.exports = {
    initializeEmail,
    sendSeatAvailableEmail,
    sendTestEmail
}