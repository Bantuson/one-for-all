/**
 * Tshwane University of Technology (TUT) Pre-Configured Data
 *
 * University of Technology with 9 campuses across 3 provinces (Gauteng, Mpumalanga, Limpopo).
 * 7 faculties offering 400+ programmes across diploma, degree, and postgraduate levels.
 * Enhanced data: 240+ courses aligned with HEQSF framework.
 */

import type { PreConfiguredInstitution } from '../types'

export const TUT_DATA: PreConfiguredInstitution = {
  id: 'tut',
  name: 'Tshwane University of Technology',
  shortName: 'TUT',
  type: 'university',
  website: 'https://www.tut.ac.za',
  contactEmail: 'info@tut.ac.za',
  city: 'Pretoria',
  province: 'Gauteng',

  campuses: [
    {
      name: 'Arts Campus',
      code: 'ART',
      location: 'Pretoria',
      address: { city: 'Pretoria', province: 'Gauteng' },
      isMain: false,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Arts and Design',
              code: 'ARTS',
              description: 'Creative arts, design, fashion, performing arts, and visual communication',
              courses: [
                // Diplomas - Visual Arts & Design
                {
                  name: 'Diploma: Commercial Photography',
                  code: 'ARTSD01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['Portfolio required', 'Practical assessment']
                  },
                },
                {
                  name: 'Diploma: Fashion Design',
                  code: 'ARTSD02',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 20,
                    additionalRequirements: ['Portfolio required', 'Practical assessment']
                  },
                },
                {
                  name: 'Diploma: Fine and Applied Arts',
                  code: 'ARTSD03',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 20,
                    additionalRequirements: ['Portfolio required', 'Practical assessment']
                  },
                },
                {
                  name: 'Diploma: Integrated Communication Design',
                  code: 'ARTSD04',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    additionalRequirements: ['Portfolio required', 'Practical assessment']
                  },
                },
                {
                  name: 'Diploma: Interior Design',
                  code: 'ARTSD05',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['Portfolio required', 'Practical assessment']
                  },
                },
                {
                  name: 'Diploma: Jewellery Design and Manufacture',
                  code: 'ARTSD06',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 20,
                    additionalRequirements: ['Portfolio required', 'Practical assessment']
                  },
                },
                {
                  name: 'Diploma: Motion Picture Production',
                  code: 'ARTSD07',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['Portfolio required', 'Practical assessment']
                  },
                },
                // Performing Arts Diplomas
                {
                  name: 'Diploma: Performing Arts (Dance)',
                  code: 'ARTSD08',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 20,
                    additionalRequirements: ['Audition required', 'Physical fitness assessment']
                  },
                },
                {
                  name: 'Diploma: Performing Arts (Jazz and Popular Music)',
                  code: 'ARTSD09',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 20,
                    additionalRequirements: ['Audition required', 'Musical proficiency test']
                  },
                },
                {
                  name: 'Diploma: Performing Arts (Opera)',
                  code: 'ARTSD10',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 20,
                    additionalRequirements: ['Audition required', 'Vocal proficiency test']
                  },
                },
                {
                  name: 'Diploma: Performing Arts (Theatre)',
                  code: 'ARTSD11',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 20,
                    additionalRequirements: ['Audition required', 'Acting assessment']
                  },
                },
                {
                  name: 'Diploma: Graphic Design',
                  code: 'ARTSD12',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['Portfolio required', 'Practical assessment']
                  },
                },
                {
                  name: 'Diploma: Visual Communication',
                  code: 'ARTSD13',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['Portfolio required', 'Practical assessment']
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
              name: 'Faculty of Arts and Design',
              code: 'ARTS',
              description: 'Advanced studies in arts and design',
              courses: [
                {
                  name: 'Advanced Diploma: Design',
                  code: 'ARTSA01',
                  level: 'postgraduate',
                  durationYears: 1,
                  requirements: {
                    additionalRequirements: ['Diploma in Design or equivalent']
                  },
                },
                {
                  name: 'Master of Technology: Design',
                  code: 'ARTSM01',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['Advanced Diploma or BTech in Design']
                  },
                },
                {
                  name: 'Doctor of Technology: Design',
                  code: 'ARTSP01',
                  level: 'doctoral',
                  durationYears: 3,
                  requirements: {
                    additionalRequirements: ['MTech in Design']
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Ga-Rankuwa Campus',
      code: 'GAR',
      location: 'Ga-Rankuwa, Pretoria',
      address: { city: 'Pretoria', province: 'Gauteng' },
      isMain: false,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Economics and Finance',
              code: 'ECON',
              description: 'Accounting, economics, finance, and auditing programmes',
              courses: [
                // Diplomas
                {
                  name: 'Diploma: Accounting',
                  code: 'ECOND01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%', 'English: 50%']
                  },
                },
                {
                  name: 'Diploma: Economics',
                  code: 'ECOND02',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%', 'English: 50%']
                  },
                },
                {
                  name: 'Diploma: Financial Management',
                  code: 'ECOND03',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%', 'English: 50%']
                  },
                },
                {
                  name: 'Diploma: Financial Planning',
                  code: 'ECOND04',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%', 'English: 50%']
                  },
                },
                {
                  name: 'Diploma: Internal Auditing',
                  code: 'ECOND05',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%']
                  },
                },
                {
                  name: 'Diploma: Public Finance',
                  code: 'ECOND06',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%', 'English: 50%']
                  },
                },
                {
                  name: 'Diploma: Management Accounting',
                  code: 'ECOND07',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%', 'English: 50%']
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
              name: 'Faculty of Economics and Finance',
              code: 'ECON',
              description: 'Advanced accounting and finance programmes',
              courses: [
                {
                  name: 'Advanced Diploma: Accounting',
                  code: 'ECONA01',
                  level: 'postgraduate',
                  durationYears: 1,
                  requirements: {
                    additionalRequirements: ['Diploma in Accounting']
                  },
                },
                {
                  name: 'Advanced Diploma: Taxation',
                  code: 'ECONA02',
                  level: 'postgraduate',
                  durationYears: 1,
                  requirements: {
                    additionalRequirements: ['Diploma in Accounting or related field']
                  },
                },
                {
                  name: 'Master of Technology: Accounting',
                  code: 'ECONM01',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['Advanced Diploma in Accounting']
                  },
                },
                {
                  name: 'Doctor of Technology: Accounting',
                  code: 'ECONP01',
                  level: 'doctoral',
                  durationYears: 3,
                  requirements: {
                    additionalRequirements: ['MTech in Accounting']
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Pretoria West Campus',
      code: 'PTA',
      location: 'Pretoria West',
      address: { city: 'Pretoria', province: 'Gauteng' },
      isMain: true,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Engineering and the Built Environment',
              code: 'ENG',
              description: 'Civil, chemical, electrical, mechanical, and built environment programmes',
              courses: [
                // BEngTech Degrees (4 years)
                {
                  name: 'Bachelor of Engineering Technology: Chemical Engineering',
                  code: 'ENGB01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 60%', 'Physical Sciences: 60%']
                  },
                },
                {
                  name: 'Bachelor of Engineering Technology: Civil Engineering',
                  code: 'ENGB02',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 60%', 'Physical Sciences: 60%']
                  },
                },
                {
                  name: 'Bachelor of Engineering Technology: Electrical Engineering',
                  code: 'ENGB03',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 60%', 'Physical Sciences: 60%']
                  },
                },
                {
                  name: 'Bachelor of Engineering Technology: Industrial Engineering',
                  code: 'ENGB04',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 60%', 'Physical Sciences: 60%']
                  },
                },
                {
                  name: 'Bachelor of Engineering Technology: Mechanical Engineering',
                  code: 'ENGB05',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 60%', 'Physical Sciences: 60%']
                  },
                },
                {
                  name: 'Bachelor of Engineering Technology: Mechatronics',
                  code: 'ENGB06',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 60%', 'Physical Sciences: 60%']
                  },
                },
                {
                  name: 'Bachelor of Engineering Technology: Metallurgical Engineering',
                  code: 'ENGB07',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 60%', 'Physical Sciences: 60%']
                  },
                },
                {
                  name: 'Bachelor of Architecture',
                  code: 'ENGB08',
                  level: 'undergraduate',
                  durationYears: 5,
                  requirements: {
                    minimumAps: 25,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%', 'Portfolio required']
                  },
                },
                {
                  name: 'Bachelor of Geomatics',
                  code: 'ENGB09',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 25,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                // Engineering Diplomas
                {
                  name: 'Diploma: Civil Engineering',
                  code: 'ENGD01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Electrical Engineering',
                  code: 'ENGD02',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Mechanical Engineering',
                  code: 'ENGD03',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Chemical Engineering',
                  code: 'ENGD04',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Industrial Engineering',
                  code: 'ENGD05',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Metallurgical Engineering',
                  code: 'ENGD06',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                // Built Environment
                {
                  name: 'Diploma: Building Science',
                  code: 'ENGD07',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%']
                  },
                },
                {
                  name: 'Diploma: Construction Management',
                  code: 'ENGD08',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%']
                  },
                },
                {
                  name: 'Diploma: Quantity Surveying',
                  code: 'ENGD09',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%']
                  },
                },
                {
                  name: 'Diploma: Geomatics',
                  code: 'ENGD10',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 23,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Architecture',
                  code: 'ENGD11',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%', 'Portfolio required']
                  },
                },
                {
                  name: 'Diploma: Town and Regional Planning',
                  code: 'ENGD12',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%']
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
              name: 'Faculty of Engineering and the Built Environment',
              code: 'ENG',
              description: 'Advanced engineering and built environment studies',
              courses: [
                {
                  name: 'Advanced Diploma: Engineering',
                  code: 'ENGA01',
                  level: 'postgraduate',
                  durationYears: 1,
                  requirements: {
                    additionalRequirements: ['BEngTech or equivalent']
                  },
                },
                {
                  name: 'Master of Engineering: Chemical Engineering',
                  code: 'ENGM01',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['BEngTech in Chemical Engineering']
                  },
                },
                {
                  name: 'Master of Engineering: Civil Engineering',
                  code: 'ENGM02',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['BEngTech in Civil Engineering']
                  },
                },
                {
                  name: 'Master of Engineering: Electrical Engineering',
                  code: 'ENGM03',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['BEngTech in Electrical Engineering']
                  },
                },
                {
                  name: 'Master of Engineering: Mechanical Engineering',
                  code: 'ENGM04',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['BEngTech in Mechanical Engineering']
                  },
                },
                {
                  name: 'Doctor of Engineering',
                  code: 'ENGP01',
                  level: 'doctoral',
                  durationYears: 3,
                  requirements: {
                    additionalRequirements: ['MEng in Engineering']
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Soshanguve Campus',
      code: 'SOS',
      location: 'Soshanguve, Pretoria',
      address: { city: 'Pretoria', province: 'Gauteng' },
      isMain: false,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Education, journalism, language practice, law, and social sciences',
              courses: [
                // Education - Bachelor degrees
                {
                  name: 'Bachelor of Education: Foundation Phase Teaching',
                  code: 'HUMB01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 25,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Bachelor of Education: Intermediate Phase Teaching',
                  code: 'HUMB02',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 25,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Bachelor of Education: Senior Phase and FET Teaching (Mathematics)',
                  code: 'HUMB03',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 60%', 'English: 50%']
                  },
                },
                {
                  name: 'Bachelor of Education: Senior Phase and FET Teaching (Natural Sciences)',
                  code: 'HUMB04',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Physical Sciences'],
                    additionalRequirements: ['Physical Sciences: 60%', 'English: 50%']
                  },
                },
                {
                  name: 'Bachelor of Education: Senior Phase and FET Teaching (Technology)',
                  code: 'HUMB05',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 24,
                    additionalRequirements: ['English: 50%']
                  },
                },
                // Humanities Diplomas
                {
                  name: 'Diploma: Journalism',
                  code: 'HUMD01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 60%']
                  },
                },
                {
                  name: 'Diploma: Language Practice',
                  code: 'HUMD02',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 60%']
                  },
                },
                {
                  name: 'Diploma: Law',
                  code: 'HUMD03',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Policing',
                  code: 'HUMD04',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 19,
                    additionalRequirements: ['English: 50%', 'Physical fitness test']
                  },
                },
                {
                  name: 'Diploma: Safety and Security Management',
                  code: 'HUMD05',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 19,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Media Studies',
                  code: 'HUMD06',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Public Relations Management',
                  code: 'HUMD07',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Social Work',
                  code: 'HUMD08',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
              ],
            },
            {
              name: 'Faculty of Information and Communication Technology',
              code: 'ICT',
              description: 'Computer science, information systems, and ICT programmes',
              courses: [
                // ICT Diplomas
                {
                  name: 'Diploma: Computer Science',
                  code: 'ICTD01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%']
                  },
                },
                {
                  name: 'Diploma: Computer Science (Extended)',
                  code: 'ICTD02',
                  level: 'diploma',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 23,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 40%']
                  },
                },
                {
                  name: 'Diploma: Computer Systems Engineering',
                  code: 'ICTD03',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Computer Systems Engineering (Extended)',
                  code: 'ICTD04',
                  level: 'diploma',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 23,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 40%', 'Physical Sciences: 40%']
                  },
                },
                {
                  name: 'Diploma: Informatics',
                  code: 'ICTD05',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%']
                  },
                },
                {
                  name: 'Diploma: Informatics (Extended)',
                  code: 'ICTD06',
                  level: 'diploma',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 23,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 40%']
                  },
                },
                {
                  name: 'Diploma: Information Technology',
                  code: 'ICTD07',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%']
                  },
                },
                {
                  name: 'Diploma: Information Technology (Extended)',
                  code: 'ICTD08',
                  level: 'diploma',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 23,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 40%']
                  },
                },
                {
                  name: 'Diploma: Multimedia Computing',
                  code: 'ICTD09',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%']
                  },
                },
                {
                  name: 'Diploma: Multimedia Computing (Extended)',
                  code: 'ICTD10',
                  level: 'diploma',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 23,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 40%']
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
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Advanced humanities and education programmes',
              courses: [
                {
                  name: 'Advanced Diploma: Education',
                  code: 'HUMA01',
                  level: 'postgraduate',
                  durationYears: 1,
                  requirements: {
                    additionalRequirements: ['BEd or equivalent']
                  },
                },
                {
                  name: 'Master of Education',
                  code: 'HUMM01',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['BEd or equivalent']
                  },
                },
                {
                  name: 'Doctor of Education',
                  code: 'HUMP01',
                  level: 'doctoral',
                  durationYears: 3,
                  requirements: {
                    additionalRequirements: ['MEd']
                  },
                },
              ],
            },
            {
              name: 'Faculty of Information and Communication Technology',
              code: 'ICT',
              description: 'Advanced ICT programmes',
              courses: [
                {
                  name: 'Advanced Diploma: ICT',
                  code: 'ICTA01',
                  level: 'postgraduate',
                  durationYears: 1,
                  requirements: {
                    additionalRequirements: ['Diploma in ICT or equivalent']
                  },
                },
                {
                  name: 'Master of Technology: Information Technology',
                  code: 'ICTM01',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['Advanced Diploma in ICT']
                  },
                },
                {
                  name: 'Doctor of Technology: ICT',
                  code: 'ICTP01',
                  level: 'doctoral',
                  durationYears: 3,
                  requirements: {
                    additionalRequirements: ['MTech in ICT']
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Arcadia Campus',
      code: 'ARC',
      location: 'Arcadia, Pretoria',
      address: { city: 'Pretoria', province: 'Gauteng' },
      isMain: false,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Science',
              code: 'SCI',
              description: 'Health sciences, biomedical sciences, and applied sciences',
              courses: [
                // Health Sciences - Bachelor degrees
                {
                  name: 'Bachelor of Nursing',
                  code: 'SCIB01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 25,
                    requiredSubjects: ['Mathematics', 'Life Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Life Sciences: 50%', 'English: 50%']
                  },
                },
                {
                  name: 'Bachelor of Pharmacy',
                  code: 'SCIB02',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 60%', 'Physical Sciences: 60%']
                  },
                },
                {
                  name: 'Bachelor of Radiography',
                  code: 'SCIB03',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                    additionalRequirements: ['Mathematics: 60%', 'Physical Sciences: 60%', 'Life Sciences: 60%']
                  },
                },
                {
                  name: 'Bachelor of Environmental Health',
                  code: 'SCIB04',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Bachelor of Health Sciences: Biokinetics',
                  code: 'SCIB05',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics', 'Life Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Life Sciences: 50%']
                  },
                },
                {
                  name: 'Bachelor of Health Sciences: Medical Laboratory Science',
                  code: 'SCIB06',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                    additionalRequirements: ['Mathematics: 60%', 'Physical Sciences: 60%', 'Life Sciences: 60%']
                  },
                },
                {
                  name: 'Bachelor of Health Sciences: Somatology',
                  code: 'SCIB07',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    requiredSubjects: ['Life Sciences'],
                    additionalRequirements: ['Life Sciences: 50%']
                  },
                },
                // Science Diplomas
                {
                  name: 'Diploma: Analytical Chemistry',
                  code: 'SCID01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 21,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Biotechnology',
                  code: 'SCID02',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 21,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%', 'Life Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Biomedical Technology',
                  code: 'SCID03',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%', 'Life Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Chemistry',
                  code: 'SCID04',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 21,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Food Technology',
                  code: 'SCID05',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 21,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Emergency Medical Care',
                  code: 'SCID06',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Life Sciences'],
                    additionalRequirements: ['Life Sciences: 50%', 'Physical fitness test']
                  },
                },
                {
                  name: 'Diploma: Nature Conservation',
                  code: 'SCID07',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Life Sciences'],
                    additionalRequirements: ['Life Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Environmental Health',
                  code: 'SCID08',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                // Agriculture
                {
                  name: 'Diploma: Animal Sciences',
                  code: 'SCID09',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 19,
                    requiredSubjects: ['Life Sciences'],
                    additionalRequirements: ['Life Sciences: 40%']
                  },
                },
                {
                  name: 'Diploma: Crop Production',
                  code: 'SCID10',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 19,
                    requiredSubjects: ['Life Sciences'],
                    additionalRequirements: ['Life Sciences: 40%']
                  },
                },
                {
                  name: 'Diploma: Horticulture',
                  code: 'SCID11',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    requiredSubjects: ['Life Sciences'],
                    additionalRequirements: ['Life Sciences: 50%']
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
              name: 'Faculty of Science',
              code: 'SCI',
              description: 'Advanced health and applied sciences',
              courses: [
                {
                  name: 'Advanced Diploma: Biotechnology',
                  code: 'SCIA01',
                  level: 'postgraduate',
                  durationYears: 1,
                  requirements: {
                    additionalRequirements: ['Diploma in Biotechnology']
                  },
                },
                {
                  name: 'Master of Health Sciences',
                  code: 'SCIM01',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['BHSci or equivalent']
                  },
                },
                {
                  name: 'Master of Nursing Science',
                  code: 'SCIM02',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['BNurs', 'SANC registration']
                  },
                },
                {
                  name: 'Master of Pharmacy',
                  code: 'SCIM03',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['BPharm', 'SAPC registration']
                  },
                },
                {
                  name: 'Doctor of Health Sciences',
                  code: 'SCIP01',
                  level: 'doctoral',
                  durationYears: 3,
                  requirements: {
                    additionalRequirements: ['MHSci']
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Pretoria Main Campus',
      code: 'PTM',
      location: 'Pretoria Central',
      address: { city: 'Pretoria', province: 'Gauteng' },
      isMain: false,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Management Sciences',
              code: 'MGMT',
              description: 'Business, hospitality, tourism, and management programmes',
              courses: [
                // Management Diplomas
                {
                  name: 'Diploma: Hospitality Management',
                  code: 'MGMTD01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 23,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Human Resource Management',
                  code: 'MGMTD02',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Marketing',
                  code: 'MGMTD03',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Operations Management',
                  code: 'MGMTD04',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Tourism Management',
                  code: 'MGMTD05',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Supply Chain Management',
                  code: 'MGMTD06',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Sport Management',
                  code: 'MGMTD07',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Event Management',
                  code: 'MGMTD08',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 20,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Adventure Tourism',
                  code: 'MGMTD09',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 20,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Ecotourism Management',
                  code: 'MGMTD10',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 20,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Management',
                  code: 'MGMTD11',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Public Management',
                  code: 'MGMTD12',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Office Management and Technology',
                  code: 'MGMTD13',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Retail Business Management',
                  code: 'MGMTD14',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Business Administration',
                  code: 'MGMTD15',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Entrepreneurship',
                  code: 'MGMTD16',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Public Relations Management',
                  code: 'MGMTD17',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Cost and Management Accounting',
                  code: 'MGMTD18',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%', 'English: 50%']
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
              name: 'Faculty of Management Sciences',
              code: 'MGMT',
              description: 'Advanced management and business studies',
              courses: [
                {
                  name: 'Advanced Diploma: Management',
                  code: 'MGMTA01',
                  level: 'postgraduate',
                  durationYears: 1,
                  requirements: {
                    additionalRequirements: ['Diploma in Management or equivalent']
                  },
                },
                {
                  name: 'Advanced Diploma: Human Resource Management',
                  code: 'MGMTA02',
                  level: 'postgraduate',
                  durationYears: 1,
                  requirements: {
                    additionalRequirements: ['Diploma in HRM or equivalent']
                  },
                },
                {
                  name: 'Master of Technology: Business Administration',
                  code: 'MGMTM01',
                  level: 'masters',
                  durationYears: 2,
                  requirements: {
                    additionalRequirements: ['Advanced Diploma or equivalent']
                  },
                },
                {
                  name: 'Doctor of Technology: Management Sciences',
                  code: 'MGMTP01',
                  level: 'doctoral',
                  durationYears: 3,
                  requirements: {
                    additionalRequirements: ['MTech in Management Sciences']
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Polokwane Campus',
      code: 'POL',
      location: 'Polokwane, Limpopo',
      address: { city: 'Polokwane', province: 'Limpopo' },
      isMain: false,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Management Sciences',
              code: 'MGMT',
              description: 'Business and management programmes',
              courses: [
                {
                  name: 'Diploma: Management',
                  code: 'MGMTD19',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Marketing',
                  code: 'MGMTD20',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Human Resource Management',
                  code: 'MGMTD21',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    additionalRequirements: ['English: 50%']
                  },
                },
              ],
            },
            {
              name: 'Faculty of Information and Communication Technology',
              code: 'ICT',
              description: 'Information technology programmes',
              courses: [
                {
                  name: 'Diploma: Information Technology',
                  code: 'ICTD11',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%']
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Mbombela Campus',
      code: 'MBO',
      location: 'Mbombela (Nelspruit), Mpumalanga',
      address: { city: 'Mbombela', province: 'Mpumalanga' },
      isMain: false,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Management Sciences',
              code: 'MGMT',
              description: 'Tourism, hospitality, and business management',
              courses: [
                {
                  name: 'Diploma: Tourism Management',
                  code: 'MGMTD22',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Hospitality Management',
                  code: 'MGMTD23',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 23,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Retail Business Management',
                  code: 'MGMTD24',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
                {
                  name: 'Diploma: Marketing',
                  code: 'MGMTD25',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
              ],
            },
            {
              name: 'Faculty of Information and Communication Technology',
              code: 'ICT',
              description: 'Information technology programmes',
              courses: [
                {
                  name: 'Diploma: Information Technology',
                  code: 'ICTD12',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                    additionalRequirements: ['Mathematics: 50%']
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'eMalahleni Campus',
      code: 'EMA',
      location: 'eMalahleni (Witbank), Mpumalanga',
      address: { city: 'eMalahleni', province: 'Mpumalanga' },
      isMain: false,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Engineering and the Built Environment',
              code: 'ENG',
              description: 'Mining, metallurgy, and engineering programmes',
              courses: [
                {
                  name: 'Diploma: Mining Engineering',
                  code: 'ENGD13',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Metallurgy',
                  code: 'ENGD14',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
                {
                  name: 'Diploma: Extractive Metallurgy',
                  code: 'ENGD15',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                    additionalRequirements: ['Mathematics: 50%', 'Physical Sciences: 50%']
                  },
                },
              ],
            },
            {
              name: 'Faculty of Management Sciences',
              code: 'MGMT',
              description: 'Business management programmes',
              courses: [
                {
                  name: 'Diploma: Management',
                  code: 'MGMTD26',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    additionalRequirements: ['English: 50%']
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],

  stats: {
    totalCampuses: 9,
    totalFaculties: 7,
    totalCourses: 244,
  },
}
