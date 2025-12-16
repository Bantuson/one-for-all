/**
 * Tshwane University of Technology Configuration
 *
 * University of Technology established in 2004 through merger of three technikons.
 * The largest residential higher education institution in South Africa with 60,000+ students.
 * Operates 9 campuses across 4 provinces.
 */

import type { UniversityConfig } from './types'

export const TUT_CONFIG: UniversityConfig = {
  name: 'Tshwane University of Technology',
  shortName: 'TUT',
  type: 'university-of-technology',
  domains: ['tut.ac.za', 'www.tut.ac.za'],

  faculties: [
    {
      name: 'Faculty of The Arts',
      slug: 'faculty-of-arts',
      aliases: ['Arts', 'The Arts'],
    },
    {
      name: 'Faculty of Economics and Finance',
      slug: 'faculty-of-economics-finance',
      aliases: ['Economics', 'Finance', 'Economics & Finance'],
    },
    {
      name: 'Faculty of Engineering and the Built Environment',
      slug: 'faculty-of-engineering-built-environment',
      aliases: ['Engineering', 'Built Environment', 'Engineering & Built Environment'],
    },
    {
      name: 'Faculty of Humanities',
      slug: 'faculty-of-humanities',
      aliases: ['Humanities'],
    },
    {
      name: 'Faculty of Information and Communication Technology',
      slug: 'faculty-of-ict',
      aliases: ['ICT', 'Information Technology', 'IT', 'Communication Technology'],
    },
    {
      name: 'Faculty of Management Sciences',
      slug: 'faculty-of-management-sciences',
      aliases: ['Management', 'Management Sciences', 'Business'],
    },
    {
      name: 'Faculty of Science',
      slug: 'faculty-of-science',
      aliases: ['Science'],
    },
  ],

  campuses: [
    {
      name: 'Pretoria Campus',
      location: 'Pretoria, Gauteng',
      isMain: true,
      aliases: ['Pretoria', 'Main Campus'],
    },
    {
      name: 'Arcadia Campus',
      location: 'Arcadia, Pretoria, Gauteng',
      aliases: ['Arcadia'],
    },
    {
      name: 'Arts Campus',
      location: 'Pretoria, Gauteng',
      faculties: ['Faculty of The Arts'],
      aliases: ['Arts', 'Tshwane Arts Campus'],
    },
    {
      name: 'Soshanguve South Campus',
      location: 'Soshanguve, Gauteng',
      aliases: ['Soshanguve South', 'South Campus', 'Sosh South'],
    },
    {
      name: 'Soshanguve North Campus',
      location: 'Soshanguve, Gauteng',
      aliases: ['Soshanguve North', 'North Campus', 'Sosh North'],
    },
    {
      name: 'Ga-Rankuwa Campus',
      location: 'Ga-Rankuwa, North West',
      aliases: ['Ga-Rankuwa', 'Garankuwa'],
    },
    {
      name: 'eMalahleni Campus',
      location: 'eMalahleni (Witbank), Mpumalanga',
      aliases: ['eMalahleni', 'Witbank', 'Witbank Campus'],
    },
    {
      name: 'Mbombela Campus',
      location: 'Mbombela (Nelspruit), Mpumalanga',
      aliases: ['Mbombela', 'Nelspruit', 'Nelspruit Campus'],
    },
    {
      name: 'Polokwane Campus',
      location: 'Polokwane, Limpopo',
      aliases: ['Polokwane', 'Pietersburg'],
    },
  ],

  urlPatterns: {
    faculty: /\/facult(y|ies)/i,
    programme: /\/programme|\/courses?|\/qualification/i,
    campus: /\/campus|pretoria|arcadia|arts|soshanguve|ga-rankuwa|emalahleni|witbank|mbombela|nelspruit|polokwane/i,
  },

  selectors: {
    mainContent: 'main, .content, .page-content',
    facultyList: '.faculties, .faculty-list',
    programmeList: '.programmes, .courses, .qualification-list',
  },

  targets: {
    minFaculties: 7,
    minCourses: 350,
    minCampuses: 9,
  },

  scrapingConfig: {
    maxPages: 180,
    maxDepth: 4,
    timeoutMs: 90000, // TUT site can be slow
    priorityUrls: [
      // Main faculty listing
      '/faculties/',
      // Faculty-specific programme pages (7 faculties)
      '/faculties/arts/about',
      '/faculties/arts/programmes/programme',
      '/faculties/economics-and-finance/about',
      '/faculties/economics-and-finance/programmes/programme',
      '/faculties/engineering-and-the-built-environment/about',
      '/faculties/engineering-and-the-built-environment/programmes/programme',
      '/faculties/humanities/about',
      '/faculties/humanities/programmes/programme',
      '/faculties/information-and-communication-technology/about',
      '/faculties/information-and-communication-technology/programmes/programme',
      '/faculties/management-sciences/about',
      '/faculties/management-sciences/programmes/programme',
      '/faculties/science/about',
      '/faculties/science/programmes/programme',
      // General programme listings
      '/programmes',
      '/qualifications',
      // Campus information (9 campuses)
      '/other/campuses/',
      '/other/campuses/pretoria-campus/',
      '/other/campuses/arcadia-campus/',
      '/other/campuses/arts-campus/',
      '/other/campuses/soshanguve-south-campus/',
      '/other/campuses/soshanguve-north-campus/',
      '/other/campuses/ga-rankuwa-campus/',
      '/other/campuses/emalahleni-campus/',
      '/other/campuses/mbombela-campus/',
      '/other/campuses/polokwane-campus/',
    ],
  },

  establishedYear: 2004,
  city: 'Pretoria',
  province: 'Gauteng',
}
