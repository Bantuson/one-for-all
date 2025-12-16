/**
 * North-West University Configuration
 *
 * Comprehensive university formed in 2004 through merger of
 * Potchefstroom University for CHE and University of North-West.
 * Three campuses across two provinces.
 */

import type { UniversityConfig } from './types'

export const NWU_CONFIG: UniversityConfig = {
  name: 'North-West University',
  shortName: 'NWU',
  type: 'comprehensive',
  domains: ['nwu.ac.za', 'www.nwu.ac.za'],

  faculties: [
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
      name: 'Faculty of Engineering',
      slug: 'faculty-of-engineering',
      aliases: ['Engineering'],
      description: 'Includes unique nuclear engineering strengths',
    },
    {
      name: 'Faculty of Health Sciences',
      slug: 'faculty-of-health-sciences',
      aliases: ['Health Sciences', 'Medicine'],
      description: 'Unrivalled approach to animal health and agricultural sciences',
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
      slug: 'faculty-of-natural-and-agricultural-sciences',
      aliases: ['NAS', 'Natural Sciences', 'Agricultural Sciences', 'Agriculture', 'Science'],
      description: 'Animal health and agricultural sciences excellence',
    },
    {
      name: 'Faculty of Theology',
      slug: 'faculty-of-theology',
      aliases: ['Theology', 'Religion'],
    },
    {
      name: 'NWU Business School',
      slug: 'nwu-business-school',
      aliases: ['Business School', 'NWU BS', 'MBA'],
    },
  ],

  campuses: [
    {
      name: 'Potchefstroom Campus',
      location: 'Potchefstroom, North West',
      isMain: true,
      aliases: ['Potchefstroom', 'Potch Campus', 'Puk Campus'],
      faculties: [
        'Faculty of Engineering',
        'Faculty of Law',
        'Faculty of Theology',
        'Faculty of Natural and Agricultural Sciences',
        'Faculty of Economic and Management Sciences',
        'Faculty of Education',
        'Faculty of Health Sciences',
        'Faculty of Humanities',
      ],
    },
    {
      name: 'Mahikeng Campus',
      location: 'Mahikeng, North West',
      aliases: ['Mahikeng', 'Mafikeng Campus'],
      faculties: [
        'Faculty of Natural and Agricultural Sciences',
        'Faculty of Health Sciences',
        'Faculty of Law',
        'Faculty of Economic and Management Sciences',
        'Faculty of Education',
        'Faculty of Humanities',
      ],
    },
    {
      name: 'Vanderbijlpark Campus',
      location: 'Vanderbijlpark, Gauteng',
      aliases: ['Vanderbijlpark', 'Vaal Triangle Campus', 'VTC'],
      faculties: [
        'Faculty of Economic and Management Sciences',
        'Faculty of Education',
        'Faculty of Humanities',
        'NWU Business School',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/faculties\/[\w-]+/i,
    programme: /\/programmes?\/(undergraduate|postgraduate)/i,
    campus: /\/campus|potchefstroom|mahikeng|mafikeng|vanderbijlpark|vaal/i,
  },

  selectors: {
    mainContent: 'main, .main-content, .content-wrapper',
    facultyList: '.faculty-list, .faculties-listing',
    programmeList: '.programme-list, .programs-listing',
  },

  targets: {
    minFaculties: 9,
    minCourses: 180,
    minCampuses: 3,
  },

  scrapingConfig: {
    maxPages: 120,
    maxDepth: 4,
    timeoutMs: 90000, // NWU site can be slow
    priorityUrls: [
      // NWU uses studies.nwu.ac.za subdomain for academic info
      // Main portal priorityUrls (will be relative to www.nwu.ac.za)
      '/programmes',
      '/faculties',
      '/study',
      // Studies portal paths (note: may need separate subdomain scraping)
      '/studies/our-faculties',
      '/studies/our-campuses',
      '/studies/faculties/economic-and-management-sciences',
      '/studies/faculties/education',
      '/studies/faculties/engineering',
      '/studies/faculties/health-sciences',
      '/studies/faculties/humanities',
      '/studies/faculties/law',
      '/studies/faculties/natural-and-agricultural-sciences',
      '/studies/faculties/theology',
      '/studies/faculties/business-school',
      // Campus information
      '/about/campuses/',
      '/about/potchefstroom-campus/',
      '/about/mahikeng-campus/',
      '/about/vanderbijlpark-campus/',
    ],
    // Note: NWU has separate subdomain studies.nwu.ac.za
    // Main site www.nwu.ac.za may redirect to studies portal
  },

  establishedYear: 2004,
  city: 'Potchefstroom',
  province: 'North West',
}
