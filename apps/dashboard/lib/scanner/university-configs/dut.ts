/**
 * Durban University of Technology Configuration
 *
 * University of Technology in KwaZulu-Natal. Formed in 2002 through merger of ML Sultan
 * and Technikon Natal. Traces roots back to 1907, with over 34,000 students.
 */

import type { UniversityConfig } from './types'

export const DUT_CONFIG: UniversityConfig = {
  name: 'Durban University of Technology',
  shortName: 'DUT',
  type: 'university-of-technology',
  domains: ['dut.ac.za', 'www.dut.ac.za'],

  faculties: [
    {
      name: 'Faculty of Accounting and Informatics',
      slug: 'faculty-of-accounting-informatics',
      aliases: ['Accounting', 'Informatics', 'Accounting & Informatics'],
    },
    {
      name: 'Faculty of Applied Sciences',
      slug: 'faculty-of-applied-sciences',
      aliases: ['Applied Sciences', 'Science'],
    },
    {
      name: 'Faculty of Arts and Design',
      slug: 'faculty-of-arts-design',
      aliases: ['Arts', 'Design', 'Arts & Design'],
    },
    {
      name: 'Faculty of Engineering and the Built Environment',
      slug: 'faculty-of-engineering-built-environment',
      aliases: ['Engineering', 'Built Environment', 'Engineering & Built Environment'],
    },
    {
      name: 'Faculty of Health Sciences',
      slug: 'faculty-of-health-sciences',
      aliases: ['Health Sciences', 'Health', 'Medical'],
    },
    {
      name: 'Faculty of Management Sciences',
      slug: 'faculty-of-management-sciences',
      aliases: ['Management', 'Management Sciences', 'Business'],
    },
  ],

  campuses: [
    {
      name: 'Steve Biko Campus',
      location: 'Durban, KwaZulu-Natal',
      isMain: true,
      aliases: ['Steve Biko', 'Biko Campus'],
    },
    {
      name: 'ML Sultan Campus',
      location: 'Durban, KwaZulu-Natal',
      aliases: ['ML Sultan', 'Sultan', 'M.L. Sultan'],
    },
    {
      name: 'Ritson Campus',
      location: 'Durban, KwaZulu-Natal',
      aliases: ['Ritson'],
    },
    {
      name: 'City Campus',
      location: 'Durban, KwaZulu-Natal',
      aliases: ['City', 'Durban City'],
    },
    {
      name: 'Brickfield Campus',
      location: 'Durban, KwaZulu-Natal',
      aliases: ['Brickfield'],
    },
    {
      name: 'Indumiso Campus',
      location: 'Pietermaritzburg, KwaZulu-Natal',
      aliases: ['Indumiso', 'PMB Campus'],
    },
    {
      name: 'Riverside Campus',
      location: 'Pietermaritzburg, KwaZulu-Natal',
      aliases: ['Riverside', 'PMB Riverside'],
    },
  ],

  urlPatterns: {
    faculty: /\/facult(y|ies)/i,
    programme: /\/programme|\/courses?|\/qualification/i,
    campus: /\/campus|steve-biko|ml-sultan|ritson|brickfield|indumiso|riverside/i,
  },

  selectors: {
    mainContent: 'main, .content, .page-content',
    facultyList: '.faculties, .faculty-list',
    programmeList: '.programmes, .courses, .qualification-list',
  },

  targets: {
    minFaculties: 6,
    minCourses: 200,
    minCampuses: 7,
  },

  scrapingConfig: {
    maxPages: 110,
    maxDepth: 4,
    priorityUrls: [
      '/programmes',
      '/faculties',
      '/qualifications',
    ],
  },

  establishedYear: 2002,
  city: 'Durban',
  province: 'KwaZulu-Natal',
}
