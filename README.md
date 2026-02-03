# Course Availability Checker - Written by CLAUDE AI

A modular, React-ready system for checking course availability from JSON data.

## 📁 File Structure

```
src/
├── services/
│   └── courseAvailabilityService.js   # Core service functions
├── hooks/
│   └── useCourseAvailability.js       # Custom React hook
├── components/
│   └── CourseAvailabilityChecker.jsx  # Example React component
└── examples/
    └── exampleUsage.js                # Usage examples and tests
```

## 🚀 Quick Start

### 1. Basic Usage (Without React)

```javascript
import { findAvailableCourses, findCourseByIdentifier } from './courseAvailabilityService';

// Your JSON data
const courseData = {
  success: true,
  totalCount: 1,
  data: [ /* ... course objects ... */ ]
};

// Find all available courses for a term
const availableCourses = findAvailableCourses(courseData, '202601');
console.log(`Found ${availableCourses.length} available courses`);

// Search for a specific course
const course = findCourseByIdentifier(courseData, 'COMP1701');
// Automatically logs availability to console
```

### 2. React Hook Usage

```javascript
import { useCourseAvailability } from './hooks/useCourseAvailability';

function MyCourseComponent() {
  const {
    courseData,
    loading,
    error,
    setCourseData,
    getAvailableCourses,
    searchCourse
  } = useCourseAvailability();

  // Load data from API
  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => setCourseData(data));
  }, []);

  // Find available courses
  const handleSearch = () => {
    const courses = getAvailableCourses('202601', 'COMP');
    console.log('Available courses:', courses);
  };

  return (
    // Your component JSX
  );
}
```


## 📋 API Reference

### Core Functions

#### `hasAvailableSeats(course)`
Checks if a course has available seats.
- **Parameters**: `course` (Object) - Course object from JSON
- **Returns**: `boolean` - True if seats available

#### `findAvailableCourses(jsonData, term, subject?)`
Finds all available courses for a term and optional subject.
- **Parameters**:
  - `jsonData` (Object) - Complete JSON response
  - `term` (String) - Term code (e.g., "202601")
  - `subject` (String, optional) - Subject code (e.g., "COMP")
- **Returns**: `Array` - Array of available course objects with formatted data

#### `findCourseByIdentifier(jsonData, searchTerm)`
Searches for a specific course by CRN or course code.
- **Parameters**:
  - `jsonData` (Object) - Complete JSON response
  - `searchTerm` (String) - CRN or course code
- **Returns**: `Object|null` - Course object or null
- **Side Effect**: Logs availability to console

#### `getUniqueSubjects(jsonData)`
Gets all unique subject codes from data.
- **Parameters**: `jsonData` (Object)
- **Returns**: `Array<String>` - Sorted array of subject codes

#### `getUniqueTerms(jsonData)`
Gets all unique terms from data.
- **Parameters**: `jsonData` (Object)
- **Returns**: `Array<Object>` - Array of term objects with code and description

### Custom Hook API

#### `useCourseAvailability(jsonFilePath?)`
Custom hook for managing course data.
- **Parameters**: `jsonFilePath` (String, optional) - Path to JSON file
- **Returns**: Object with:
  - `courseData` - Current course data
  - `loading` - Loading state
  - `error` - Error message if any
  - `loadCourseData(filePath)` - Load data from file
  - `setCourseData(data)` - Set data directly
  - `getAvailableCourses(term, subject?)` - Get available courses
  - `searchCourse(identifier)` - Search specific course
  - `getSubjects()` - Get all subjects
  - `getTerms()` - Get all terms

## 🔧 Data Structure

### Input Format
The service expects JSON in this format:
```json
{
  "success": true,
  "totalCount": 1,
  "data": [
    {
      "id": 293983,
      "term": "202601",
      "termDesc": "Winter 2026 CREDIT",
      "courseReferenceNumber": "13254",
      "subject": "COMP",
      "subjectCourse": "COMP1701",
      "courseTitle": "Introduction to Problem Solving and Programming",
      "maximumEnrollment": 40,
      "enrollment": 38,
      "seatsAvailable": 2,
      "openSection": true,
      "faculty": [ /* ... */ ],
      "meetingsFaculty": [ /* ... */ ]
    }
  ]
}
```

### Output Format
Available courses are returned in this simplified format:
```javascript
{
  id: 293983,
  crn: "13254",
  courseCode: "COMP1701",
  courseNumber: "1701",
  subject: "COMP",
  title: "Introduction to Problem Solving and Programming",
  term: "Winter 2026 CREDIT",
  section: "001",
  instructor: "Sarah Shah",
  seatsAvailable: 2,
  maxEnrollment: 40,
  currentEnrollment: 38,
  scheduleType: "Lecture",
  credits: 3,
  meetingInfo: {
    days: "Tue, Thu",
    startTime: "10:00 AM",
    endTime: "11:20 AM",
    building: "Lincoln Park",
    room: "Y318",
    startDate: "01/06/2026",
    endDate: "04/25/2026"
  },
  campus: "MRU Lincoln Park",
  instructionalMethod: "In Person"
}
```

## 💡 Tips

1. **Console Logging**: The `findCourseByIdentifier` function automatically logs formatted output to the console
2. **Error Handling**: All functions handle invalid data gracefully and return empty arrays/null
3. **Performance**: Functions use efficient filtering and mapping operations
4. **Flexibility**: Can work with file imports, API responses, or static JSON data
5. **Type Safety**: Consider adding TypeScript definitions for production use

## 🧪 Testing

Run the included test file:
```javascript
import testCourseAvailability from './exampleUsage';

// Run all tests
testCourseAvailability();
```

## 📦 Dependencies

- React (for hook and component)
- No additional packages required for core service

## 🎨 Styling

The example component includes class names for easy styling:
- `.course-availability-checker` - Main container
- `.search-section` - Search form section
- `.results` - Results container
- `.course-card` - Individual course card
- `.quick-search` - Quick search section


## 📝 Notes

- The service works with Banner/Ellucian JSON format
- Time formatting converts 24-hour to 12-hour format
- Waitlist information is included but not emphasized
- Course capacity checks both `seatsAvailable > 0` and `openSection === true`