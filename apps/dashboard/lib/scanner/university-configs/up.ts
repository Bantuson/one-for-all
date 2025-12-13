/**
 * University of Pretoria Configuration
 *
 * Traditional research university, one of the largest in South Africa.
 * Test case for scanner bug fix.
 */

import type { UniversityConfig } from './types'

export const UP_CONFIG: UniversityConfig = {
  name: 'University of Pretoria',
  shortName: 'UP',
  type: 'traditional',
  domains: ['up.ac.za', 'www.up.ac.za'],

  faculties: [
    {
      name: 'Faculty of Economic and Management Sciences',
      slug: 'faculty-of-economic-and-management-sciences',
      aliases: ['EMS', 'Economic and Management Sciences', 'Economics', 'Management'],
    },
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education'],
    },
    {
      name: 'Faculty of Engineering, Built Environment and Information Technology',
      slug: 'faculty-of-engineering-built-environment-it',
      aliases: ['EBIT', 'Engineering', 'Built Environment', 'IT', 'Information Technology'],
    },
    {
      name: 'Faculty of Health Sciences',
      slug: 'faculty-of-health-sciences',
      aliases: ['Health Sciences', 'Medicine', 'Medical'],
    },
    {
      name: 'Faculty of Humanities',
      slug: 'faculty-of-humanities',
      aliases: ['Humanities'],
    },
    {
      name: 'Faculty of Law',
      slug: 'faculty-of-law',
      aliases: ['Law'],
    },
    {
      name: 'Faculty of Natural and Agricultural Sciences',
      slug: 'faculty-of-natural-agricultural-sciences',
      aliases: ['NAS', 'Natural Sciences', 'Agricultural Sciences', 'Science'],
    },
    {
      name: 'Faculty of Theology and Religion',
      slug: 'faculty-of-theology-and-religion',
      aliases: ['Theology', 'Religion'],
    },
    {
      name: 'Faculty of Veterinary Science',
      slug: 'faculty-of-veterinary-science',
      aliases: ['Veterinary', 'Vet Science', 'BVSc'],
    },
    {
      name: 'Gordon Institute of Business Science',
      slug: 'gibs',
      aliases: ['GIBS', 'Business Science', 'MBA'],
    },
  ],

  campuses: [
    {
      name: 'Hatfield Campus',
      location: 'Hatfield, Pretoria',
      isMain: true,
      aliases: ['Hatfield', 'Main Campus'],
    },
    {
      name: 'Groenkloof Campus',
      location: 'Groenkloof, Pretoria',
      faculties: ['Faculty of Education'],
      aliases: ['Groenkloof', 'Education Campus'],
    },
    {
      name: 'Prinshof Campus',
      location: 'Prinshof, Pretoria',
      faculties: ['Faculty of Health Sciences'],
      aliases: ['Prinshof', 'Medical Campus', 'Health Sciences Campus'],
    },
    {
      name: 'Onderstepoort Campus',
      location: 'Onderstepoort, Pretoria',
      faculties: ['Faculty of Veterinary Science'],
      aliases: ['Onderstepoort', 'Veterinary Campus', 'OP'],
    },
    {
      name: 'Mamelodi Campus',
      location: 'Mamelodi, Pretoria',
      aliases: ['Mamelodi'],
    },
    {
      name: 'Hillcrest Campus',
      location: 'Hillcrest, Pretoria',
      aliases: ['Hillcrest', 'High Performance Centre', 'HPC', 'Sports Campus'],
    },
    {
      name: 'GIBS Campus',
      location: 'Illovo, Johannesburg',
      faculties: ['Gordon Institute of Business Science'],
      aliases: ['GIBS', 'Illovo Campus', 'Business School Campus'],
    },
  ],

  urlPatterns: {
    faculty: /\/faculty-of-[\w-]+/i,
    programme: /\/programmes?\/(undergraduate|postgraduate)|\/programme\/\d+/i,
    campus: /\/campus|mamelodi|groenkloof|prinshof|onderstepoort|hillcrest|gibs/i,
  },

  selectors: {
    mainContent: 'main, .node-content, .content-wrapper',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .programmes-listing',
  },

  programmeCodePattern: /\b(\d{8})\b/, // UP uses 8-digit programme codes

  establishedYear: 1908,
  city: 'Pretoria',
  province: 'Gauteng',
}
