/**
 * Sol Plaatje University Configuration
 *
 * Comprehensive university established in 2014.
 * First and only university in the Northern Cape province.
 * Located in Kimberley with three campuses (North, Central, South).
 */

import type { UniversityConfig } from './types'

export const SPU_CONFIG: UniversityConfig = {
  name: 'Sol Plaatje University',
  shortName: 'SPU',
  type: 'comprehensive',
  domains: ['spu.ac.za', 'www.spu.ac.za'],

  faculties: [
    {
      name: 'Faculty of Economic and Management Sciences',
      slug: 'faculty-of-economic-and-management-sciences',
      aliases: ['Economic and Management Sciences', 'EMS', 'Economics', 'Management'],
      description: 'Economics, business, and management programs',
    },
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education', 'Teaching', 'Teacher Education'],
      description: 'Teacher education and educational studies',
    },
    {
      name: 'Faculty of Humanities',
      slug: 'faculty-of-humanities',
      aliases: ['Humanities', 'Arts', 'Social Sciences'],
      description: 'Humanities and social sciences disciplines',
    },
    {
      name: 'Faculty of Natural and Applied Sciences',
      slug: 'faculty-of-natural-and-applied-sciences',
      aliases: ['Natural and Applied Sciences', 'Science', 'FNAS', 'Sciences'],
      description: 'Natural sciences, ICT, data science, and applied sciences',
    },
  ],

  campuses: [
    {
      name: 'Central Campus',
      location: 'Kimberley, Northern Cape',
      isMain: true,
      aliases: ['Main Campus', 'Kimberley Central', 'Academic Campus', 'Scanlan Street Campus'],
      faculties: [
        'Faculty of Economic and Management Sciences',
        'Faculty of Education',
        'Faculty of Humanities',
        'Faculty of Natural and Applied Sciences',
      ],
    },
    {
      name: 'North Campus',
      location: 'Kimberley, Northern Cape',
      aliases: ['Northern Campus', 'Administration Campus'],
    },
    {
      name: 'South Campus',
      location: 'Kimberley, Northern Cape',
      aliases: ['Southern Campus', 'Residences Campus', 'Sports Campus'],
    },
  ],

  urlPatterns: {
    faculty: /\/faculty|\/faculties/i,
    programme: /\/programmes?|\/courses?|\/qualifications?/i,
    campus: /\/campus/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  establishedYear: 2014,
  city: 'Kimberley',
  province: 'Northern Cape',
}
