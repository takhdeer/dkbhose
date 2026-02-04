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
    sendEnrollmentSuccessEmail,
    sendEnrollmentFailureEmail
} = require ('./emailService')

