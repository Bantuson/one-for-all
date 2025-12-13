/**
 * Nelson Mandela University Configuration
 *
 * Comprehensive university formed in 2005 (formerly NMMU - Nelson Mandela Metropolitan University).
 * Renamed to Nelson Mandela University in 2017.
 * Seven campuses across Gqeberha (Port Elizabeth) and George.
 * South Africa's leading ocean and coastal sciences university.
 */

import type { UniversityConfig } from './types'

export const NMU_CONFIG: UniversityConfig = {
  name: 'Nelson Mandela University',
  shortName: 'NMU',
  type: 'comprehensive',
  domains: ['mandela.ac.za', 'www.mandela.ac.za', 'nmmu.ac.za'],

  faculties: [
    {
      name: 'Faculty of Arts',
      slug: 'faculty-of-arts',
      aliases: ['Arts', 'Humanities', 'Fine Arts', 'Music', 'Visual Arts'],
      description: 'Arts, humanities, and creative disciplines',
    },
    {
      name: 'Faculty of Business and Economic Sciences',
      slug: 'faculty-of-business-economic-sciences',
      aliases: [
        'Business and Economic Sciences',
        'Business',
        'Economics',
        'Commerce',
        'Business School',
        'FBES',
      ],
      description: 'Business, economics, and commerce programs',
    },
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education', 'Teacher Education'],
      description: 'Teacher education and educational studies',
    },
    {
      name: 'Faculty of Engineering, the Built Environment and Technology',
      slug: 'faculty-of-engineering-built-environment-technology',
      aliases: [
        'Engineering, the Built Environment and Technology',
        'Engineering',
        'Built Environment',
        'Technology',
        'FEBET',
      ],
      description: 'Engineering, architecture, and technology programs',
    },
    {
      name: 'Faculty of Health Sciences',
      slug: 'faculty-of-health-sciences',
      aliases: ['Health Sciences', 'Medicine', 'Nursing', 'Pharmacy'],
      description: 'Health sciences and medical programs',
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
      aliases: ['Science', 'Natural Sciences', 'Ocean Sciences', 'Marine Sciences'],
      description: 'Natural sciences including ocean and coastal sciences',
    },
  ],

  campuses: [
    {
      name: 'South Campus',
      location: 'Summerstrand, Gqeberha',
      isMain: true,
      aliases: ['South Campus', 'Main Campus', 'Summerstrand', 'Summerstrand Campus'],
      faculties: [
        'Faculty of Arts',
        'Faculty of Education',
        'Faculty of Health Sciences',
        'Faculty of Law',
        'Faculty of Science',
      ],
    },
    {
      name: 'North Campus',
      location: 'Port Elizabeth North, Gqeberha',
      aliases: ['North Campus', 'North End'],
      faculties: [
        'Faculty of Engineering, the Built Environment and Technology',
      ],
    },
    {
      name: 'Second Avenue Campus',
      location: 'Gqeberha Central',
      aliases: ['Second Avenue', '2nd Avenue', 'Business School Campus'],
      faculties: [
        'Faculty of Business and Economic Sciences',
      ],
    },
    {
      name: 'Missionvale Campus',
      location: 'Missionvale, Gqeberha',
      aliases: ['Missionvale', 'Vista Campus'],
    },
    {
      name: 'Bird Street Campus',
      location: 'Central Port Elizabeth, Gqeberha',
      aliases: ['Bird Street', 'Central Campus'],
      faculties: [
        'Faculty of Arts',
      ],
    },
    {
      name: 'Ocean Sciences Campus',
      location: 'Gomery Road, Gqeberha',
      aliases: ['Ocean Sciences', 'Marine Campus', 'Coastal Campus'],
      faculties: [
        'Faculty of Science',
      ],
    },
    {
      name: 'George Campus',
      location: 'George, Western Cape',
      aliases: ['George', 'Garden Route Campus'],
      faculties: [
        'Faculty of Business and Economic Sciences',
        'Faculty of Science',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/faculties?|\/faculty/i,
    programme: /\/programmes?|\/courses?|\/qualifications?/i,
    campus: /\/campus|south|north|second-avenue|missionvale|bird-street|ocean|george/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  targets: {
    minFaculties: 7,
    minCourses: 200,
    minCampuses: 7,
  },

  scrapingConfig: {
    maxPages: 120,
    maxDepth: 4,
    priorityUrls: [
      '/programmes',
      '/faculties',
      '/study',
    ],
  },

  establishedYear: 2005,
  city: 'Gqeberha',
  province: 'Eastern Cape',
}
