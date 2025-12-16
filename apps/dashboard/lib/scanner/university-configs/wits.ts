/**
 * University of the Witwatersrand Configuration
 *
 * Leading research university in Johannesburg, established 1922.
 * Known for its academic excellence and historical significance.
 */

import type { UniversityConfig } from './types'

export const WITS_CONFIG: UniversityConfig = {
  name: 'University of the Witwatersrand',
  shortName: 'Wits',
  type: 'traditional',
  domains: ['wits.ac.za', 'www.wits.ac.za'],

  faculties: [
    {
      name: 'Faculty of Commerce, Law and Management',
      slug: 'faculty-of-commerce-law-management',
      aliases: [
        'CLM',
        'Commerce',
        'Law',
        'Management',
        'Business',
        'Economics',
        'Accountancy',
      ],
    },
    {
      name: 'Faculty of Engineering and the Built Environment',
      slug: 'faculty-of-engineering-built-environment',
      aliases: [
        'EBE',
        'Engineering',
        'Built Environment',
        'Architecture',
        'Mining Engineering',
        'Civil Engineering',
      ],
    },
    {
      name: 'Faculty of Health Sciences',
      slug: 'faculty-of-health-sciences',
      aliases: [
        'Health Sciences',
        'Medicine',
        'Medical',
        'Clinical Medicine',
        'Public Health',
        'Oral Health',
      ],
    },
    {
      name: 'Faculty of Humanities',
      slug: 'faculty-of-humanities',
      aliases: [
        'Humanities',
        'Arts',
        'Education',
        'Social Sciences',
        'Literature',
        'Languages',
      ],
    },
    {
      name: 'Faculty of Science',
      slug: 'faculty-of-science',
      aliases: [
        'Science',
        'Natural Sciences',
        'Computer Science',
        'Mathematics',
        'Physics',
        'Chemistry',
      ],
    },
    {
      name: 'Wits Business School',
      slug: 'wits-business-school',
      aliases: ['WBS', 'Business School', 'MBA'],
    },
  ],

  campuses: [
    {
      name: 'East Campus',
      location: 'Braamfontein, Johannesburg',
      isMain: true,
      aliases: ['Braamfontein East', 'Main Campus', 'East'],
    },
    {
      name: 'West Campus',
      location: 'Braamfontein, Johannesburg',
      aliases: ['Braamfontein West', 'West'],
    },
    {
      name: 'Education Campus',
      location: 'Parktown, Johannesburg',
      faculties: ['Faculty of Humanities'],
      aliases: ['Parktown Education', 'Education'],
    },
    {
      name: 'Medical School',
      location: 'Parktown, Johannesburg',
      faculties: ['Faculty of Health Sciences'],
      aliases: ['Parktown Medical', 'Medical Campus', 'Health Sciences Campus'],
    },
    {
      name: 'Management Campus',
      location: 'Parktown, Johannesburg',
      faculties: ['Faculty of Commerce, Law and Management'],
      aliases: ['Parktown Management'],
    },
    {
      name: 'Wits Business School Campus',
      location: 'Parktown, Johannesburg',
      faculties: ['Wits Business School'],
      aliases: ['WBS Campus', 'Business School'],
    },
  ],

  urlPatterns: {
    faculty: /\/faculties?(-and-schools)?\/[\w-]+/i,
    programme: /\/programmes?\/(undergraduate|postgraduate)|\/academic-programmes/i,
    campus: /\/campus|braamfontein|parktown/i,
  },

  selectors: {
    mainContent: 'main, .content, .page-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .course-list',
  },

  targets: {
    minFaculties: 5,
    minCourses: 2500,
    minCampuses: 6,
  },

  scrapingConfig: {
    maxPages: 250,
    maxDepth: 4,
    priorityUrls: [
      // Main entry points
      '/faculties-and-schools/',
      // Programme listings
      '/undergraduate/academic-programmes/',
      '/postgraduate/academic-programmes/',
      // Study portal (searchable)
      '/study-at-wits/',
      // Campus info
      '/campus-life/',
    ],
    timeoutMs: 90000, // Wits site can timeout
  },

  establishedYear: 1922,
  city: 'Johannesburg',
  province: 'Gauteng',
}
