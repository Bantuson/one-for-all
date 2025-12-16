/**
 * University of KwaZulu-Natal Configuration
 *
 * Traditional research university formed in 2004 from merger of
 * University of Natal and University of Durban-Westville.
 * Five campuses across KwaZulu-Natal province.
 */

import type { UniversityConfig } from './types'

export const UKZN_CONFIG: UniversityConfig = {
  name: 'University of KwaZulu-Natal',
  shortName: 'UKZN',
  type: 'traditional',
  domains: ['ukzn.ac.za', 'www.ukzn.ac.za'],

  faculties: [
    {
      name: 'College of Agriculture, Engineering and Science',
      slug: 'college-of-agriculture-engineering-science',
      aliases: ['CAES', 'Agriculture', 'Engineering', 'Science'],
      description: 'Engineering, agriculture, and natural sciences',
    },
    {
      name: 'College of Health Sciences',
      slug: 'college-of-health-sciences',
      aliases: ['Health Sciences', 'Medicine', 'Medical', 'Nursing', 'Pharmacy'],
      description: 'Medical, nursing, pharmacy, and health sciences programs',
    },
    {
      name: 'College of Humanities',
      slug: 'college-of-humanities',
      aliases: ['Humanities', 'Social Sciences', 'Arts'],
      description: 'Humanities and social sciences',
    },
    {
      name: 'College of Law and Management Studies',
      slug: 'college-of-law-management-studies',
      aliases: ['CLMS', 'Law', 'Management', 'Business', 'Commerce'],
      description: 'Law, business, and management programs',
    },
  ],

  campuses: [
    {
      name: 'Howard College Campus',
      location: 'Glenwood, Durban',
      isMain: true,
      aliases: ['Howard College', 'Howard', 'HC'],
      faculties: [
        'College of Humanities',
        'College of Law and Management Studies',
        'College of Health Sciences',
        'College of Agriculture, Engineering and Science',
      ],
    },
    {
      name: 'Westville Campus',
      location: 'Westville, Durban',
      aliases: ['Westville', 'WV'],
      faculties: [
        'College of Law and Management Studies',
        'College of Humanities',
      ],
    },
    {
      name: 'Pietermaritzburg Campus',
      location: 'Pietermaritzburg',
      aliases: ['PMB', 'Pietermaritzburg', 'Maritzburg'],
      faculties: [
        'College of Agriculture, Engineering and Science',
        'College of Humanities',
        'College of Law and Management Studies',
      ],
    },
    {
      name: 'Medical School Campus',
      location: 'Durban',
      aliases: ['Medical School', 'Med School', 'Nelson R Mandela School of Medicine'],
      faculties: ['College of Health Sciences'],
    },
    {
      name: 'Edgewood Campus',
      location: 'Pinetown, Durban',
      aliases: ['Edgewood', 'EW'],
      faculties: ['College of Humanities'],
    },
  ],

  urlPatterns: {
    faculty: /\/college|\/faculty/i,
    programme: /\/programmes?|\/qualifications?/i,
    campus: /\/campus|howard|westville|pietermaritzburg|medical-school|edgewood/i,
  },

  selectors: {
    mainContent: 'main, .content, .node-content',
    facultyList: '.colleges-list, .faculties-list',
    programmeList: '.programme-list, .qualifications-list',
  },

  targets: {
    minFaculties: 4,
    minCourses: 180,
    minCampuses: 5,
  },

  scrapingConfig: {
    maxPages: 100,
    maxDepth: 4,
    timeoutMs: 90000, // UKZN site can be slow
    priorityUrls: [
      // Main programme listings
      '/programmes',
      '/qualifications',
      // College pages (note: UKZN uses subdomain structure)
      '/colleges',
      // Study portal
      '/study',
      '/study/apply/',
      // Campus information
      '/ukzn-campuses/',
      // Academic affairs
      '/academic-affairs/',
      // Prospective students
      '/prospective-students/',
    ],
    // Note: UKZN uses subdomain structure for colleges
    // e.g., arts.ukzn.ac.za, engineering.ukzn.ac.za
    // These may need separate scraping passes
  },

  establishedYear: 2004,
  city: 'Durban',
  province: 'KwaZulu-Natal',
}
