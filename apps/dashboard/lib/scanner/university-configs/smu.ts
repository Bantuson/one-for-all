/**
 * Sefako Makgatho Health Sciences University Configuration
 *
 * Specialized health sciences university established in 2014 (formerly MEDUNSA).
 * Only dedicated health sciences university in Southern Africa.
 * Located in Ga-Rankuwa, north of Pretoria.
 */

import type { UniversityConfig } from './types'

export const SMU_CONFIG: UniversityConfig = {
  name: 'Sefako Makgatho Health Sciences University',
  shortName: 'SMU',
  type: 'traditional',
  domains: ['smu.ac.za', 'www.smu.ac.za'],

  faculties: [
    {
      name: 'School of Medicine',
      slug: 'school-of-medicine',
      aliases: ['Medicine', 'Medical School', 'MBChB'],
      description: 'Medical education and clinical training',
    },
    {
      name: 'School of Health Care Sciences',
      slug: 'school-of-health-care-sciences',
      aliases: ['Health Care Sciences', 'Healthcare Sciences', 'Allied Health'],
      description: 'Nursing, occupational therapy, physiotherapy, and related health sciences',
    },
    {
      name: 'School of Pharmacy',
      slug: 'school-of-pharmacy',
      aliases: ['Pharmacy', 'Pharmaceutical Sciences'],
      description: 'Pharmacy and pharmaceutical sciences',
    },
    {
      name: 'School of Oral Health Sciences',
      slug: 'school-of-oral-health-sciences',
      aliases: ['Oral Health', 'Dentistry', 'Dental School'],
      description: 'Dentistry and oral health programs',
    },
    {
      name: 'School of Science and Technology',
      slug: 'school-of-science-and-technology',
      aliases: ['Science and Technology', 'Science & Technology', 'SciTech'],
      description: 'Supporting sciences for health sciences education',
    },
  ],

  campuses: [
    {
      name: 'Ga-Rankuwa Campus',
      location: 'Ga-Rankuwa, Gauteng',
      isMain: true,
      aliases: ['Main Campus', 'Ga-Rankuwa', 'MEDUNSA Campus'],
      faculties: [
        'School of Medicine',
        'School of Health Care Sciences',
        'School of Pharmacy',
        'School of Oral Health Sciences',
        'School of Science and Technology',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/school|\/faculties?/i,
    programme: /\/programmes?|\/courses?|\/qualifications?/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.schools-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  targets: {
    minFaculties: 5,
    minCourses: 50,
    minCampuses: 1,
  },

  scrapingConfig: {
    maxPages: 40,
    maxDepth: 3,
    priorityUrls: [
      '/programmes',
      '/schools',
      '/study',
    ],
  },

  establishedYear: 2014,
  city: 'Ga-Rankuwa',
  province: 'Gauteng',
}
