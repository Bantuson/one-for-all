/**
 * University of Venda Configuration
 *
 * Comprehensive university located in Thohoyandou, Limpopo.
 * Established in 1982 in the scenic Vhembe district.
 * Single campus serving all four faculties.
 */

import type { UniversityConfig } from './types'

export const UNIVEN_CONFIG: UniversityConfig = {
  name: 'University of Venda',
  shortName: 'UNIVEN',
  type: 'comprehensive',
  domains: ['univen.ac.za', 'www.univen.ac.za'],

  faculties: [
    {
      name: 'Faculty of Science, Engineering and Agriculture',
      slug: 'faculty-of-science-engineering-agriculture',
      aliases: [
        'Science, Engineering and Agriculture',
        'Science',
        'Engineering',
        'Agriculture',
        'FSEA',
        'Mathematical and Natural Sciences',
        'Environmental Sciences',
      ],
      description: 'Science, engineering, agriculture, and environmental sciences (merged 2021)',
    },
    {
      name: 'Faculty of Management, Commerce and Law',
      slug: 'faculty-of-management-commerce-law',
      aliases: ['Management, Commerce and Law', 'Management', 'Commerce', 'Law', 'Business', 'FMCL'],
      description: 'Business, management, commerce, and legal studies',
    },
    {
      name: 'Faculty of Humanities, Social Sciences and Education',
      slug: 'faculty-of-humanities-social-sciences-education',
      aliases: [
        'Humanities, Social Sciences and Education',
        'Humanities',
        'Social Sciences',
        'Education',
        'FHSSE',
      ],
      description: 'Humanities, social sciences, and education programs',
    },
    {
      name: 'Faculty of Health Sciences',
      slug: 'faculty-of-health-sciences',
      aliases: ['Health Sciences', 'Medicine', 'Nursing'],
      description: 'Health sciences and medical programs',
    },
  ],

  campuses: [
    {
      name: 'Main Campus',
      location: 'Thohoyandou, Vhembe, Limpopo',
      isMain: true,
      aliases: ['Thohoyandou Campus', 'Thohoyandou', 'UNIVEN Campus'],
      faculties: [
        'Faculty of Science, Engineering and Agriculture',
        'Faculty of Management, Commerce and Law',
        'Faculty of Humanities, Social Sciences and Education',
        'Faculty of Health Sciences',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/faculties?|\/faculty/i,
    programme: /\/programmes?|\/courses?|\/qualifications?/i,
    campus: /\/campus|thohoyandou/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  targets: {
    minFaculties: 4,
    minCourses: 120,
    minCampuses: 1,
  },

  scrapingConfig: {
    maxPages: 70,
    maxDepth: 3,
    priorityUrls: [
      '/programmes',
      '/faculties',
      '/study',
    ],
  },

  establishedYear: 1982,
  city: 'Thohoyandou',
  province: 'Limpopo',
}
