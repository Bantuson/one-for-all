/**
 * Cape Peninsula University of Technology Pre-Configured Data
 *
 * University of Technology in the Western Cape, established 2005 through merger of Cape Technikon and Peninsula Technikon.
 * 6 faculties across 7 campuses in the Western Cape region.
 */

import type { PreConfiguredInstitution } from '../types'

export const CPUT_DATA: PreConfiguredInstitution = {
  id: 'cput',
  name: 'Cape Peninsula University of Technology',
  shortName: 'CPUT',
  type: 'university',
  website: 'https://www.cput.ac.za',
  contactEmail: 'info@cput.ac.za',
  city: 'Cape Town',
  province: 'Western Cape',

  campuses: [
    {
      name: 'Cape Town Campus',
      code: 'CPT',
      location: 'Zonnebloem, Cape Town',
      address: { city: 'Cape Town', province: 'Western Cape' },
      isMain: true,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Applied Sciences',
              code: 'AS',
              description: 'Science, mathematics, and environmental programmes',
              courses: [
                {
                  name: 'National Diploma: Analytical Chemistry',
                  code: 'AS001',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics', 'Physical Sciences'] },
                },
                {
                  name: 'National Diploma: Biotechnology',
                  code: 'AS002',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics', 'Life Sciences'] },
                },
                {
                  name: 'National Diploma: Environmental Health',
                  code: 'AS003',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24, requiredSubjects: ['Life Sciences'] },
                },
                {
                  name: 'National Diploma: Food Technology',
                  code: 'AS004',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics', 'Physical Sciences'] },
                },
                {
                  name: 'National Diploma: Horticulture',
                  code: 'AS005',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24, requiredSubjects: ['Life Sciences'] },
                },
                {
                  name: 'Bachelor of Technology: Environmental Management',
                  code: 'AS101',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
                {
                  name: 'Bachelor of Technology: Chemistry',
                  code: 'AS102',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
              ],
            },
            {
              name: 'Faculty of Business and Management Sciences',
              code: 'BMS',
              description: 'Business, commerce, and management programmes',
              courses: [
                {
                  name: 'National Diploma: Accountancy',
                  code: 'BMS001',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'National Diploma: Cost and Management Accounting',
                  code: 'BMS002',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'National Diploma: Financial Information Systems',
                  code: 'BMS003',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'National Diploma: Human Resource Management',
                  code: 'BMS004',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma: Marketing',
                  code: 'BMS005',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma: Office Management and Technology',
                  code: 'BMS006',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma: Public Management',
                  code: 'BMS007',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma: Retail Business Management',
                  code: 'BMS008',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma: Tourism Management',
                  code: 'BMS009',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'Bachelor of Technology: Financial Information Systems',
                  code: 'BMS101',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
                {
                  name: 'Bachelor of Technology: Marketing',
                  code: 'BMS102',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
                {
                  name: 'Bachelor of Technology: Human Resource Management',
                  code: 'BMS103',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
              ],
            },
            {
              name: 'Faculty of Informatics and Design',
              code: 'ID',
              description: 'IT, design, and creative technology programmes',
              courses: [
                {
                  name: 'National Diploma: Information Technology',
                  code: 'ID001',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'National Diploma: Multimedia Technology',
                  code: 'ID002',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'National Diploma: Software Development',
                  code: 'ID003',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'National Diploma: Graphic Design',
                  code: 'ID004',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma: Journalism',
                  code: 'ID005',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma: Public Relations Management',
                  code: 'ID006',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma: Fashion',
                  code: 'ID007',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 22 },
                },
                {
                  name: 'Bachelor of Technology: Information Technology',
                  code: 'ID101',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
                {
                  name: 'Bachelor of Technology: Multimedia Technology',
                  code: 'ID102',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
              ],
            },
          ],
        },
        {
          type: 'postgraduate',
          displayName: 'Postgraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Applied Sciences',
              code: 'AS',
              description: 'Science, mathematics, and environmental programmes',
              courses: [
                {
                  name: 'Master of Technology: Environmental Management',
                  code: 'AS201',
                  level: 'mtech',
                  durationYears: 2,
                },
                {
                  name: 'Doctor of Technology: Environmental Health',
                  code: 'AS301',
                  level: 'dtech',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Business and Management Sciences',
              code: 'BMS',
              description: 'Business, commerce, and management programmes',
              courses: [
                {
                  name: 'Postgraduate Diploma: Business Administration',
                  code: 'BMS201',
                  level: 'postgraduate',
                  durationYears: 1,
                },
                {
                  name: 'Master of Technology: Business Administration',
                  code: 'BMS301',
                  level: 'mtech',
                  durationYears: 2,
                },
                {
                  name: 'Doctor of Technology: Management',
                  code: 'BMS401',
                  level: 'dtech',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Informatics and Design',
              code: 'ID',
              description: 'IT, design, and creative technology programmes',
              courses: [
                {
                  name: 'Postgraduate Diploma: Information Technology',
                  code: 'ID201',
                  level: 'postgraduate',
                  durationYears: 1,
                },
                {
                  name: 'Master of Technology: Information Technology',
                  code: 'ID301',
                  level: 'mtech',
                  durationYears: 2,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Bellville Campus',
      code: 'BEL',
      location: 'Bellville, Cape Town',
      address: { city: 'Cape Town', province: 'Western Cape' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Engineering and Built Environment',
              code: 'EBE',
              description: 'Engineering, built environment, and construction programmes',
              courses: [
                {
                  name: 'National Diploma: Civil Engineering',
                  code: 'EBE001',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Electrical Engineering',
                  code: 'EBE002',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Mechanical Engineering',
                  code: 'EBE003',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Chemical Engineering',
                  code: 'EBE004',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Industrial Engineering',
                  code: 'EBE005',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Mechatronics',
                  code: 'EBE006',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Building',
                  code: 'EBE007',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'National Diploma: Construction Management',
                  code: 'EBE008',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'National Diploma: Quantity Surveying',
                  code: 'EBE009',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'National Diploma: Architectural Technology',
                  code: 'EBE010',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'National Diploma: Town and Regional Planning',
                  code: 'EBE011',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'Bachelor of Technology: Civil Engineering',
                  code: 'EBE101',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
                {
                  name: 'Bachelor of Technology: Electrical Engineering',
                  code: 'EBE102',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
                {
                  name: 'Bachelor of Technology: Mechanical Engineering',
                  code: 'EBE103',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
              ],
            },
          ],
        },
        {
          type: 'postgraduate',
          displayName: 'Postgraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Engineering and Built Environment',
              code: 'EBE',
              description: 'Engineering, built environment, and construction programmes',
              courses: [
                {
                  name: 'Master of Technology: Engineering',
                  code: 'EBE201',
                  level: 'mtech',
                  durationYears: 2,
                },
                {
                  name: 'Master of Technology: Construction Management',
                  code: 'EBE202',
                  level: 'mtech',
                  durationYears: 2,
                },
                {
                  name: 'Doctor of Technology: Engineering',
                  code: 'EBE301',
                  level: 'dtech',
                  durationYears: 3,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Wellington Campus',
      code: 'WEL',
      location: 'Wellington, Western Cape',
      address: { city: 'Wellington', province: 'Western Cape' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Applied Sciences',
              code: 'AS',
              description: 'Science, mathematics, and environmental programmes',
              courses: [
                {
                  name: 'National Diploma: Agricultural Management',
                  code: 'AS006',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24, requiredSubjects: ['Life Sciences'] },
                },
                {
                  name: 'National Diploma: Viticulture and Oenology',
                  code: 'AS007',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Physical Sciences'] },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Mowbray Campus',
      code: 'MOW',
      location: 'Mowbray, Cape Town',
      address: { city: 'Cape Town', province: 'Western Cape' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training and educational studies',
              courses: [
                {
                  name: 'National Diploma: Education',
                  code: 'EDU001',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'Advanced Diploma: Education',
                  code: 'EDU002',
                  level: 'advanced-diploma',
                  durationYears: 1,
                  description: 'Post-diploma qualification',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Granger Bay Campus',
      code: 'GRB',
      location: 'Green Point, Cape Town',
      address: { city: 'Cape Town', province: 'Western Cape' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Informatics and Design',
              code: 'ID',
              description: 'IT, design, and creative technology programmes',
              courses: [
                {
                  name: 'National Diploma: Hospitality Management',
                  code: 'ID008',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma: Culinary Arts',
                  code: 'ID009',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 22 },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Tygerberg Campus',
      code: 'TYG',
      location: 'Tygerberg, Cape Town',
      address: { city: 'Cape Town', province: 'Western Cape' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Health and Wellness Sciences',
              code: 'HWS',
              description: 'Health sciences, nursing, and allied health programmes',
              courses: [
                {
                  name: 'National Diploma: Nursing',
                  code: 'HWS001',
                  level: 'diploma',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Radiography',
                  code: 'HWS002',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Dental Technology',
                  code: 'HWS003',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Medical Laboratory Sciences',
                  code: 'HWS004',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Emergency Medical Care',
                  code: 'HWS005',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Somatology',
                  code: 'HWS006',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Sport Management',
                  code: 'HWS007',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'Bachelor of Technology: Nursing',
                  code: 'HWS101',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
                {
                  name: 'Bachelor of Technology: Radiography',
                  code: 'HWS102',
                  level: 'btech',
                  durationYears: 1,
                  description: 'Post-diploma BTech qualification',
                },
              ],
            },
          ],
        },
        {
          type: 'postgraduate',
          displayName: 'Postgraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Health and Wellness Sciences',
              code: 'HWS',
              description: 'Health sciences, nursing, and allied health programmes',
              courses: [
                {
                  name: 'Postgraduate Diploma: Emergency Medical Care',
                  code: 'HWS201',
                  level: 'postgraduate',
                  durationYears: 1,
                },
                {
                  name: 'Master of Technology: Nursing',
                  code: 'HWS301',
                  level: 'mtech',
                  durationYears: 2,
                },
                {
                  name: 'Doctor of Technology: Health Sciences',
                  code: 'HWS401',
                  level: 'dtech',
                  durationYears: 3,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Worcester Campus',
      code: 'WOR',
      location: 'Worcester, Western Cape',
      address: { city: 'Worcester', province: 'Western Cape' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training and educational studies',
              courses: [
                {
                  name: 'National Diploma: Early Childhood Development',
                  code: 'EDU003',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
              ],
            },
          ],
        },
      ],
    },
  ],

  stats: {
    totalCampuses: 7,
    totalFaculties: 6,
    totalCourses: 70,
  },
}
