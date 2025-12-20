/**
 * Walter Sisulu University Pre-Configured Data
 *
 * A comprehensive university in the Eastern Cape offering both traditional
 * and University of Technology (UoT) qualifications across 4 main campuses.
 * Established 2005 through merger of Border Technikon, Eastern Cape Technikon,
 * and University of Transkei.
 */

import type { PreConfiguredInstitution } from '../types'

export const WSU_DATA: PreConfiguredInstitution = {
  id: 'wsu',
  name: 'Walter Sisulu University',
  shortName: 'WSU',
  type: 'university',
  website: 'https://www.wsu.ac.za',
  contactEmail: 'info@wsu.ac.za',
  city: 'Mthatha',
  province: 'Eastern Cape',

  campuses: [
    {
      name: 'Mthatha Campus',
      code: 'MTH',
      location: 'Mthatha, Eastern Cape',
      address: { city: 'Mthatha', province: 'Eastern Cape' },
      isMain: true,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Business, Management Sciences and Law',
              code: 'BMS',
              description: 'Business, economics, accounting, management, and legal studies',
              courses: [
                // Undergraduate Degrees
                {
                  name: 'BCom Accounting',
                  code: 'WSUBMS01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Business Management',
                  code: 'WSUBMS02',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BCom Economics',
                  code: 'WSUBMS03',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'LLB Bachelor of Laws',
                  code: 'WSUBMS04',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 32, requiredSubjects: ['English Home Language'] },
                },
                {
                  name: 'BCom Financial Accounting',
                  code: 'WSUBMS05',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                // Diplomas
                {
                  name: 'National Diploma Public Management',
                  code: 'WSUBMS06',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma Financial Accounting',
                  code: 'WSUBMS07',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'National Diploma Business Management',
                  code: 'WSUBMS08',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma Office Management',
                  code: 'WSUBMS09',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 22 },
                },
                {
                  name: 'National Diploma Marketing',
                  code: 'WSUBMS10',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma Human Resource Management',
                  code: 'WSUBMS11',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma Cost and Management Accounting',
                  code: 'WSUBMS12',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'National Diploma Internal Auditing',
                  code: 'WSUBMS13',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'National Diploma Retail Business Management',
                  code: 'WSUBMS14',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 22 },
                },
                {
                  name: 'National Diploma Public Relations',
                  code: 'WSUBMS15',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
              ],
            },
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training and educational studies across all phases',
              courses: [
                // BEd Degrees
                {
                  name: 'BEd Foundation Phase Teaching',
                  code: 'WSUEDU01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BEd Intermediate Phase Teaching',
                  code: 'WSUEDU02',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BEd Senior Phase and FET Teaching',
                  code: 'WSUEDU03',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BEd FET Phase Mathematics and Science',
                  code: 'WSUEDU04',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28, requiredSubjects: ['Mathematics', 'Physical Sciences'] },
                },
                {
                  name: 'BEd FET Phase Languages',
                  code: 'WSUEDU05',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26, requiredSubjects: ['English Home Language'] },
                },
                {
                  name: 'BA with Education',
                  code: 'WSUEDU06',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 24 },
                },
                // Diplomas
                {
                  name: 'National Diploma Early Childhood Development',
                  code: 'WSUEDU07',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 22 },
                },
                {
                  name: 'National Diploma Adult and Community Education',
                  code: 'WSUEDU08',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 22 },
                },
              ],
            },
            {
              name: 'Faculty of Humanities and Social Sciences',
              code: 'HSS',
              description: 'Languages, social sciences, media, psychology, and development studies',
              courses: [
                // BA Degrees
                {
                  name: 'BA Social Sciences',
                  code: 'WSUHSS01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BA Psychology',
                  code: 'WSUHSS02',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Communication Studies',
                  code: 'WSUHSS03',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BA Languages and Literature',
                  code: 'WSUHSS04',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 24, requiredSubjects: ['English Home Language'] },
                },
                {
                  name: 'BA Development Studies',
                  code: 'WSUHSS05',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BA Social Work',
                  code: 'WSUHSS06',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Media Studies',
                  code: 'WSUHSS07',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
                {
                  name: 'BA English Literature',
                  code: 'WSUHSS08',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 26, requiredSubjects: ['English Home Language'] },
                },
                {
                  name: 'BA Sociology',
                  code: 'WSUHSS09',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 26 },
                },
                // Diplomas
                {
                  name: 'National Diploma Journalism',
                  code: 'WSUHSS10',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24, requiredSubjects: ['English First Additional Language'] },
                },
                {
                  name: 'National Diploma Media Practice',
                  code: 'WSUHSS11',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 24 },
                },
                {
                  name: 'National Diploma Social Auxiliary Work',
                  code: 'WSUHSS12',
                  level: 'diploma',
                  durationYears: 2,
                  requirements: { minimumAps: 22 },
                },
              ],
            },
            {
              name: 'Faculty of Health Sciences',
              code: 'HS',
              description: 'Nursing, pharmacy, medical sciences, and allied health programmes',
              courses: [
                // Health Degrees
                {
                  name: 'BNurs Nursing Science',
                  code: 'WSUHS01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences', 'English First Additional Language'],
                  },
                },
                {
                  name: 'BPharm Pharmacy',
                  code: 'WSUHS02',
                  level: 'undergraduate',
                  durationYears: 5,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Life Sciences', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Environmental Health',
                  code: 'WSUHS03',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences', 'Mathematics'],
                  },
                },
                {
                  name: 'BSc Human Movement Science',
                  code: 'WSUHS04',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                // Diplomas
                {
                  name: 'National Diploma Nursing',
                  code: 'WSUHS05',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'National Diploma Clinical Technology',
                  code: 'WSUHS06',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Physical Sciences', 'Life Sciences', 'Mathematics'],
                  },
                },
                {
                  name: 'National Diploma Radiography',
                  code: 'WSUHS07',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Physical Sciences', 'Life Sciences', 'Mathematics'],
                  },
                },
                {
                  name: 'National Diploma Environmental Health',
                  code: 'WSUHS08',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'National Diploma Emergency Medical Care',
                  code: 'WSUHS09',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences', 'Mathematics'],
                  },
                },
                {
                  name: 'National Diploma Dental Assisting',
                  code: 'WSUHS10',
                  level: 'diploma',
                  durationYears: 2,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Natural Sciences',
              code: 'NS',
              description: 'Biological sciences, chemistry, mathematics, physics, geography, and agriculture',
              courses: [
                // BSc Degrees
                {
                  name: 'BSc Biological Sciences',
                  code: 'WSUNS01',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Chemistry',
                  code: 'WSUNS02',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Mathematics',
                  code: 'WSUNS03',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Applied Mathematics',
                  code: 'WSUNS04',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Physics',
                  code: 'WSUNS05',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Environmental Science',
                  code: 'WSUNS06',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Geography',
                  code: 'WSUNS07',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Agriculture',
                  code: 'WSUNS08',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Life Sciences', 'Mathematics'],
                  },
                },
                {
                  name: 'BSc Biochemistry',
                  code: 'WSUNS09',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Life Sciences', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Microbiology',
                  code: 'WSUNS10',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Life Sciences'],
                  },
                },
                // Diplomas
                {
                  name: 'National Diploma Agriculture',
                  code: 'WSUNS11',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'National Diploma Analytical Chemistry',
                  code: 'WSUNS12',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma Nature Conservation',
                  code: 'WSUNS13',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Science, Engineering and Technology',
              code: 'SET',
              description: 'Engineering, IT, construction, and technology programmes',
              courses: [
                // BEng Degrees
                {
                  name: 'BEng Civil Engineering',
                  code: 'WSUSET01',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 34,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Electrical Engineering',
                  code: 'WSUSET02',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 34,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Mechanical Engineering',
                  code: 'WSUSET03',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 34,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                // BSc IT/Computer Science
                {
                  name: 'BSc Computer Science',
                  code: 'WSUSET04',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Information Systems',
                  code: 'WSUSET05',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28, requiredSubjects: ['Mathematics'] },
                },
                // Engineering Diplomas
                {
                  name: 'National Diploma Engineering: Civil',
                  code: 'WSUSET06',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma Engineering: Electrical',
                  code: 'WSUSET07',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma Engineering: Mechanical',
                  code: 'WSUSET08',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma Engineering: Industrial',
                  code: 'WSUSET09',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                // IT and Building Diplomas
                {
                  name: 'National Diploma Information Technology',
                  code: 'WSUSET10',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'National Diploma Informatics',
                  code: 'WSUSET11',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'National Diploma Building',
                  code: 'WSUSET12',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma Quantity Surveying',
                  code: 'WSUSET13',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'National Diploma Operations Management',
                  code: 'WSUSET14',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                    requiredSubjects: ['Mathematics'],
                  },
                },
              ],
            },
            {
              name: 'Extended Curriculum Programmes',
              code: 'ECP',
              description: 'Foundation programmes with extended duration for additional support',
              courses: [
                {
                  name: 'Extended BCom Accounting',
                  code: 'WSUECP01',
                  level: 'undergraduate',
                  durationYears: 4,
                  description: 'Extended programme with foundation year',
                  requirements: { minimumAps: 24, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'Extended BEng Civil Engineering',
                  code: 'WSUECP02',
                  level: 'undergraduate',
                  durationYears: 5,
                  description: 'Extended programme with foundation year',
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'Extended BSc Natural Sciences',
                  code: 'WSUECP03',
                  level: 'undergraduate',
                  durationYears: 4,
                  description: 'Extended programme with foundation year',
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
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
              name: 'Faculty of Business, Management Sciences and Law',
              code: 'BMS',
              description: 'Postgraduate business, management, and legal qualifications',
              courses: [
                // BTech Programmes
                {
                  name: 'BTech Cost and Management Accounting',
                  code: 'WSUBS10',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Financial Accounting',
                  code: 'WSUBS11',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Public Management',
                  code: 'WSUBS12',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Marketing',
                  code: 'WSUBS13',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Human Resource Management',
                  code: 'WSUBS14',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                // Honours Degrees
                {
                  name: 'BCom Honours Accounting',
                  code: 'WSUBS15',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BCom Honours Business Management',
                  code: 'WSUBS16',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BCom Honours Economics',
                  code: 'WSUBS17',
                  level: 'honours',
                  durationYears: 1,
                },
                // Masters Programmes
                {
                  name: 'MCom Accounting',
                  code: 'WSUBS20',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MCom Business Management',
                  code: 'WSUBS21',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MCom Economics',
                  code: 'WSUBS22',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MTech Public Management',
                  code: 'WSUBS23',
                  level: 'masters',
                  durationYears: 2,
                  description: 'UoT masters qualification',
                },
                {
                  name: 'LLM Master of Laws',
                  code: 'WSUBS24',
                  level: 'masters',
                  durationYears: 1,
                },
                // Doctoral Programmes
                {
                  name: 'DCom Commerce',
                  code: 'WSUBS30',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Business Management',
                  code: 'WSUBS31',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'DTech Public Management',
                  code: 'WSUBS32',
                  level: 'doctoral',
                  durationYears: 3,
                  description: 'UoT doctoral qualification',
                },
              ],
            },
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Postgraduate education qualifications',
              courses: [
                // Postgraduate Diplomas
                {
                  name: 'PGCE Postgraduate Certificate in Education',
                  code: 'WSUED10',
                  level: 'postgraduate',
                  durationYears: 1,
                },
                {
                  name: 'Advanced Certificate in Education',
                  code: 'WSUED11',
                  level: 'certificate',
                  durationYears: 1,
                },
                // Honours Programmes
                {
                  name: 'BEd Honours Educational Leadership',
                  code: 'WSUED12',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BEd Honours Curriculum Studies',
                  code: 'WSUED13',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BEd Honours Inclusive Education',
                  code: 'WSUED14',
                  level: 'honours',
                  durationYears: 1,
                },
                // Masters Programmes
                {
                  name: 'MEd Education Management',
                  code: 'WSUED20',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MEd Curriculum Studies',
                  code: 'WSUED21',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MEd Educational Psychology',
                  code: 'WSUED22',
                  level: 'masters',
                  durationYears: 2,
                },
                // Doctoral Programmes
                {
                  name: 'DEd Education Management',
                  code: 'WSUED30',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Education',
                  code: 'WSUED31',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Humanities and Social Sciences',
              code: 'HSS',
              description: 'Postgraduate arts and social sciences qualifications',
              courses: [
                // Honours Programmes
                {
                  name: 'BA Honours Psychology',
                  code: 'WSUSS10',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BA Honours Social Work',
                  code: 'WSUSS11',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BA Honours Development Studies',
                  code: 'WSUSS12',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BA Honours Communication Studies',
                  code: 'WSUSS13',
                  level: 'honours',
                  durationYears: 1,
                },
                // Masters Programmes
                {
                  name: 'MA Psychology (Clinical)',
                  code: 'WSUSS20',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MA Social Work',
                  code: 'WSUSS21',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MA Development Studies',
                  code: 'WSUSS22',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MA Communication Studies',
                  code: 'WSUSS23',
                  level: 'masters',
                  durationYears: 2,
                },
                // Doctoral Programmes
                {
                  name: 'PhD Social Sciences',
                  code: 'WSUSS30',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Psychology',
                  code: 'WSUSS31',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Development Studies',
                  code: 'WSUSS32',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Health Sciences',
              code: 'HS',
              description: 'Postgraduate health sciences qualifications',
              courses: [
                // BTech Programmes
                {
                  name: 'BTech Radiography',
                  code: 'WSUHS15',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Environmental Health',
                  code: 'WSUHS16',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Emergency Medical Care',
                  code: 'WSUHS17',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                // Honours Programmes
                {
                  name: 'BSc Honours Nursing Science',
                  code: 'WSUHS18',
                  level: 'honours',
                  durationYears: 1,
                },
                // Masters Programmes
                {
                  name: 'MPharm Pharmacy',
                  code: 'WSUHS20',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MSc Nursing',
                  code: 'WSUHS21',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MTech Health Sciences',
                  code: 'WSUHS22',
                  level: 'masters',
                  durationYears: 2,
                  description: 'UoT masters qualification',
                },
                // Doctoral Programmes
                {
                  name: 'PhD Pharmacy',
                  code: 'WSUHS30',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Nursing',
                  code: 'WSUHS31',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'DTech Health Sciences',
                  code: 'WSUHS32',
                  level: 'doctoral',
                  durationYears: 3,
                  description: 'UoT doctoral qualification',
                },
              ],
            },
            {
              name: 'Faculty of Natural Sciences',
              code: 'NS',
              description: 'Postgraduate natural sciences qualifications',
              courses: [
                // BTech Programmes
                {
                  name: 'BTech Agriculture',
                  code: 'WSUNS14',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Analytical Chemistry',
                  code: 'WSUNS15',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Nature Conservation',
                  code: 'WSUNS16',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                // Honours Programmes
                {
                  name: 'BSc Honours Biological Sciences',
                  code: 'WSUNS17',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BSc Honours Chemistry',
                  code: 'WSUNS18',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BSc Honours Mathematics',
                  code: 'WSUNS19',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BSc Honours Environmental Science',
                  code: 'WSUNS20',
                  level: 'honours',
                  durationYears: 1,
                },
                // Masters Programmes
                {
                  name: 'MSc Biological Sciences',
                  code: 'WSUNS21',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MSc Chemistry',
                  code: 'WSUNS22',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MSc Mathematics',
                  code: 'WSUNS23',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MSc Environmental Science',
                  code: 'WSUNS24',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MTech Agriculture',
                  code: 'WSUNS25',
                  level: 'masters',
                  durationYears: 2,
                  description: 'UoT masters qualification',
                },
                // Doctoral Programmes
                {
                  name: 'PhD Biological Sciences',
                  code: 'WSUNS30',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Chemistry',
                  code: 'WSUNS31',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Mathematics',
                  code: 'WSUNS32',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'DTech Agriculture',
                  code: 'WSUNS33',
                  level: 'doctoral',
                  durationYears: 3,
                  description: 'UoT doctoral qualification',
                },
              ],
            },
            {
              name: 'Faculty of Science, Engineering and Technology',
              code: 'SET',
              description: 'Postgraduate engineering and technology qualifications',
              courses: [
                // BTech Programmes
                {
                  name: 'BTech Civil Engineering',
                  code: 'WSUST10',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Electrical Engineering',
                  code: 'WSUST11',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Mechanical Engineering',
                  code: 'WSUST12',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Industrial Engineering',
                  code: 'WSUST13',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Information Technology',
                  code: 'WSUST14',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Building',
                  code: 'WSUST15',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                {
                  name: 'BTech Quantity Surveying',
                  code: 'WSUST16',
                  level: 'btech',
                  durationYears: 1,
                  description: 'UoT qualification following National Diploma',
                },
                // Honours Programmes
                {
                  name: 'BSc Honours Computer Science',
                  code: 'WSUST17',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BSc Honours Information Systems',
                  code: 'WSUST18',
                  level: 'honours',
                  durationYears: 1,
                },
                // Masters Programmes
                {
                  name: 'MEng Civil Engineering',
                  code: 'WSUST20',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MEng Electrical Engineering',
                  code: 'WSUST21',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MEng Mechanical Engineering',
                  code: 'WSUST22',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MTech Engineering',
                  code: 'WSUST23',
                  level: 'masters',
                  durationYears: 2,
                  description: 'UoT masters qualification',
                },
                {
                  name: 'MSc Computer Science',
                  code: 'WSUST24',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MSc Information Systems',
                  code: 'WSUST25',
                  level: 'masters',
                  durationYears: 2,
                },
                // Doctoral Programmes
                {
                  name: 'PhD Engineering',
                  code: 'WSUST30',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Computer Science',
                  code: 'WSUST31',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'DTech Engineering',
                  code: 'WSUST32',
                  level: 'doctoral',
                  durationYears: 3,
                  description: 'UoT doctoral qualification',
                },
              ],
            },
          ],
        },
      ],
    },
  ],

  stats: {
    totalCampuses: 1,
    totalFaculties: 7,
    totalCourses: 156,
  },
}
