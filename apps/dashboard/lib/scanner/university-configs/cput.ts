/**
 * Cape Peninsula University of Technology Configuration
 *
 * University of Technology in Western Cape. The only UoT in the province and the
 * largest university with over 32,000 students.
 */

import type { UniversityConfig } from './types'

export const CPUT_CONFIG: UniversityConfig = {
  name: 'Cape Peninsula University of Technology',
  shortName: 'CPUT',
  type: 'university-of-technology',
  domains: ['cput.ac.za', 'www.cput.ac.za'],

  faculties: [
    {
      name: 'Faculty of Applied Sciences',
      slug: 'faculty-of-applied-sciences',
      aliases: ['Applied Sciences', 'Science'],
    },
    {
      name: 'Faculty of Business and Management Sciences',
      slug: 'faculty-of-business-and-management-sciences',
      aliases: ['Business', 'Management Sciences', 'Business and Management'],
    },
    {
      name: 'Faculty of Education and Social Sciences',
      slug: 'faculty-of-education-and-social-sciences',
      aliases: ['Education', 'Social Sciences', 'Education and Social Sciences'],
    },
    {
      name: 'Faculty of Engineering and the Built Environment',
      slug: 'faculty-of-engineering-built-environment',
      aliases: ['Engineering', 'Built Environment', 'Engineering & Built Environment'],
    },
    {
      name: 'Faculty of Informatics and Design',
      slug: 'faculty-of-informatics-and-design',
      aliases: ['Informatics', 'Design', 'IT', 'Information Technology', 'Informatics & Design'],
    },
    {
      name: 'Faculty of Health and Wellness Sciences',
      slug: 'faculty-of-health-wellness-sciences',
      aliases: ['Health Sciences', 'Wellness Sciences', 'Health & Wellness', 'Health'],
    },
  ],

  campuses: [
    {
      name: 'Bellville Campus',
      location: 'Bellville, Western Cape',
      isMain: true,
      aliases: ['Bellville', 'Main Campus'],
    },
    {
      name: 'Cape Town Campus',
      location: 'Cape Town, Western Cape',
      aliases: ['Cape Town', 'City Campus'],
    },
    {
      name: 'Mowbray Campus',
      location: 'Mowbray, Western Cape',
      faculties: ['Faculty of Education and Social Sciences'],
      aliases: ['Mowbray', 'Education Campus'],
    },
    {
      name: 'Wellington Campus',
      location: 'Wellington, Western Cape',
      faculties: ['Faculty of Education and Social Sciences'],
      aliases: ['Wellington'],
    },
    {
      name: 'District Six Campus',
      location: 'District Six, Cape Town',
      aliases: ['District 6', 'District Six'],
    },
    {
      name: 'Granger Bay Campus',
      location: 'Granger Bay, Cape Town',
      aliases: ['Granger Bay', 'Hotel School Campus'],
    },
  ],

  urlPatterns: {
    faculty: /\/facult(y|ies)/i,
    programme: /\/programme|\/courses?|\/qualification/i,
    campus: /\/campus|bellville|mowbray|wellington|granger|district/i,
  },

  selectors: {
    mainContent: 'main, .content, .page-content',
    facultyList: '.faculties, .faculty-list',
    programmeList: '.programmes, .courses, .qualification-list',
  },

  targets: {
    minFaculties: 6,
    minCourses: 200,
    minCampuses: 6,
  },

  scrapingConfig: {
    maxPages: 100,
    maxDepth: 4,
    priorityUrls: [
      '/programmes',
      '/faculties',
      '/qualifications',
    ],
  },

  establishedYear: 2005,
  city: 'Cape Town',
  province: 'Western Cape',
}
