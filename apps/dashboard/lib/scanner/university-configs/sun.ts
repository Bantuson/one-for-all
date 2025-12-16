/**
 * Stellenbosch University Configuration
 *
 * Premier Afrikaans-medium university, established 1918.
 * One of South Africa's leading research universities.
 */

import type { UniversityConfig } from './types'

export const SUN_CONFIG: UniversityConfig = {
  name: 'Stellenbosch University',
  shortName: 'SU',
  type: 'traditional',
  domains: ['sun.ac.za', 'www.sun.ac.za', 'su.ac.za', 'www.su.ac.za'],

  faculties: [
    {
      name: 'Faculty of AgriSciences',
      slug: 'faculty-of-agrisciences',
      aliases: ['AgriSciences', 'Agriculture', 'Agricultural Sciences'],
    },
    {
      name: 'Faculty of Arts and Social Sciences',
      slug: 'faculty-of-arts-social-sciences',
      aliases: ['Arts', 'Social Sciences', 'Humanities', 'FASS'],
    },
    {
      name: 'Faculty of Economic and Management Sciences',
      slug: 'faculty-of-economic-management-sciences',
      aliases: ['EMS', 'Economics', 'Management', 'Commerce', 'Business'],
    },
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education'],
    },
    {
      name: 'Faculty of Engineering',
      slug: 'faculty-of-engineering',
      aliases: ['Engineering'],
    },
    {
      name: 'Faculty of Law',
      slug: 'faculty-of-law',
      aliases: ['Law'],
    },
    {
      name: 'Faculty of Medicine and Health Sciences',
      slug: 'faculty-of-medicine-health-sciences',
      aliases: ['Medicine', 'Health Sciences', 'Medical', 'FMHS'],
    },
    {
      name: 'Faculty of Military Science',
      slug: 'faculty-of-military-science',
      aliases: ['Military Science', 'Military'],
    },
    {
      name: 'Faculty of Science',
      slug: 'faculty-of-science',
      aliases: ['Science', 'Natural Sciences'],
    },
    {
      name: 'Faculty of Theology',
      slug: 'faculty-of-theology',
      aliases: ['Theology', 'Religion'],
    },
    {
      name: 'Stellenbosch Business School',
      slug: 'stellenbosch-business-school',
      aliases: ['USB', 'SBS', 'Business School', 'MBA'],
    },
  ],

  campuses: [
    {
      name: 'Stellenbosch Campus',
      location: 'Stellenbosch',
      isMain: true,
      faculties: [
        'Faculty of AgriSciences',
        'Faculty of Arts and Social Sciences',
        'Faculty of Economic and Management Sciences',
        'Faculty of Education',
        'Faculty of Engineering',
        'Faculty of Law',
        'Faculty of Science',
        'Faculty of Theology',
      ],
      aliases: ['Main Campus', 'Central Campus'],
    },
    {
      name: 'Tygerberg Campus',
      location: 'Tygerberg, Cape Town',
      faculties: ['Faculty of Medicine and Health Sciences'],
      aliases: ['Tygerberg', 'Medical Campus', 'Health Sciences Campus'],
    },
    {
      name: 'Bellville Park Campus',
      location: 'Bellville, Cape Town',
      faculties: ['Stellenbosch Business School'],
      aliases: ['Bellville', 'Business School Campus', 'USB Campus'],
    },
    {
      name: 'Saldanha Campus',
      location: 'Saldanha Bay',
      faculties: ['Faculty of Military Science'],
      aliases: ['Saldanha', 'Military Academy', 'Military Campus'],
    },
    {
      name: 'Worcester Campus',
      location: 'Worcester',
      aliases: ['Worcester'],
    },
  ],

  urlPatterns: {
    faculty: /\/faculty\/[\w-]+|\/fakulteite\/[\w-]+/i,
    programme: /\/programmes?\/(undergraduate|postgraduate)|\/program\/[\w-]+/i,
    campus: /\/campus|stellenbosch|tygerberg|bellville|saldanha|worcester/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculty-list, .faculties',
    programmeList: '.programme-list, .courses-list',
  },

  targets: {
    minFaculties: 10,
    minCourses: 200,
    minCampuses: 5,
  },

  scrapingConfig: {
    maxPages: 120,
    maxDepth: 4,
    timeoutMs: 90000, // SUN site can be slow
    priorityUrls: [
      // Main academic listings
      '/faculties',
      '/faculty',
      // Postgraduate programmes hub
      '/pgstudies/Pages/Postgraduate-programmes.aspx',
      // Prospective students portal
      '/prospective-students/',
      '/prospective-students/undergraduate-applicants/',
      '/prospective-students/postgraduate-applicants/',
      // Academic programmes
      '/programmes',
      '/study',
      '/undergraduate',
      '/postgraduate',
      // Campus info
      '/about/',
      '/about/campuses/',
    ],
  },

  establishedYear: 1918,
  city: 'Stellenbosch',
  province: 'Western Cape',
}
