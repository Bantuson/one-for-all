/**
 * University of Zululand Configuration
 *
 * Comprehensive university located in KwaZulu-Natal.
 * Main campus in KwaDlangezwa with satellite campus in Richards Bay.
 * Offers approximately 252 accredited programs across four faculties.
 */

import type { UniversityConfig } from './types'

export const UNIZULU_CONFIG: UniversityConfig = {
  name: 'University of Zululand',
  shortName: 'UNIZULU',
  type: 'comprehensive',
  domains: ['unizulu.ac.za', 'www.unizulu.ac.za'],

  faculties: [
    {
      name: 'Faculty of Arts',
      slug: 'faculty-of-arts',
      aliases: ['Arts', 'Humanities', 'Social Sciences', 'Humanities and Social Sciences'],
      description: 'Humanities and social sciences disciplines',
    },
    {
      name: 'Faculty of Commerce, Administration and Law',
      slug: 'faculty-of-commerce-administration-law',
      aliases: ['Commerce, Administration and Law', 'Commerce', 'Law', 'Administration', 'Business', 'FCAL'],
      description: 'Commerce, business administration, and legal studies',
    },
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education', 'Teacher Education'],
      description: 'Teacher education and educational studies',
    },
    {
      name: 'Faculty of Science, Agriculture and Engineering',
      slug: 'faculty-of-science-agriculture-engineering',
      aliases: [
        'Science, Agriculture and Engineering',
        'Science',
        'Agriculture',
        'Engineering',
        'FSAE',
        'Natural Sciences',
      ],
      description: 'Science, agriculture, and engineering programs',
    },
  ],

  campuses: [
    {
      name: 'KwaDlangezwa Campus',
      location: 'KwaDlangezwa, KwaZulu-Natal',
      isMain: true,
      aliases: ['KwaDlangezwa', 'Main Campus', 'KZN Campus'],
      faculties: [
        'Faculty of Arts',
        'Faculty of Commerce, Administration and Law',
        'Faculty of Education',
        'Faculty of Science, Agriculture and Engineering',
      ],
    },
    {
      name: 'Richards Bay Campus',
      location: 'Richards Bay, KwaZulu-Natal',
      aliases: ['Richards Bay', 'RB Campus'],
      faculties: [
        'Faculty of Commerce, Administration and Law',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/faculty|\/faculties/i,
    programme: /\/programmes?|\/courses?|\/qualifications?/i,
    campus: /\/campus|kwadlangezwa|richards-bay/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  establishedYear: 1960,
  city: 'KwaDlangezwa',
  province: 'KwaZulu-Natal',
}
