/**
 * University of Johannesburg Configuration
 *
 * Comprehensive university established in 2005 from merger of
 * Rand Afrikaans University, Technikon Witwatersrand, and
 * Soweto and East Rand campuses of Vista University.
 * Four campuses in Johannesburg metropolitan area.
 */

import type { UniversityConfig } from './types'

export const UJ_CONFIG: UniversityConfig = {
  name: 'University of Johannesburg',
  shortName: 'UJ',
  type: 'comprehensive',
  domains: ['uj.ac.za', 'www.uj.ac.za'],

  faculties: [
    {
      name: 'Faculty of Art, Design and Architecture',
      slug: 'faculty-of-art-design-architecture',
      aliases: ['FADA', 'Art', 'Design', 'Architecture'],
      description: 'Creative arts, design, and architecture programs',
    },
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education', 'Teaching'],
      description: 'Teacher education and educational studies',
    },
    {
      name: 'Faculty of Engineering and the Built Environment',
      slug: 'faculty-of-engineering-built-environment',
      aliases: ['FEBE', 'Engineering', 'Built Environment'],
      description: 'Engineering and built environment disciplines',
    },
    {
      name: 'Faculty of Health Sciences',
      slug: 'faculty-of-health-sciences',
      aliases: ['Health Sciences', 'Health', 'Medical'],
      description: 'Health sciences and medical programs',
    },
    {
      name: 'Faculty of Humanities',
      slug: 'faculty-of-humanities',
      aliases: ['Humanities', 'Social Sciences'],
      description: 'Humanities and social sciences',
    },
    {
      name: 'Faculty of Law',
      slug: 'faculty-of-law',
      aliases: ['Law', 'Legal Studies'],
      description: 'Legal studies and law programs',
    },
    {
      name: 'Faculty of Science',
      slug: 'faculty-of-science',
      aliases: ['Science', 'Natural Sciences'],
      description: 'Natural and applied sciences',
    },
    {
      name: 'College of Business and Economics',
      slug: 'college-of-business-economics',
      aliases: ['CBE', 'Business', 'Economics', 'Commerce', 'Johannesburg Business School', 'JBS'],
      description: 'Business, economics, and management programs',
    },
  ],

  campuses: [
    {
      name: 'Auckland Park Kingsway Campus',
      location: 'Auckland Park, Johannesburg',
      isMain: true,
      aliases: ['APK', 'Auckland Park Kingsway', 'Kingsway', 'Main Campus'],
      faculties: [
        'Faculty of Humanities',
        'Faculty of Science',
        'Faculty of Education',
        'College of Business and Economics',
      ],
    },
    {
      name: 'Auckland Park Bunting Road Campus',
      location: 'Auckland Park, Johannesburg',
      aliases: ['APB', 'Auckland Park Bunting', 'Bunting Road'],
      faculties: [
        'Faculty of Art, Design and Architecture',
        'Faculty of Engineering and the Built Environment',
      ],
    },
    {
      name: 'Doornfontein Campus',
      location: 'Doornfontein, Johannesburg',
      aliases: ['DFC', 'Doornfontein'],
      faculties: [
        'Faculty of Health Sciences',
        'Faculty of Art, Design and Architecture',
      ],
    },
    {
      name: 'Soweto Campus',
      location: 'Soweto, Johannesburg',
      aliases: ['SWC', 'Soweto'],
      faculties: [
        'Faculty of Education',
        'Faculty of Humanities',
        'Faculty of Science',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/faculty|\/college/i,
    programme: /\/programmes?|\/courses?/i,
    campus: /\/campus|apk|apb|doornfontein|soweto|auckland|bunting/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  targets: {
    minFaculties: 8,
    minCourses: 300,
    minCampuses: 4,
  },

  scrapingConfig: {
    maxPages: 140,
    maxDepth: 4,
    timeoutMs: 90000, // UJ site can be slow
    priorityUrls: [
      // Main faculty listing
      '/faculties/',
      // Faculty-specific programme pages
      '/faculties/art-design-architecture/courses-and-programmes/',
      '/faculties/education/courses-and-programmes/',
      '/faculties/engineering-and-the-built-environment/courses-and-programmes/',
      '/faculties/health-sciences/courses-and-programmes/',
      '/faculties/humanities/courses-and-programmes/',
      '/faculties/law/courses-and-programmes/',
      '/faculties/science/courses-and-programmes/',
      '/faculties/college-of-business-and-economics/courses-and-programmes/',
      // Programme discovery
      '/programmes',
      '/study',
      '/undergraduate',
      '/postgraduate',
      // Campus info
      '/about/campuses/',
    ],
  },

  establishedYear: 2005,
  city: 'Johannesburg',
  province: 'Gauteng',
}
