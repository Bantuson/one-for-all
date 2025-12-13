/**
 * University of Limpopo Configuration
 *
 * Comprehensive university located in Mankweng, Limpopo.
 * Formed in 2005 through merger of University of the North and MEDUNSA.
 * Main Turfloop campus following 2015 split (MEDUNSA became Sefako Makgatho Health Sciences University).
 */

import type { UniversityConfig } from './types'

export const UL_CONFIG: UniversityConfig = {
  name: 'University of Limpopo',
  shortName: 'UL',
  type: 'comprehensive',
  domains: ['ul.ac.za', 'www.ul.ac.za'],

  faculties: [
    {
      name: 'Faculty of Health Sciences',
      slug: 'faculty-of-health-sciences',
      aliases: ['Health Sciences', 'Medicine', 'Nursing', 'Pharmacy'],
      description: 'Medical, nursing, pharmacy, and health sciences programs',
    },
    {
      name: 'Faculty of Humanities',
      slug: 'faculty-of-humanities',
      aliases: ['Humanities', 'Social Sciences', 'Arts'],
      description: 'Humanities and social sciences disciplines',
    },
    {
      name: 'Faculty of Science and Agriculture',
      slug: 'faculty-of-science-and-agriculture',
      aliases: ['Science and Agriculture', 'Science', 'Agriculture', 'Natural Sciences'],
      description: 'Natural sciences and agricultural programs',
    },
    {
      name: 'Faculty of Management and Law',
      slug: 'faculty-of-management-and-law',
      aliases: ['Management and Law', 'Management', 'Law', 'Business', 'Commerce'],
      description: 'Business, management, and legal studies',
    },
  ],

  campuses: [
    {
      name: 'Turfloop Campus',
      location: 'Mankweng, Polokwane',
      isMain: true,
      aliases: ['Turfloop', 'Main Campus', 'Mankweng Campus'],
      faculties: [
        'Faculty of Health Sciences',
        'Faculty of Humanities',
        'Faculty of Science and Agriculture',
        'Faculty of Management and Law',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/faculty|\/faculties/i,
    programme: /\/programmes?|\/courses?|\/qualifications?/i,
    campus: /\/campus|turfloop|mankweng/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  targets: {
    minFaculties: 4,
    minCourses: 150,
    minCampuses: 1,
  },

  scrapingConfig: {
    maxPages: 80,
    maxDepth: 3,
    priorityUrls: [
      '/programmes',
      '/faculties',
      '/study',
    ],
  },

  establishedYear: 2005,
  city: 'Polokwane',
  province: 'Limpopo',
}
