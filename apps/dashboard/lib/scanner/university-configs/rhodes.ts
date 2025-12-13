/**
 * Rhodes University Configuration
 *
 * Traditional research university established in 1904.
 * Single campus located in Makhanda (formerly Grahamstown).
 * Known for high staff-to-student ratio and academic excellence.
 */

import type { UniversityConfig } from './types'

export const RHODES_CONFIG: UniversityConfig = {
  name: 'Rhodes University',
  shortName: 'Rhodes',
  type: 'traditional',
  domains: ['ru.ac.za', 'www.ru.ac.za'],

  faculties: [
    {
      name: 'Faculty of Commerce',
      slug: 'faculty-of-commerce',
      aliases: ['Commerce', 'Business', 'Economics', 'Management'],
      description: 'Commerce, business, and economic sciences',
    },
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education', 'Teaching'],
      description: 'Teacher education and educational studies',
    },
    {
      name: 'Faculty of Humanities',
      slug: 'faculty-of-humanities',
      aliases: ['Humanities', 'Social Sciences', 'Arts'],
      description: 'Humanities and social sciences disciplines',
    },
    {
      name: 'Faculty of Law',
      slug: 'faculty-of-law',
      aliases: ['Law', 'Legal Studies'],
      description: 'Legal studies and law programs',
    },
    {
      name: 'Faculty of Pharmacy',
      slug: 'faculty-of-pharmacy',
      aliases: ['Pharmacy', 'Pharmaceutical Sciences'],
      description: 'Pharmacy and pharmaceutical sciences',
    },
    {
      name: 'Faculty of Science',
      slug: 'faculty-of-science',
      aliases: ['Science', 'Natural Sciences'],
      description: 'Natural and applied sciences',
    },
  ],

  campuses: [
    {
      name: 'Main Campus',
      location: 'Makhanda (Grahamstown)',
      isMain: true,
      aliases: ['Rhodes Campus', 'Makhanda', 'Grahamstown'],
      faculties: [
        'Faculty of Commerce',
        'Faculty of Education',
        'Faculty of Humanities',
        'Faculty of Law',
        'Faculty of Pharmacy',
        'Faculty of Science',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/faculty/i,
    programme: /\/programmes?|\/courses?|\/qualifications?/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  targets: {
    minFaculties: 6,
    minCourses: 100,
    minCampuses: 1,
  },

  scrapingConfig: {
    maxPages: 60,
    maxDepth: 3,
    priorityUrls: [
      '/programmes',
      '/faculties',
      '/study',
    ],
  },

  establishedYear: 1904,
  city: 'Makhanda',
  province: 'Eastern Cape',
}
