/**
 * University of Fort Hare Configuration
 *
 * Traditional research university established in 1916.
 * Historic institution located across three campuses in Eastern Cape.
 * Known for producing notable African leaders and scholars.
 */

import type { UniversityConfig } from './types'

export const UFH_CONFIG: UniversityConfig = {
  name: 'University of Fort Hare',
  shortName: 'UFH',
  type: 'traditional',
  domains: ['ufh.ac.za', 'www.ufh.ac.za'],

  faculties: [
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education', 'Teacher Education'],
      description: 'Teacher education and educational studies',
    },
    {
      name: 'Faculty of Law',
      slug: 'faculty-of-law',
      aliases: ['Law', 'Legal Studies', 'Nelson R Mandela School of Law'],
      description: 'Legal studies and law programs',
    },
    {
      name: 'Faculty of Management and Commerce',
      slug: 'faculty-of-management-commerce',
      aliases: ['Management and Commerce', 'Management', 'Commerce', 'Business', 'Economics'],
      description: 'Business, management, and commerce programs',
    },
    {
      name: 'Faculty of Science and Agriculture',
      slug: 'faculty-of-science-agriculture',
      aliases: ['Science and Agriculture', 'Science', 'Agriculture', 'Natural Sciences'],
      description: 'Science and agricultural programs',
    },
    {
      name: 'Faculty of Social Sciences and Humanities',
      slug: 'faculty-of-social-sciences-humanities',
      aliases: ['Social Sciences and Humanities', 'Social Sciences', 'Humanities', 'Arts'],
      description: 'Social sciences and humanities disciplines',
    },
  ],

  campuses: [
    {
      name: 'Alice Campus',
      location: 'Alice, Eastern Cape',
      isMain: true,
      aliases: ['Alice', 'Main Campus', 'Fort Hare Campus'],
      faculties: [
        'Faculty of Education',
        'Faculty of Law',
        'Faculty of Management and Commerce',
        'Faculty of Science and Agriculture',
        'Faculty of Social Sciences and Humanities',
      ],
    },
    {
      name: 'East London Campus',
      location: 'East London, Eastern Cape',
      aliases: ['East London', 'EL Campus'],
      faculties: [
        'Faculty of Education',
        'Faculty of Management and Commerce',
        'Faculty of Social Sciences and Humanities',
      ],
    },
    {
      name: 'Bhisho Campus',
      location: 'Bhisho, Eastern Cape',
      aliases: ['Bhisho', 'King Williams Town'],
      faculties: [
        'Faculty of Law',
        'Faculty of Management and Commerce',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/faculty|\/faculties/i,
    programme: /\/programmes?|\/courses?|\/qualifications?/i,
    campus: /\/campus|alice|east-london|bhisho/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  targets: {
    minFaculties: 5,
    minCourses: 100,
    minCampuses: 3,
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

  establishedYear: 1916,
  city: 'Alice',
  province: 'Eastern Cape',
}
