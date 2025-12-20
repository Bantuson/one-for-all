/**
 * Nelson Mandela University Pre-Configured Data
 *
 * A comprehensive university in the Eastern Cape, established 2005 through merger.
 * 6 campuses across Port Elizabeth (Gqeberha) and George.
 */

import type { PreConfiguredInstitution } from '../types'

export const NMU_DATA: PreConfiguredInstitution = {
  id: 'nmu',
  name: 'Nelson Mandela University',
  shortName: 'NMU',
  type: 'university',
  website: 'https://www.mandela.ac.za',
  contactEmail: 'info@mandela.ac.za',
  city: 'Port Elizabeth',
  province: 'Eastern Cape',

  campuses: [
    {
      name: 'Summerstrand Campus South',
      code: 'SUM-S',
      location: 'Summerstrand, Port Elizabeth',
      address: { city: 'Port Elizabeth', province: 'Eastern Cape' },
      isMain: true,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Business and Economic Sciences',
              code: 'BES',
              description: 'Business, economics, accounting, and management programmes',
              courses: [
                {
                  name: 'BCom Accounting',
                  code: 'B1AAC01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Financial Planning',
                  code: 'B1FPL01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Business Management',
                  code: 'B1BMA01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BCom Economics',
                  code: 'B1ECO01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Marketing',
                  code: 'B1MKT01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BCom Human Resource Management',
                  code: 'B1HRM01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
              ],
            },
            {
              name: 'Faculty of Engineering, the Built Environment and Technology',
              code: 'EBET',
              description: 'Engineering, IT, construction, and technology programmes',
              courses: [
                {
                  name: 'BEng Mechatronics',
                  code: 'B2MCT01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Electrical Engineering',
                  code: 'B2ELE01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Industrial Engineering',
                  code: 'B2IND01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Civil Engineering',
                  code: 'B2CIV01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Information Technology',
                  code: 'B2ITE01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Computer Science',
                  code: 'B2COS01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Construction Management',
                  code: 'B2CON01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'National Diploma Engineering',
                  code: 'D2ENG01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Science',
              code: 'SCI',
              description: 'Natural sciences, mathematics, and environmental sciences',
              courses: [
                {
                  name: 'BSc Biotechnology',
                  code: 'B3BIO01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Environmental Science',
                  code: 'B3ENV01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Marine Biology',
                  code: 'B3MAR01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Chemistry',
                  code: 'B3CHE01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Physics',
                  code: 'B3PHY01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Applied Mathematics',
                  code: 'B3MAT01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
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
              name: 'Faculty of Business and Economic Sciences',
              code: 'BES',
              description: 'Business, economics, accounting, and management programmes',
              courses: [
                {
                  name: 'MCom Business Management',
                  code: 'M1BMA01',
                  level: 'postgraduate',
                  durationYears: 2,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Summerstrand Campus North',
      code: 'SUM-N',
      location: 'Summerstrand, Port Elizabeth',
      address: { city: 'Port Elizabeth', province: 'Eastern Cape' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, languages, and communication',
              courses: [
                {
                  name: 'BA Social Sciences',
                  code: 'B4SSC01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Psychology',
                  code: 'B4PSY01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BA Media, Communication and Culture',
                  code: 'B4MCC01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Languages',
                  code: 'B4LAN01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Development Studies',
                  code: 'B4DEV01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
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
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, languages, and communication',
              courses: [
                {
                  name: 'MA Psychology (Clinical)',
                  code: 'M4PSY01',
                  level: 'postgraduate',
                  durationYears: 2,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Second Avenue Campus',
      code: 'SEC',
      location: 'Newton Park, Port Elizabeth',
      address: { city: 'Port Elizabeth', province: 'Eastern Cape' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Health Sciences',
              code: 'HLTH',
              description: 'Nursing, pharmacy, and health sciences programmes',
              courses: [
                {
                  name: 'BPharm Pharmacy',
                  code: 'B5PHA01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 34,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BNurs Nursing Science',
                  code: 'B5NUR01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'BSc Human Movement Science',
                  code: 'B5HMS01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'BSc Biokinetics',
                  code: 'B5BIO01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics', 'Life Sciences'],
                  },
                },
                {
                  name: 'National Diploma Radiography',
                  code: 'D5RAD01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Physical Sciences', 'Life Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Law',
              code: 'LAW',
              description: 'Legal studies and law programmes',
              courses: [
                {
                  name: 'LLB Bachelor of Laws',
                  code: 'B6LAW01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 35 },
                },
                {
                  name: 'BA Law',
                  code: 'B6BAL01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32 },
                },
                {
                  name: 'BCom Law',
                  code: 'B6BCL01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
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
              name: 'Faculty of Law',
              code: 'LAW',
              description: 'Legal studies and law programmes',
              courses: [
                {
                  name: 'LLM Master of Laws',
                  code: 'M6LAW01',
                  level: 'postgraduate',
                  durationYears: 1,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Missionvale Campus',
      code: 'MIS',
      location: 'Missionvale, Port Elizabeth',
      address: { city: 'Port Elizabeth', province: 'Eastern Cape' },
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
                  name: 'BEd Foundation Phase Teaching',
                  code: 'B7FPT01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BEd Intermediate Phase Teaching',
                  code: 'B7IPT01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BEd Senior Phase and FET Teaching',
                  code: 'B7SPT01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
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
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training and educational studies',
              courses: [
                {
                  name: 'PGCE Postgraduate Certificate in Education',
                  code: 'P7PGC01',
                  level: 'postgraduate',
                  durationYears: 1,
                },
                {
                  name: 'MEd Education Management',
                  code: 'M7EDM01',
                  level: 'postgraduate',
                  durationYears: 2,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'George Campus',
      code: 'GEO',
      location: 'George, Western Cape',
      address: { city: 'George', province: 'Western Cape' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Regional Campus Programmes',
              code: 'REG',
              description: 'Selected undergraduate programmes offered in George',
              courses: [
                {
                  name: 'BCom Business Management (George)',
                  code: 'B8BMA01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'National Diploma Tourism Management',
                  code: 'D8TOU01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'National Diploma Hospitality Management',
                  code: 'D8HOS01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Bird Street Campus',
      code: 'BRD',
      location: 'Central, Port Elizabeth',
      address: { city: 'Port Elizabeth', province: 'Eastern Cape' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Art and Design School',
              code: 'ART',
              description: 'Fine art, design, and creative programmes',
              courses: [
                {
                  name: 'BA Fine Arts',
                  code: 'B9ART01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Visual Communication Design',
                  code: 'B9VCD01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Fashion Design',
                  code: 'B9FAS01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
              ],
            },
          ],
        },
      ],
    },
  ],

  stats: {
    totalCampuses: 6,
    totalFaculties: 11,
    totalCourses: 57,
  },
}
