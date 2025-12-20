/**
 * North-West University Pre-Configured Data
 *
 * Multi-campus university established 2004 through merger.
 * 3 campuses across North West and Gauteng provinces.
 */

import type { PreConfiguredInstitution } from '../types'

export const NWU_DATA: PreConfiguredInstitution = {
  id: 'nwu',
  name: 'North-West University',
  shortName: 'NWU',
  type: 'university',
  website: 'https://www.nwu.ac.za',
  contactEmail: 'info@nwu.ac.za',
  city: 'Potchefstroom',
  province: 'North West',

  campuses: [
    {
      name: 'Potchefstroom Campus',
      code: 'POT',
      location: 'Potchefstroom',
      address: { city: 'Potchefstroom', province: 'North West' },
      isMain: true,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Engineering',
              code: 'ENG',
              description: 'Engineering programmes and applied technology',
              courses: [
                {
                  name: 'BEng Electrical and Electronic Engineering',
                  code: '12130301',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Mechanical Engineering',
                  code: '12130201',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Industrial Engineering',
                  code: '12130401',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Computer and Electronic Engineering',
                  code: '12130501',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Natural and Agricultural Sciences',
              code: 'NAS',
              description: 'Natural sciences, agriculture, and environmental studies',
              courses: [
                {
                  name: 'BSc Chemistry',
                  code: '02130011',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Computer Science and Information Systems',
                  code: '02130071',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Mathematics and Applied Mathematics',
                  code: '02130021',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Biochemistry',
                  code: '02130081',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Agriculture',
                  code: '02130041',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Environmental Sciences',
                  code: '02130091',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Economic and Management Sciences',
              code: 'EMS',
              description: 'Business, economics, and management programmes',
              courses: [
                {
                  name: 'BCom Accounting Sciences',
                  code: '07130102',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Economics',
                  code: '07130201',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Business Management',
                  code: '07130501',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BCom Management Accounting',
                  code: '07130601',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Marketing Management',
                  code: '07130701',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
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
                  code: '04130001',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 35 },
                },
                {
                  name: 'BA Law',
                  code: '04130101',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32 },
                },
              ],
            },
            {
              name: 'Faculty of Theology',
              code: 'THEO',
              description: 'Theological and religious studies',
              courses: [
                {
                  name: 'BA Theology',
                  code: '06130001',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BTh Bachelor of Theology',
                  code: '06130008',
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
              name: 'Faculty of Engineering',
              code: 'ENG',
              description: 'Engineering programmes and applied technology',
              courses: [
                {
                  name: 'MEng Engineering Management',
                  code: '12250101',
                  level: 'postgraduate',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'Faculty of Economic and Management Sciences',
              code: 'EMS',
              description: 'Business, economics, and management programmes',
              courses: [
                {
                  name: 'MCom Financial Management',
                  code: '07250102',
                  level: 'postgraduate',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'Faculty of Law',
              code: 'LAW',
              description: 'Legal studies and law programmes',
              courses: [
                {
                  name: 'LLM Master of Laws',
                  code: '04250001',
                  level: 'postgraduate',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Theology',
              code: 'THEO',
              description: 'Theological and religious studies',
              courses: [
                {
                  name: 'MDiv Master of Divinity',
                  code: '06250001',
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
      name: 'Mahikeng Campus',
      code: 'MAH',
      location: 'Mahikeng',
      address: { city: 'Mahikeng', province: 'North West' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, and languages',
              courses: [
                {
                  name: 'BA Social Work',
                  code: '01130301',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Psychology',
                  code: '01130201',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BA Communication Studies',
                  code: '01130401',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Languages and Literature',
                  code: '01130001',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
              ],
            },
            {
              name: 'Faculty of Health Sciences',
              code: 'HLTH',
              description: 'Health sciences and nursing programmes',
              courses: [
                {
                  name: 'BPharm Pharmacy',
                  code: '10130401',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 34,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BCur Nursing Science',
                  code: '10130101',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'BSc Occupational Therapy',
                  code: '10130501',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training and educational studies',
              courses: [
                {
                  name: 'BEd Foundation Phase Teaching',
                  code: '09130101',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BEd Intermediate Phase Teaching',
                  code: '09130201',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BEd Senior Phase and FET Teaching',
                  code: '09130301',
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
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, and languages',
              courses: [
                {
                  name: 'MA Social Work',
                  code: '01250301',
                  level: 'postgraduate',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training and educational studies',
              courses: [
                {
                  name: 'PGCE Postgraduate Certificate in Education',
                  code: '09240001',
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
      name: 'Vanderbijlpark Campus',
      code: 'VAN',
      location: 'Vanderbijlpark',
      address: { city: 'Vanderbijlpark', province: 'Gauteng' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Economic and Management Sciences',
              code: 'EMS',
              description: 'Business and management programmes',
              courses: [
                {
                  name: 'BCom Industrial Psychology and Human Resource Management',
                  code: '07130801',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BCom Logistics Management',
                  code: '07130901',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, and media studies',
              courses: [
                {
                  name: 'BA Development and Management',
                  code: '01130501',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Visual Arts',
                  code: '01130119',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
              ],
            },
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher education and training',
              courses: [
                {
                  name: 'BEd Foundation Phase Teaching',
                  code: '09130102',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BEd Senior Phase and FET Teaching',
                  code: '09130302',
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
    totalCampuses: 3,
    totalFaculties: 8,
    totalCourses: 51,
  },
}
