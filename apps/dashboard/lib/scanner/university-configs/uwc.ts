/**
 * University of the Western Cape Configuration
 *
 * Public research university established in 1959, located in Bellville.
 * Known for legacy of social justice, community engagement, and graduate employability.
 * Single main campus with over 23,000 students across seven faculties.
 */

import type { UniversityConfig } from './types'

export const UWC_CONFIG: UniversityConfig = {
  name: 'University of the Western Cape',
  shortName: 'UWC',
  type: 'traditional',
  domains: ['uwc.ac.za', 'www.uwc.ac.za'],

  faculties: [
    {
      name: 'Faculty of Arts and Humanities',
      slug: 'faculty-of-arts-and-humanities',
      aliases: ['Arts', 'Humanities', 'Arts and Humanities'],
    },
    {
      name: 'Faculty of Community and Health Sciences',
      slug: 'faculty-of-community-and-health-sciences',
      aliases: ['CHS', 'Community and Health Sciences', 'Health Sciences'],
    },
    {
      name: 'Faculty of Dentistry',
      slug: 'faculty-of-dentistry',
      aliases: ['Dentistry', 'Dental Sciences'],
    },
    {
      name: 'Faculty of Economic and Management Sciences',
      slug: 'faculty-of-economic-and-management-sciences',
      aliases: ['EMS', 'Economic and Management Sciences', 'Economics', 'Management', 'Commerce'],
    },
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education'],
    },
    {
      name: 'Faculty of Law',
      slug: 'faculty-of-law',
      aliases: ['Law'],
    },
    {
      name: 'Faculty of Natural Sciences',
      slug: 'faculty-of-natural-sciences',
      aliases: ['Natural Sciences', 'Science'],
    },
  ],

  campuses: [
    {
      name: 'Main Campus',
      location: 'Bellville, Cape Town',
      isMain: true,
      aliases: ['Bellville Campus', 'Bellville', 'Main Campus'],
    },
    {
      name: 'Community and Health Sciences Bellville Campus',
      location: 'Bellville CBD, Cape Town',
      aliases: ['CHS Bellville Campus', 'Bellville CBD Campus'],
      faculties: ['Faculty of Community and Health Sciences'],
    },
  ],

  urlPatterns: {
    faculty: /\/faculty|faculties\/[\w-]+/i,
    programme: /\/programmes?\/(undergraduate|postgraduate)|\/study/i,
    campus: /\/campus|bellville/i,
  },

  selectors: {
    mainContent: 'main, .main-content, .content-area',
    facultyList: '.faculty-list, .faculties',
    programmeList: '.programme-list, .programs',
  },

  establishedYear: 1959,
  city: 'Cape Town',
  province: 'Western Cape',
}
