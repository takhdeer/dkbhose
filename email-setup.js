// email-setup.js - Interactive email configuration

const readline = require('readline');
const { updateConfig, getConfig } = require('./localStorageService');
const { initializeEmail, sendTestEmail } = require('./emailService');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => {
  rl.question(prompt, resolve);
});

async function setup() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║          Email Notification Setup                        ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // Check if already configured
  const config = await getConfig();
  if (config.emailService) {
    console.log('Email is already configured\n');
    const reconfigure = await question('Do you want to reconfigure? (y/n): ');
    if (reconfigure.toLowerCase() !== 'y') {
      rl.close();
      return;
    }
    console.log('');
  }

  // Step 1: Choose email provider
  console.log('Choose your email provider:\n');
  console.log('1. Gmail (recommended for personal use)');
  console.log('2. Outlook');
  console.log('3. Yahoo Mail');

  const choice = await question('Enter choice (1-3): ');
  console.log('');

  let service = null;


  switch (choice) {
    case '1':
      service = 'gmail';
      break;
    case '2':
      service = 'outlook';
      break;
    case '3':
      service = 'yahoo';
      break;
    default:
      console.log('Invalid choice');
      rl.close();
      return;
  }

  // Step 2: Get email credentials
  console.log('');
  const email = await question('Your email address: ');
  
  const password = await question('Email password (or App Password): ');

  // Step 3: Save configuration
  const emailConfig = {
    emailService: service ? { service, email, password } : { email, password },
    userEmail: email
  };

  await updateConfig(emailConfig);
  console.log('\nEmail configuration saved\n');

  // Step 4: Test email (done by CLAUDE AI)
  const sendTest = await question('Send a test email to verify setup? (y/n): ');
  
  if (sendTest.toLowerCase() === 'y') {
    console.log('\nSending test email...\n');
    
    try {
      initializeEmail(emailConfig.emailService);
      const success = await sendTestEmail(email);
      
      if (success) {
        console.log('Test email sent successfully!');
        console.log('Check your inbox (and spam folder)\n');
      } else {
        console.log('Failed to send test email');
        console.log('Check your credentials and try again\n');
      }
    } catch (error) {
      console.log('Error:', error.message);
    }
  }

  console.log('Setup complete! You can now run the monitor:');
  console.log('  node courseMonitorWithEmail.js\n');

  rl.close();
}

// Run setup
setup().catch(console.error);
