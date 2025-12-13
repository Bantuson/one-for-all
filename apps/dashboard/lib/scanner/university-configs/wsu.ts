/**
 * Walter Sisulu University Configuration
 *
 * Comprehensive university formed in 2005 through merger of
 * Border Technikon, Eastern Cape Technikon, and University of Transkei.
 * Four campuses across Eastern Cape serving approximately 30,000 students.
 */

import type { UniversityConfig } from './types'

export const WSU_CONFIG: UniversityConfig = {
  name: 'Walter Sisulu University',
  shortName: 'WSU',
  type: 'comprehensive',
  domains: ['wsu.ac.za', 'www.wsu.ac.za'],

  faculties: [
    {
      name: 'Faculty of Engineering, Built Environment and Information Technology',
      slug: 'faculty-of-engineering-built-environment-it',
      aliases: [
        'Engineering, Built Environment and Information Technology',
        'Engineering',
        'Built Environment',
        'Information Technology',
        'IT',
        'FEBIT',
      ],
      description: 'Engineering, architecture, and information technology programs',
    },
    {
      name: 'Faculty of Management and Public Administration Sciences',
      slug: 'faculty-of-management-public-administration',
      aliases: [
        'Management and Public Administration Sciences',
        'Management',
        'Public Administration',
        'FMPAS',
      ],
      description: 'Management and public administration programs',
    },
    {
      name: 'Faculty of Economic and Financial Sciences',
      slug: 'faculty-of-economic-financial-sciences',
      aliases: ['Economic and Financial Sciences', 'Economics', 'Finance', 'Accounting', 'FEFS'],
      description: 'Economics, finance, and accounting programs',
    },
    {
      name: 'Faculty of Law, Humanities and Social Sciences',
      slug: 'faculty-of-law-humanities-social-sciences',
      aliases: ['Law, Humanities and Social Sciences', 'Law', 'Humanities', 'Social Sciences', 'FLHSS'],
      description: 'Legal studies, humanities, and social sciences',
    },
    {
      name: 'Faculty of Medicine and Health Sciences',
      slug: 'faculty-of-medicine-health-sciences',
      aliases: ['Medicine and Health Sciences', 'Medicine', 'Health Sciences', 'Nursing', 'FMHS'],
      description: 'Medical and health sciences programs',
    },
    {
      name: 'Faculty of Natural Sciences',
      slug: 'faculty-of-natural-sciences',
      aliases: ['Natural Sciences', 'Science', 'Chemistry', 'Mathematics', 'Life Sciences', 'FNS'],
      description: 'Natural sciences including chemistry, mathematics, and life sciences',
    },
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education', 'Teacher Education'],
      description: 'Teacher education and educational studies',
    },
  ],

  campuses: [
    {
      name: 'Mthatha Campus',
      location: 'Mthatha, Eastern Cape',
      isMain: true,
      aliases: ['Mthatha', 'Umtata', 'Nelson Mandela Drive Campus'],
      faculties: [
        'Faculty of Education',
        'Faculty of Medicine and Health Sciences',
        'Faculty of Natural Sciences',
        'Faculty of Law, Humanities and Social Sciences',
      ],
    },
    {
      name: 'Butterworth Campus',
      location: 'Butterworth, Eastern Cape',
      aliases: ['Butterworth', 'Ibika Campus', 'IBIKA'],
      faculties: [
        'Faculty of Management and Public Administration Sciences',
        'Faculty of Economic and Financial Sciences',
      ],
    },
    {
      name: 'Buffalo City Campus',
      location: 'East London, Eastern Cape',
      aliases: [
        'Buffalo City',
        'East London',
        'Potsdam',
        'College Street',
        'Cambridge Street',
        'Chiselhurst',
        'Heritage Building',
      ],
      faculties: [
        'Faculty of Engineering, Built Environment and Information Technology',
        'Faculty of Management and Public Administration Sciences',
        'Faculty of Medicine and Health Sciences',
        'Faculty of Natural Sciences',
      ],
    },
    {
      name: 'Komani Campus',
      location: 'Queenstown, Eastern Cape',
      aliases: ['Komani', 'Queenstown'],
      faculties: [
        'Faculty of Education',
        'Faculty of Management and Public Administration Sciences',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/faculties?|\/faculty/i,
    programme: /\/programmes?|\/courses?|\/qualifications?/i,
    campus: /\/campus|mthatha|butterworth|buffalo-city|east-london|komani|queenstown/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  establishedYear: 2005,
  city: 'Mthatha',
  province: 'Eastern Cape',
}
