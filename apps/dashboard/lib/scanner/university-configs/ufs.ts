/**
 * University of the Free State Configuration
 *
 * Traditional research university established in 1904.
 * One of the oldest institutions in South Africa.
 * Three campuses across Free State province.
 */

import type { UniversityConfig } from './types'

export const UFS_CONFIG: UniversityConfig = {
  name: 'University of the Free State',
  shortName: 'UFS',
  type: 'traditional',
  domains: ['ufs.ac.za', 'www.ufs.ac.za'],

  faculties: [
    {
      name: 'Faculty of Economic and Management Sciences',
      slug: 'faculty-of-economic-management-sciences',
      aliases: ['EMS', 'Economic Sciences', 'Management Sciences', 'Business', 'Commerce'],
      description: 'Economics, business, and management programs',
    },
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education', 'Teaching'],
      description: 'Teacher education and educational studies',
    },
    {
      name: 'Faculty of Health Sciences',
      slug: 'faculty-of-health-sciences',
      aliases: ['Health Sciences', 'Medicine', 'Medical'],
      description: 'Medical and health sciences programs',
    },
    {
      name: 'Faculty of Law',
      slug: 'faculty-of-law',
      aliases: ['Law', 'Legal Studies'],
      description: 'Legal studies and law programs',
    },
    {
      name: 'Faculty of Natural and Agricultural Sciences',
      slug: 'faculty-of-natural-agricultural-sciences',
      aliases: ['NAS', 'Natural Sciences', 'Agricultural Sciences', 'Science', 'Agriculture'],
      description: 'Natural and agricultural sciences',
    },
    {
      name: 'Faculty of the Humanities',
      slug: 'faculty-of-the-humanities',
      aliases: ['Humanities', 'Social Sciences', 'Arts'],
      description: 'Humanities and social sciences',
    },
    {
      name: 'Faculty of Theology and Religion',
      slug: 'faculty-of-theology-religion',
      aliases: ['Theology', 'Religion', 'Theological Studies'],
      description: 'Theology and religious studies',
    },
  ],

  campuses: [
    {
      name: 'Bloemfontein Campus',
      location: 'Bloemfontein',
      isMain: true,
      aliases: ['Main Campus', 'Bloemfontein', 'BFN'],
      faculties: [
        'Faculty of Economic and Management Sciences',
        'Faculty of Education',
        'Faculty of Health Sciences',
        'Faculty of Law',
        'Faculty of Natural and Agricultural Sciences',
        'Faculty of the Humanities',
        'Faculty of Theology and Religion',
      ],
    },
    {
      name: 'South Campus',
      location: 'Bloemfontein',
      aliases: ['South', 'South Campus BFN'],
      faculties: [
        'Faculty of Education',
        'Faculty of Economic and Management Sciences',
      ],
    },
    {
      name: 'Qwaqwa Campus',
      location: 'Phuthaditjhaba',
      aliases: ['QwaQwa', 'QQ', 'Phuthaditjhaba Campus'],
      faculties: [
        'Faculty of Education',
        'Faculty of the Humanities',
        'Faculty of Economic and Management Sciences',
        'Faculty of Natural and Agricultural Sciences',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/faculty/i,
    programme: /\/programmes?|\/courses?/i,
    campus: /\/campus|bloemfontein|qwaqwa|south-campus/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  targets: {
    minFaculties: 7,
    minCourses: 150,
    minCampuses: 3,
  },

  scrapingConfig: {
    maxPages: 80,
    maxDepth: 3,
    priorityUrls: [
      '/programmes',
      '/faculties',
      '/study-at-the-ufs',
    ],
  },

  establishedYear: 1904,
  city: 'Bloemfontein',
  province: 'Free State',
}
