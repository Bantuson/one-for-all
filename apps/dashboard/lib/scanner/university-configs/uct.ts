/**
 * University of Cape Town Configuration
 *
 * South Africa's oldest university (founded 1829, university status 1918).
 * Premier research university located in Cape Town.
 */

import type { UniversityConfig } from './types'

export const UCT_CONFIG: UniversityConfig = {
  name: 'University of Cape Town',
  shortName: 'UCT',
  type: 'traditional',
  domains: ['uct.ac.za', 'www.uct.ac.za'],

  faculties: [
    {
      name: 'Faculty of Commerce',
      slug: 'faculty-of-commerce',
      aliases: ['Commerce', 'Business'],
    },
    {
      name: 'Faculty of Engineering & the Built Environment',
      slug: 'faculty-of-engineering-built-environment',
      aliases: ['EBE', 'Engineering', 'Built Environment', 'Architecture'],
    },
    {
      name: 'Faculty of Health Sciences',
      slug: 'faculty-of-health-sciences',
      aliases: ['Health Sciences', 'Medicine', 'Medical'],
    },
    {
      name: 'Faculty of Humanities',
      slug: 'faculty-of-humanities',
      aliases: ['Humanities', 'Arts', 'Social Sciences'],
    },
    {
      name: 'Faculty of Law',
      slug: 'faculty-of-law',
      aliases: ['Law'],
    },
    {
      name: 'Faculty of Science',
      slug: 'faculty-of-science',
      aliases: ['Science', 'Natural Sciences'],
    },
    {
      name: 'Graduate School of Business',
      slug: 'graduate-school-of-business',
      aliases: ['GSB', 'UCT GSB', 'Business School', 'MBA'],
    },
  ],

  campuses: [
    {
      name: 'Upper Campus',
      location: 'Rondebosch, Cape Town',
      isMain: true,
      faculties: [
        'Faculty of Science',
        'Faculty of Engineering & the Built Environment',
        'Faculty of Commerce',
        'Faculty of Humanities',
      ],
      aliases: ['Upper', 'Main Campus', 'Rondebosch Campus'],
    },
    {
      name: 'Middle Campus',
      location: 'Rondebosch, Cape Town',
      faculties: ['Faculty of Law'],
      aliases: ['Middle'],
    },
    {
      name: 'Lower Campus',
      location: 'Rosebank, Cape Town',
      aliases: ['Lower'],
    },
    {
      name: 'Health Sciences Campus',
      location: 'Observatory, Cape Town',
      faculties: ['Faculty of Health Sciences'],
      aliases: ['Medical Campus', 'Observatory Campus', 'Groote Schuur'],
    },
    {
      name: 'Hiddingh Campus',
      location: 'Gardens, Cape Town',
      aliases: ['Hiddingh', 'Fine Arts Campus'],
    },
    {
      name: 'Breakwater Campus',
      location: 'V&A Waterfront, Cape Town',
      faculties: ['Graduate School of Business'],
      aliases: ['Waterfront Campus', 'GSB Campus', 'V&A Campus'],
    },
  ],

  urlPatterns: {
    faculty: /\/faculties?\/[\w-]+/i,
    programme: /\/programmes?\/(undergraduate|postgraduate)|\/study\/[\w-]+/i,
    campus: /\/campus|rondebosch|observatory|hiddingh|waterfront|breakwater/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculty-list, .faculties',
    programmeList: '.programme-list, .courses',
  },

  establishedYear: 1829,
  city: 'Cape Town',
  province: 'Western Cape',
}
