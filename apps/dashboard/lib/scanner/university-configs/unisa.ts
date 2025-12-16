/**
 * University of South Africa Configuration
 *
 * Established in 1873, became world's first dedicated distance education
 * university in 1946. Largest open distance learning institution in Africa.
 * Headquartered in Pretoria with regional centers nationwide.
 */

import type { UniversityConfig } from './types'

export const UNISA_CONFIG: UniversityConfig = {
  name: 'University of South Africa',
  shortName: 'UNISA',
  type: 'comprehensive',
  domains: ['unisa.ac.za', 'www.unisa.ac.za'],

  faculties: [
    {
      name: 'College of Agriculture and Environmental Sciences',
      slug: 'college-of-agriculture-and-environmental-sciences',
      aliases: ['CAES', 'Agriculture', 'Environmental Sciences', 'AgriSciences'],
    },
    {
      name: 'College of Economic and Management Sciences',
      slug: 'college-of-economic-and-management-sciences',
      aliases: ['CEMS', 'Economic and Management Sciences', 'Economics', 'Management', 'Commerce'],
    },
    {
      name: 'College of Education',
      slug: 'college-of-education',
      aliases: ['CEDU', 'Education'],
    },
    {
      name: 'College of Human Sciences',
      slug: 'college-of-human-sciences',
      aliases: ['CHS', 'Human Sciences', 'Humanities'],
    },
    {
      name: 'College of Law',
      slug: 'college-of-law',
      aliases: ['CLAW', 'Law'],
    },
    {
      name: 'College of Science, Engineering and Technology',
      slug: 'college-of-science-engineering-and-technology',
      aliases: ['CSET', 'Science', 'Engineering', 'Technology', 'SET'],
    },
    {
      name: 'College of Graduate Studies',
      slug: 'college-of-graduate-studies',
      aliases: ['Graduate Studies', 'CGS', 'Postgraduate'],
    },
    {
      name: 'Graduate School of Business Leadership',
      slug: 'graduate-school-of-business-leadership',
      aliases: ['SBL', 'Business Leadership', 'Business School', 'MBA'],
    },
  ],

  campuses: [
    {
      name: 'Muckleneuk Campus',
      location: 'Muckleneuk, Pretoria',
      isMain: true,
      aliases: ['Muckleneuk', 'Main Campus', 'Head Office'],
    },
    {
      name: 'Sunnyside Campus',
      location: 'Sunnyside, Pretoria',
      aliases: ['Sunnyside', 'Student Centre'],
    },
    {
      name: 'Science Campus',
      location: 'Florida, Roodepoort',
      aliases: ['Florida Campus', 'Science Campus'],
      faculties: ['College of Science, Engineering and Technology'],
    },
    {
      name: 'Parow Campus',
      location: 'Parow, Cape Town',
      aliases: ['Parow', 'Cape Town Campus'],
    },
    {
      name: 'Durban Regional Centre',
      location: 'Durban',
      aliases: ['Durban', 'Durban Office'],
    },
    {
      name: 'Polokwane Regional Centre',
      location: 'Polokwane',
      aliases: ['Polokwane', 'Limpopo Office'],
    },
    {
      name: 'Johannesburg Regional Centre',
      location: 'Johannesburg',
      aliases: ['Johannesburg', 'Joburg Office', 'JHB'],
    },
    {
      name: 'Ekurhuleni Regional Centre',
      location: 'Ekurhuleni',
      aliases: ['Ekurhuleni', 'East Rand Office'],
    },
  ],

  urlPatterns: {
    faculty: /\/colleges?\/[\w-]+|caes|cems|cedu|chs|claw|cset/i,
    programme: /\/programmes?\/(undergraduate|postgraduate)|\/qualifications/i,
    course: /\/modules?|\/subjects?/i,
  },

  selectors: {
    mainContent: 'main, .main-content, .content',
    facultyList: '.college-list, .colleges',
    programmeList: '.qualification-list, .programmes',
  },

  targets: {
    minFaculties: 8,
    minCourses: 350,
    minCampuses: 8,
  },

  scrapingConfig: {
    maxPages: 200,
    maxDepth: 4,
    timeoutMs: 90000, // UNISA site can be slow
    priorityUrls: [
      // Main college listings (UNISA uses SharePoint-style URLs)
      '/sites/corporate/default/Colleges',
      '/sites/corporate/default/Colleges/Agriculture-Environmental-Sciences',
      '/sites/corporate/default/Colleges/Economic-and-Management-Sciences',
      '/sites/corporate/default/Colleges/Education',
      '/sites/corporate/default/Colleges/Human-Sciences',
      '/sites/corporate/default/Colleges/Law',
      '/sites/corporate/default/Colleges/Science,-Engineering-and-Technology',
      '/sites/corporate/default/Colleges/Graduate-Studies',
      '/sites/corporate/default/Colleges/Graduate-School-of-Business-Leadership',
      // Registration portal
      '/sites/corporate/default/Register-to-study',
      '/sites/corporate/default/Register-to-study/Qualifications',
      // Study portal
      '/sites/corporate/default/Study',
      '/sites/corporate/default/Apply-for-admission',
      // Qualifications
      '/qualifications',
      '/programmes',
    ],
  },

  programmeCodePattern: /\b([A-Z]{3}\d{4}[A-Z]?)\b/, // UNISA uses codes like CTA1501

  establishedYear: 1873,
  city: 'Pretoria',
  province: 'Gauteng',
}
