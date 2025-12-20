/**
 * University of the Free State Pre-Configured Data
 *
 * Established in 1904, UFS is a leading comprehensive university
 * with multi-campus presence in the Free State province.
 * 7 faculties across 3 campuses.
 */

import type { PreConfiguredInstitution } from '../types'

export const UFS_DATA: PreConfiguredInstitution = {
  id: 'ufs',
  name: 'University of the Free State',
  shortName: 'UFS',
  type: 'university',
  website: 'https://www.ufs.ac.za',
  contactEmail: 'admissions@ufs.ac.za',
  city: 'Bloemfontein',
  province: 'Free State',

  campuses: [
    {
      name: 'Bloemfontein Campus',
      code: 'BLM',
      location: 'Bloemfontein',
      address: { city: 'Bloemfontein', province: 'Free State' },
      isMain: true,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Economic and Management Sciences',
              code: 'EMS',
              description: 'Business, economics, and management programmes',
              courses: [
                {
                  name: 'BCom Accounting',
                  code: 'B5AA01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Financial Management',
                  code: 'B5FM01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Economics',
                  code: 'B5EC01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Business Management',
                  code: 'B5BM01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BCom Marketing Management',
                  code: 'B5MK01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
              ],
            },
            {
              name: 'Faculty of Natural and Agricultural Sciences',
              code: 'NAS',
              description: 'Natural sciences, agriculture, and environmental studies',
              courses: [
                {
                  name: 'BSc Biological Sciences',
                  code: 'B3BS01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Chemistry',
                  code: 'B3CH01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Computer Science',
                  code: 'B3CS01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Mathematics and Physics',
                  code: 'B3MP01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BScAgric Agricultural Economics',
                  code: 'B3AE01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BScAgric Animal Science',
                  code: 'B3AS01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Environmental Sciences',
                  code: 'B3ES01',
                  level: 'undergraduate',
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
              description: 'Legal studies and jurisprudence',
              courses: [
                {
                  name: 'LLB Bachelor of Laws',
                  code: 'B4LB01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 32 },
                },
                {
                  name: 'BA Law',
                  code: 'B4LA01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BCom Law',
                  code: 'B4CL01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28, requiredSubjects: ['Mathematics'] },
                },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, languages, and social sciences',
              courses: [
                {
                  name: 'BA Social Sciences',
                  code: 'B1SS01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BA Psychology',
                  code: 'B1PS01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Languages and Literature',
                  code: 'B1LL01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BA Communication Science',
                  code: 'B1CM01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BA Journalism',
                  code: 'B1JN01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
              ],
            },
            {
              name: 'Faculty of Theology and Religion',
              code: 'THEO',
              description: 'Theological studies and religious education',
              courses: [
                {
                  name: 'BTh Theology',
                  code: 'B6TH01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BA Theology',
                  code: 'B6AT01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
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
              name: 'Faculty of Economic and Management Sciences',
              code: 'EMS',
              description: 'Business, economics, and management programmes',
              courses: [
                {
                  name: 'MCom Business Management',
                  code: 'M5BM01',
                  level: 'postgraduate',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'Faculty of Law',
              code: 'LAW',
              description: 'Legal studies and jurisprudence',
              courses: [
                {
                  name: 'LLM Master of Laws',
                  code: 'M4LM01',
                  level: 'postgraduate',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, languages, and social sciences',
              courses: [
                {
                  name: 'MA Psychology',
                  code: 'M1PS01',
                  level: 'postgraduate',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'Faculty of Theology and Religion',
              code: 'THEO',
              description: 'Theological studies and religious education',
              courses: [
                {
                  name: 'MTh Practical Theology',
                  code: 'M6PT01',
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
      name: 'South Campus',
      code: 'SOU',
      location: 'Bloemfontein',
      address: { city: 'Bloemfontein', province: 'Free State' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Health Sciences',
              code: 'HLTH',
              description: 'Medicine, nursing, and health professions',
              courses: [
                {
                  name: 'MBChB Medicine and Surgery',
                  code: 'B2MB01',
                  level: 'undergraduate',
                  durationYears: 6,
                  requirements: {
                    minimumAps: 38,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BCur Nursing',
                  code: 'B2NR01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'BPharm Pharmacy',
                  code: 'B2PH01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 34,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Dietetics',
                  code: 'B2DT01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Occupational Therapy',
                  code: 'B2OT01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'BSc Radiography',
                  code: 'B2RD01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Physical Sciences', 'Life Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher education and educational studies',
              courses: [
                {
                  name: 'BEd Foundation Phase Teaching',
                  code: 'B7FP01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BEd Intermediate Phase Teaching',
                  code: 'B7IP01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BEd Senior Phase and FET Teaching',
                  code: 'B7SP01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BEd Early Childhood Development',
                  code: 'B7EC01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 24 },
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
              description: 'Teacher education and educational studies',
              courses: [
                {
                  name: 'PGCE Postgraduate Certificate in Education',
                  code: 'P7PC01',
                  level: 'postgraduate',
                  durationYears: 1,
                },
                {
                  name: 'MEd Educational Psychology',
                  code: 'M7EP01',
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
      name: 'QwaQwa Campus',
      code: 'QWA',
      location: 'Phuthaditjhaba',
      address: { city: 'Phuthaditjhaba', province: 'Free State' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training programmes',
              courses: [
                {
                  name: 'BEd Foundation Phase Teaching',
                  code: 'B7FP02',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BEd Intermediate Phase Teaching',
                  code: 'B7IP02',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BEd Senior Phase and FET Teaching',
                  code: 'B7SP02',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26 },
                },
              ],
            },
            {
              name: 'Faculty of Natural and Agricultural Sciences',
              code: 'NAS',
              description: 'Science and agricultural programmes',
              courses: [
                {
                  name: 'BSc General',
                  code: 'B3GN02',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BScAgric Agricultural Extension',
                  code: 'B3AX02',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Economic and Management Sciences',
              code: 'EMS',
              description: 'Business and management programmes',
              courses: [
                {
                  name: 'BCom General',
                  code: 'B5GN02',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'BCom Accounting',
                  code: 'B5AA02',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28, requiredSubjects: ['Mathematics'] },
                },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Humanities and social sciences',
              courses: [
                {
                  name: 'BA General',
                  code: 'B1GN02',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'BA Social Work',
                  code: 'B1SW02',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26 },
                },
              ],
            },
          ],
        },
      ],
    },
  ],

  stats: {
    totalCampuses: 3,
    totalFaculties: 7,
    totalCourses: 55,
  },
}
