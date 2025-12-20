/**
 * University of KwaZulu-Natal Pre-Configured Data
 *
 * One of South Africa's premier research universities, formed in 2004
 * through the merger of the University of Natal and the University of Durban-Westville.
 * 5 campuses across KwaZulu-Natal with 4 academic colleges.
 */

import type { PreConfiguredInstitution } from '../types'

export const UKZN_DATA: PreConfiguredInstitution = {
  id: 'ukzn',
  name: 'University of KwaZulu-Natal',
  shortName: 'UKZN',
  type: 'university',
  website: 'https://www.ukzn.ac.za',
  contactEmail: 'admissions@ukzn.ac.za',
  city: 'Durban',
  province: 'KwaZulu-Natal',

  campuses: [
    {
      name: 'Howard College Campus',
      code: 'HC',
      location: 'Howard College, Durban',
      address: { city: 'Durban', province: 'KwaZulu-Natal' },
      isMain: true,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'College of Law and Management Studies',
              code: 'CLMS',
              description: 'Business, law, and management programmes',
              courses: [
                {
                  name: 'BCom Accounting',
                  code: 'ACCN1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 34,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BCom Finance',
                  code: 'FINC1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BCom Business Management',
                  code: 'BMGT1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                  },
                },
                {
                  name: 'BCom Marketing',
                  code: 'MRKT1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                  },
                },
                {
                  name: 'BCom Human Resource Management',
                  code: 'HRM1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                  },
                },
                {
                  name: 'LLB Bachelor of Laws',
                  code: 'LLB1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                  },
                },
                {
                  name: 'BA Law',
                  code: 'BALAW1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 34,
                  },
                },
              ],
            },
            {
              name: 'College of Humanities',
              code: 'CH',
              description: 'Arts, social sciences, and humanities',
              courses: [
                {
                  name: 'BA Social Sciences',
                  code: 'BASS1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Psychology',
                  code: 'BAPSY1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                  },
                },
                {
                  name: 'BA Media and Cultural Studies',
                  code: 'BAMCS1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Development Studies',
                  code: 'BADS1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Languages',
                  code: 'BALNG1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
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
              name: 'College of Law and Management Studies',
              code: 'CLMS',
              description: 'Business, law, and management programmes',
              courses: [
                {
                  name: 'MBA Master of Business Administration',
                  code: 'MBA1',
                  level: 'postgraduate',
                  durationYears: 2,
                  description: 'Full-time MBA programme',
                },
                {
                  name: 'MCom Finance',
                  code: 'MCOMF1',
                  level: 'postgraduate',
                  durationYears: 1,
                },
                {
                  name: 'LLM Master of Laws',
                  code: 'LLM1',
                  level: 'postgraduate',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'College of Humanities',
              code: 'CH',
              description: 'Arts, social sciences, and humanities',
              courses: [
                {
                  name: 'MA Social Work',
                  code: 'MASW1',
                  level: 'postgraduate',
                  durationYears: 2,
                },
                {
                  name: 'MA Psychology',
                  code: 'MAPSY1',
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
      name: 'Westville Campus',
      code: 'WV',
      location: 'Westville, Durban',
      address: { city: 'Durban', province: 'KwaZulu-Natal' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'College of Agriculture, Engineering and Science',
              code: 'CAES',
              description: 'Engineering, sciences, and agricultural programmes',
              courses: [
                {
                  name: 'BEng Chemical Engineering',
                  code: 'BCHE1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Civil Engineering',
                  code: 'BCIV1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Electrical Engineering',
                  code: 'BELC1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Mechanical Engineering',
                  code: 'BMEC1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 36,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Computer Science',
                  code: 'BSCS1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Information Technology',
                  code: 'BSIT1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Physics',
                  code: 'BSPH1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Chemistry',
                  code: 'BSCH1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Mathematics',
                  code: 'BSMT1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Biological Sciences',
                  code: 'BSBS1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences', 'Mathematics'],
                  },
                },
                {
                  name: 'BScAgric Agriculture',
                  code: 'BSCAG1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences', 'Mathematics'],
                  },
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
              name: 'College of Agriculture, Engineering and Science',
              code: 'CAES',
              description: 'Engineering, sciences, and agricultural programmes',
              courses: [
                {
                  name: 'MEng Electrical Engineering',
                  code: 'MEELC1',
                  level: 'postgraduate',
                  durationYears: 2,
                },
                {
                  name: 'MSc Computer Science',
                  code: 'MSCS1',
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
      name: 'Nelson R. Mandela School of Medicine',
      code: 'NRMSM',
      location: 'Congella, Durban',
      address: { city: 'Durban', province: 'KwaZulu-Natal' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'College of Health Sciences',
              code: 'CHS',
              description: 'Medicine, nursing, pharmacy, and health sciences',
              courses: [
                {
                  name: 'MBChB Medicine',
                  code: 'MBCHB1',
                  level: 'undergraduate',
                  durationYears: 6,
                  requirements: {
                    minimumAps: 38,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BPharm Pharmacy',
                  code: 'BPHM1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BNurs Nursing',
                  code: 'BNURS1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'BSc Physiotherapy',
                  code: 'BSPHY1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 34,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Occupational Therapy',
                  code: 'BSOCC1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Life Sciences', 'Mathematics'],
                  },
                },
                {
                  name: 'BSc Medical Laboratory Science',
                  code: 'BSMLS1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Life Sciences', 'Mathematics', 'Physical Sciences'],
                  },
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
              name: 'College of Health Sciences',
              code: 'CHS',
              description: 'Medicine, nursing, pharmacy, and health sciences',
              courses: [
                {
                  name: 'MMed Family Medicine',
                  code: 'MMEDF1',
                  level: 'postgraduate',
                  durationYears: 4,
                },
                {
                  name: 'MPH Public Health',
                  code: 'MPHLT1',
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
      name: 'Pietermaritzburg Campus',
      code: 'PMB',
      location: 'Pietermaritzburg',
      address: { city: 'Pietermaritzburg', province: 'KwaZulu-Natal' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'College of Agriculture, Engineering and Science (PMB)',
              code: 'CAESP',
              description: 'Agricultural and environmental sciences',
              courses: [
                {
                  name: 'BScAgric Animal Science',
                  code: 'BSCAN1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences', 'Mathematics'],
                  },
                },
                {
                  name: 'BScAgric Crop Science',
                  code: 'BSCCP1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences', 'Mathematics'],
                  },
                },
                {
                  name: 'BSc Environmental Sciences',
                  code: 'BSENV1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences', 'Mathematics'],
                  },
                },
                {
                  name: 'BSc Geology',
                  code: 'BSGEO1',
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
              name: 'College of Humanities (PMB)',
              code: 'CHP',
              description: 'Arts, social sciences, and education',
              courses: [
                {
                  name: 'BA Fine Arts',
                  code: 'BAFAR1',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BSocSci Social Work',
                  code: 'BSSW1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Edgewood Campus',
      code: 'EGW',
      location: 'Pinetown',
      address: { city: 'Pinetown', province: 'KwaZulu-Natal' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'College of Humanities - Education',
              code: 'CHED',
              description: 'Teacher education and training programmes',
              courses: [
                {
                  name: 'BEd Foundation Phase Teaching',
                  code: 'BEDFP1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BEd Intermediate Phase Teaching',
                  code: 'BEDIP1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BEd Senior Phase and FET Teaching',
                  code: 'BEDSF1',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
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
              name: 'College of Humanities - Education',
              code: 'CHED',
              description: 'Teacher education and training programmes',
              courses: [
                {
                  name: 'PGCE Postgraduate Certificate in Education',
                  code: 'PGCE1',
                  level: 'postgraduate',
                  durationYears: 1,
                },
                {
                  name: 'MEd Educational Leadership and Management',
                  code: 'MEDLM1',
                  level: 'postgraduate',
                  durationYears: 2,
                },
              ],
            },
          ],
        },
      ],
    },
  ],

  stats: {
    totalCampuses: 5,
    totalFaculties: 8,
    totalCourses: 60,
  },
}
