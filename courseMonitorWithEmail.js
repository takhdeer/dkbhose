// courseMonitorWithEmail.js - Background scanning script with email notification

const { 
    getActiveWaitLists,
    updateWaitlistStatus,
    updateLastChcked,
    logNotification,
    getConfig
} = require('./localStorageService')

// IMport course availability service
const {findCourseByIdentifier } = require('./courseAvailabilityService')

// Importy email service
const { 
    initializeEmail,
    sendSeatAvailableEmail,
} = require ('./emailService')

//Checking interval in minutes
let CHECK_INTERVAL = 5;
let USER_EMAIL = '';

/**
 * Intialize email service on startup
 */

async function Initialize() {
    const config = await getConfig();
    CHECK_INTERVAL = config.checkInterval || 5;
    USER_EMAIL = config.userEmail;

    if (!config.emailService) {
    console.log('\n: Email not configured yet!');
    console.log('Run: node email-setup.js to configure email notifications\n');
    return false;
    }

    try {
        initializeEmail(config.emailService);
        console.log('Email service ready\n');
        return true;
    } catch (error) {
        console.error('Email intialization fialed:', error.message);
        console.log('Run: node email-setup.js to configure email notifications\n');
        return false;
    }
}

/**
 * Fetching course data from classInfo.json
 */

async function checkCourse(waitlist) {
    console.log(`Course ${waitlist.courseCode} (CRN: ${waitlist.crn})...`);

    // Fetch latest course data
    
}