import { useState, useEffect } from 'react';
import { findAvailableCourses, findCourseByIdentifier, getUniqueSubjects, getUniqueTerms } from './courseAvailabilityService';

/**
 * Custom React hook for managing course availability data
 * @param {string} jsonFilePath - Path to the JSON file (or can accept data directly)
 * @returns {Object} - Course data and helper functions
 */
export const useCourseAvailability = (jsonFilePath = null) => {
  const [courseData, setCourseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load course data from JSON file
  const loadCourseData = async (filePath) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to load course data: ${response.statusText}`);
      }
      const data = await response.json();
      setCourseData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error loading course data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Set course data directly (useful for API responses)
  const setCourseDataDirectly = (data) => {
    setCourseData(data);
  };

  // Load data on mount if path provided
  useEffect(() => {
    if (jsonFilePath) {
      loadCourseData(jsonFilePath);
    }
  }, [jsonFilePath]);

  // Get available courses for a term and subject
  const getAvailableCourses = (term, subject = null) => {
    if (!courseData) return [];
    return findAvailableCourses(courseData, term, subject);
  };

  // Search for a specific course
  const searchCourse = (identifier) => {
    if (!courseData) return null;
    return findCourseByIdentifier(courseData, identifier);
  };

  // Get all subjects
  const getSubjects = () => {
    if (!courseData) return [];
    return getUniqueSubjects(courseData);
  };

  // Get all terms
  const getTerms = () => {
    if (!courseData) return [];
    return getUniqueTerms(courseData);
  };

  return {
    courseData,
    loading,
    error,
    loadCourseData,
    setCourseData: setCourseDataDirectly,
    getAvailableCourses,
    searchCourse,
    getSubjects,
    getTerms
  };
};

export default useCourseAvailability;