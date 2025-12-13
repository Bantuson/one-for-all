/**
 * Eduvos Configuration
 *
 * Private higher education institution with 12 campuses across South Africa.
 * Priority client - user's alma mater.
 */

import type { UniversityConfig } from './types'

export const EDUVOS_CONFIG: UniversityConfig = {
  name: 'Eduvos',
  shortName: 'Eduvos',
  type: 'private',
  domains: ['eduvos.com', 'www.eduvos.com'],

  faculties: [
    {
      name: 'Faculty of Applied Science',
      slug: 'applied-science',
      aliases: ['Applied Science', 'Applied Sciences'],
    },
    {
      name: 'Faculty of Commerce',
      slug: 'commerce',
      aliases: ['Commerce', 'Business'],
    },
    {
      name: 'Faculty of Law',
      slug: 'law',
      aliases: ['Law'],
    },
    {
      name: 'Faculty of Technology',
      slug: 'technology',
      aliases: ['Technology', 'IT', 'Information Technology'],
    },
    {
      name: 'Faculty of Humanities and Arts',
      slug: 'humanities-arts',
      aliases: ['Humanities', 'Arts', 'Humanities and Arts'],
    },
    {
      name: 'School of Future Technology',
      slug: 'future-technology',
      aliases: ['Future Technology', 'Future Tech'],
    },
    {
      name: 'School of Arts and Design',
      slug: 'arts-design',
      aliases: ['Arts and Design', 'Design'],
    },
    {
      name: 'School of Marketing',
      slug: 'marketing',
      aliases: ['Marketing'],
    },
    {
      name: 'Graduate School of Accounting',
      slug: 'accounting',
      aliases: ['Accounting', 'GSA'],
    },
  ],

  campuses: [
    {
      name: 'Midrand Campus',
      location: 'Midrand, Gauteng',
      isMain: true,
      aliases: ['Midrand'],
    },
    {
      name: 'Pretoria Campus',
      location: 'Menlo Park, Pretoria, Gauteng',
      aliases: ['Pretoria', 'Menlo Park'],
    },
    {
      name: 'Bedfordview Campus',
      location: 'Bedfordview, Gauteng',
      aliases: ['Bedfordview'],
    },
    {
      name: 'Vanderbijlpark Campus',
      location: 'Vanderbijlpark, Gauteng',
      aliases: ['Vanderbijlpark', 'Vaal'],
    },
    {
      name: 'Potchefstroom Campus',
      location: 'Potchefstroom, North West',
      aliases: ['Potchefstroom', 'Potch'],
    },
    {
      name: 'Mbombela Campus',
      location: 'Mbombela, Mpumalanga',
      aliases: ['Mbombela', 'Nelspruit'],
    },
    {
      name: 'Durban Campus',
      location: 'Durban, KwaZulu-Natal',
      aliases: ['Durban'],
    },
    {
      name: 'East London Campus',
      location: 'East London, Eastern Cape',
      aliases: ['East London', 'EL'],
    },
    {
      name: 'Nelson Mandela Bay Campus',
      location: 'Port Elizabeth, Eastern Cape',
      aliases: ['Nelson Mandela Bay', 'Port Elizabeth', 'PE', 'NMB'],
    },
    {
      name: 'Tyger Valley Campus',
      location: 'Bellville, Western Cape',
      aliases: ['Tyger Valley', 'Tygervalley', 'Bellville'],
    },
    {
      name: 'Claremont Campus',
      location: 'Claremont, Cape Town, Western Cape',
      aliases: ['Claremont', 'Mowbray', 'Cape Town'],
    },
    {
      name: 'Bloemfontein Campus',
      location: 'Bloemfontein, Free State',
      aliases: ['Bloemfontein', 'Bloem'],
    },
  ],

  urlPatterns: {
    faculty: /\/facult|\/school/i,
    programme: /\/programme|\/course|\/qualification/i,
    campus: /\/campus/i,
  },

  selectors: {
    mainContent: 'main, .main-content, article',
    facultyList: '.faculties, .faculty-list',
    programmeList: '.programmes, .course-list',
  },

  targets: {
    minFaculties: 9,
    minCourses: 20,
    minCampuses: 12,
  },

  scrapingConfig: {
    maxPages: 40,
    maxDepth: 3,
    priorityUrls: [
      '/programmes',
      '/faculties',
      '/schools',
      '/study-with-us',
    ],
  },

  establishedYear: 2019, // Rebranded from Pearson Institute/CTI/MGI
  city: 'Midrand',
  province: 'Gauteng',
}
