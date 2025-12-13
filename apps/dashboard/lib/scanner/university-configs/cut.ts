/**
 * Central University of Technology Configuration
 *
 * University of Technology in Free State. Established as Technikon Free State in 1981,
 * became a university of technology in 2004.
 */

import type { UniversityConfig } from './types'

export const CUT_CONFIG: UniversityConfig = {
  name: 'Central University of Technology',
  shortName: 'CUT',
  type: 'university-of-technology',
  domains: ['cut.ac.za', 'www.cut.ac.za'],

  faculties: [
    {
      name: 'Faculty of Health and Environmental Sciences',
      slug: 'faculty-of-health-environmental-sciences',
      aliases: ['Health Sciences', 'Environmental Sciences', 'Health & Environmental Sciences'],
    },
    {
      name: 'Faculty of Humanities',
      slug: 'faculty-of-humanities',
      aliases: ['Humanities'],
    },
    {
      name: 'Faculty of Engineering, Built Environment and Information Technology',
      slug: 'faculty-of-engineering-built-environment-it',
      aliases: ['Engineering', 'Built Environment', 'IT', 'Information Technology', 'EBIT'],
    },
    {
      name: 'Faculty of Management Sciences',
      slug: 'faculty-of-management-sciences',
      aliases: ['Management', 'Management Sciences', 'Business'],
    },
  ],

  campuses: [
    {
      name: 'Bloemfontein Campus',
      location: 'Bloemfontein, Free State',
      isMain: true,
      aliases: ['Bloemfontein', 'Main Campus', 'Westdene'],
    },
    {
      name: 'Welkom Campus',
      location: 'Welkom, Free State',
      aliases: ['Welkom'],
    },
  ],

  urlPatterns: {
    faculty: /\/facult(y|ies)/i,
    programme: /\/programme|\/courses?|\/qualification/i,
    campus: /\/campus|bloemfontein|welkom/i,
  },

  selectors: {
    mainContent: 'main, .content, .page-content',
    facultyList: '.faculties, .faculty-list',
    programmeList: '.programmes, .courses, .qualification-list',
  },

  targets: {
    minFaculties: 4,
    minCourses: 100,
    minCampuses: 2,
  },

  scrapingConfig: {
    maxPages: 60,
    maxDepth: 3,
    priorityUrls: [
      '/programmes',
      '/faculties',
      '/qualifications',
    ],
  },

  establishedYear: 1981,
  city: 'Bloemfontein',
  province: 'Free State',
}
