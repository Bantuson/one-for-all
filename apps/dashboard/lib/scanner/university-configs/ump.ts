/**
 * University of Mpumalanga Configuration
 *
 * Comprehensive university established in 2013.
 * Two campuses: Mbombela (main) and Siyabuswa.
 * Incorporates former agricultural and education colleges.
 */

import type { UniversityConfig } from './types'

export const UMP_CONFIG: UniversityConfig = {
  name: 'University of Mpumalanga',
  shortName: 'UMP',
  type: 'comprehensive',
  domains: ['ump.ac.za', 'www.ump.ac.za'],

  faculties: [
    {
      name: 'Faculty of Agriculture and Natural Sciences',
      slug: 'faculty-of-agriculture-and-natural-sciences',
      aliases: ['Agriculture and Natural Sciences', 'Agriculture', 'FANS'],
      description: 'Agriculture and natural sciences programs',
    },
    {
      name: 'School of Agricultural Sciences',
      slug: 'school-of-agricultural-sciences',
      aliases: ['Agricultural Sciences', 'Agriculture'],
      description: 'Agricultural sciences and extension',
    },
    {
      name: 'School of Biology and Environmental Sciences',
      slug: 'school-of-biology-and-environmental-sciences',
      aliases: ['Biology and Environmental Sciences', 'Biology', 'Environmental Sciences'],
      description: 'Biology and environmental studies',
    },
    {
      name: 'School of Physical and Chemical Sciences',
      slug: 'school-of-physical-and-chemical-sciences',
      aliases: ['Physical and Chemical Sciences', 'Chemistry', 'Physics'],
      description: 'Physical and chemical sciences',
    },
    {
      name: 'School of Computing and Mathematical Sciences',
      slug: 'school-of-computing-and-mathematical-sciences',
      aliases: ['Computing and Mathematical Sciences', 'Computer Science', 'ICT', 'Mathematics'],
      description: 'Computing, mathematics, and ICT programs',
    },
    {
      name: 'Faculty of Education',
      slug: 'faculty-of-education',
      aliases: ['Education', 'Teaching', 'Teacher Education'],
      description: 'Teacher education and educational studies',
    },
    {
      name: 'School of Early Childhood Education',
      slug: 'school-of-early-childhood-education',
      aliases: ['Early Childhood Education', 'Foundation Phase', 'ECD'],
      description: 'Early childhood and foundation phase education',
    },
    {
      name: 'Faculty of Economics, Development and Business Sciences',
      slug: 'faculty-of-economics-development-and-business-sciences',
      aliases: ['Economics, Development and Business Sciences', 'Economics', 'Business', 'FEDBS'],
      description: 'Economics, development, and business programs',
    },
    {
      name: 'School of Development Studies',
      slug: 'school-of-development-studies',
      aliases: ['Development Studies', 'Rural Development'],
      description: 'Development and rural resource management',
    },
    {
      name: 'School of Hospitality and Tourism Management',
      slug: 'school-of-hospitality-and-tourism-management',
      aliases: ['Hospitality and Tourism', 'Tourism', 'Hospitality Management'],
      description: 'Hospitality and tourism management programs',
    },
    {
      name: 'School of Social Sciences',
      slug: 'school-of-social-sciences',
      aliases: ['Social Sciences', 'Sociology', 'Social Work'],
      description: 'Social sciences disciplines',
    },
  ],

  campuses: [
    {
      name: 'Mbombela Campus',
      location: 'Mbombela, Mpumalanga',
      isMain: true,
      aliases: ['Main Campus', 'Nelspruit Campus', 'Mbombela'],
      faculties: [
        'Faculty of Agriculture and Natural Sciences',
        'School of Agricultural Sciences',
        'School of Biology and Environmental Sciences',
        'School of Physical and Chemical Sciences',
        'School of Computing and Mathematical Sciences',
        'Faculty of Economics, Development and Business Sciences',
        'School of Development Studies',
        'School of Hospitality and Tourism Management',
        'School of Social Sciences',
      ],
    },
    {
      name: 'Siyabuswa Campus',
      location: 'Siyabuswa, Mpumalanga',
      aliases: ['Siyabuswa', 'Education Campus', 'Kwa-Ndebele Campus'],
      faculties: [
        'Faculty of Education',
        'School of Early Childhood Education',
      ],
    },
  ],

  urlPatterns: {
    faculty: /\/faculty|\/faculties|\/school/i,
    programme: /\/programmes?|\/courses?|\/qualifications?/i,
    campus: /\/campus|mbombela|siyabuswa/i,
  },

  selectors: {
    mainContent: 'main, .content, .main-content',
    facultyList: '.faculties-list, .faculty-listing',
    programmeList: '.programme-list, .courses-list',
  },

  establishedYear: 2013,
  city: 'Mbombela',
  province: 'Mpumalanga',
}
