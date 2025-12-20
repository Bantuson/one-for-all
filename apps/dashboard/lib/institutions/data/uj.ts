/**
 * University of Johannesburg Pre-Configured Data
 *
 * One of South Africa's largest universities, established 2005.
 * 9 faculties across 4 campuses in the Johannesburg/Soweto area.
 * Comprehensive university offering degrees, diplomas, and certificates.
 */

import type { PreConfiguredInstitution } from '../types'

export const UJ_DATA: PreConfiguredInstitution = {
  id: 'uj',
  name: 'University of Johannesburg',
  shortName: 'UJ',
  type: 'university',
  website: 'https://www.uj.ac.za',
  contactEmail: 'info@uj.ac.za',
  city: 'Johannesburg',
  province: 'Gauteng',

  campuses: [
    {
      name: 'Auckland Park Kingsway Campus',
      code: 'APK',
      location: 'Auckland Park, Johannesburg',
      address: { city: 'Johannesburg', province: 'Gauteng' },
      isMain: true,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'College of Business and Economics',
              code: 'CBE',
              description: 'Business, economics, finance, and management programmes',
              courses: [
                // Accounting
                {
                  name: 'BCom Accounting',
                  code: 'CB001',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BCom Financial Accounting',
                  code: 'CB002',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BCom Management Accounting',
                  code: 'CB003',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BCom Internal Auditing',
                  code: 'CB004',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                // Economics & Finance
                {
                  name: 'BCom Economics',
                  code: 'CB005',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BCom Econometrics',
                  code: 'CB006',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BCom Finance',
                  code: 'CB007',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BCom Investment Management',
                  code: 'CB008',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BCom Financial Planning',
                  code: 'CB009',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                // Management
                {
                  name: 'BCom Business Management',
                  code: 'CB010',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BCom Marketing Management',
                  code: 'CB011',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BCom Human Resource Management',
                  code: 'CB012',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BCom Strategic Management',
                  code: 'CB013',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BCom Entrepreneurship',
                  code: 'CB014',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BCom Industrial Psychology',
                  code: 'CB015',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                  },
                },
                // Public Management
                {
                  name: 'BCom Public Administration',
                  code: 'CB016',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BCom Public Financial Management',
                  code: 'CB017',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                // Information Technology
                {
                  name: 'BCom Information Technology',
                  code: 'CB018',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BCom Informatics',
                  code: 'CB019',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                // Tourism & Hospitality
                {
                  name: 'BCom Tourism Management',
                  code: 'CB020',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BCom Hospitality Management',
                  code: 'CB021',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                // Law
                {
                  name: 'BCom Law',
                  code: 'CB022',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Art, Design and Architecture',
              code: 'FADA',
              description: 'Creative arts, design, architecture, and visual communication',
              courses: [
                // Architecture
                {
                  name: 'BA Architecture',
                  code: 'FA001',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BA Interior Design',
                  code: 'FA002',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Urban Design',
                  code: 'FA003',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                  },
                },
                // Design
                {
                  name: 'BA Fashion Design',
                  code: 'FA004',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Graphic Design',
                  code: 'FA005',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Industrial Design',
                  code: 'FA006',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Jewellery Design and Manufacture',
                  code: 'FA007',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                // Multimedia & Visual Arts
                {
                  name: 'BA Multimedia',
                  code: 'FA008',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Visual Art',
                  code: 'FA009',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Fine Arts',
                  code: 'FA010',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Photography',
                  code: 'FA011',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, languages, and communication',
              courses: [
                // Communication
                {
                  name: 'BA Communication Studies',
                  code: 'HU001',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Strategic Communication',
                  code: 'HU002',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Journalism',
                  code: 'HU003',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Public Relations Management',
                  code: 'HU004',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                // Psychology
                {
                  name: 'BA Psychology',
                  code: 'HU005',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                  },
                },
                {
                  name: 'BA Counselling Psychology',
                  code: 'HU006',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                  },
                },
                // Social Sciences
                {
                  name: 'BA Sociology',
                  code: 'HU007',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Political Studies',
                  code: 'HU008',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA International Relations',
                  code: 'HU009',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Anthropology',
                  code: 'HU010',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                // Social Work
                {
                  name: 'BA Social Work',
                  code: 'HU011',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                // Languages
                {
                  name: 'BA English',
                  code: 'HU012',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA African Languages',
                  code: 'HU013',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BA French',
                  code: 'HU014',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BA Linguistics',
                  code: 'HU015',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                // History & Philosophy
                {
                  name: 'BA History',
                  code: 'HU016',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BA Philosophy',
                  code: 'HU017',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
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
                  code: 'LW001',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                  },
                },
                {
                  name: 'BA Law',
                  code: 'LW002',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                  },
                },
              ],
            },
            {
              name: 'Faculty of Science',
              code: 'SCI',
              description: 'Natural sciences, mathematics, and technology programmes',
              courses: [
                // Computer Science & IT
                {
                  name: 'BSc Computer Science',
                  code: 'SC001',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Informatics',
                  code: 'SC002',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Information Technology',
                  code: 'SC003',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Data Science',
                  code: 'SC004',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                // Chemistry
                {
                  name: 'BSc Chemistry',
                  code: 'SC005',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Applied Chemistry',
                  code: 'SC006',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Biochemistry',
                  code: 'SC007',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                // Physics & Mathematics
                {
                  name: 'BSc Physics',
                  code: 'SC008',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Applied Physics',
                  code: 'SC009',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Mathematics',
                  code: 'SC010',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Applied Mathematics',
                  code: 'SC011',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Statistics',
                  code: 'SC012',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                // Biological Sciences
                {
                  name: 'BSc Botany',
                  code: 'SC013',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'BSc Zoology',
                  code: 'SC014',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'BSc Biological Sciences',
                  code: 'SC015',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'BSc Environmental Science',
                  code: 'SC016',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                // Geology
                {
                  name: 'BSc Geology',
                  code: 'SC017',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Geography',
                  code: 'SC018',
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
          type: 'diploma',
          displayName: 'Diploma Programmes',
          faculties: [
            {
              name: 'College of Business and Economics',
              code: 'CBE',
              description: 'Business and management diplomas',
              courses: [
                {
                  name: 'National Diploma: Accountancy',
                  code: 'CBD01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'National Diploma: Internal Auditing',
                  code: 'CBD02',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'National Diploma: Business Management',
                  code: 'CBD03',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                  },
                },
                {
                  name: 'National Diploma: Marketing',
                  code: 'CBD04',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                  },
                },
                {
                  name: 'National Diploma: Logistics',
                  code: 'CBD05',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                  },
                },
                {
                  name: 'National Diploma: Small Business Management',
                  code: 'CBD06',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 20,
                  },
                },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Communication and public relations diplomas',
              courses: [
                {
                  name: 'National Diploma: Public Relations',
                  code: 'HUD01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'postgraduate',
          displayName: 'BTech Programmes',
          faculties: [
            {
              name: 'College of Business and Economics',
              code: 'CBE',
              description: 'Advanced business qualifications',
              courses: [
                {
                  name: 'BTech Internal Auditing',
                  code: 'CBB01',
                  level: 'postgraduate',
                  durationYears: 1,
                  requirements: {
                    minimumAps: 26,
                    additionalRequirements: ['National Diploma in relevant field'],
                  },
                },
                {
                  name: 'BTech Cost and Management Accounting',
                  code: 'CBB02',
                  level: 'postgraduate',
                  durationYears: 1,
                  requirements: {
                    minimumAps: 26,
                    additionalRequirements: ['National Diploma in relevant field'],
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'honours',
          displayName: 'Honours Programmes',
          faculties: [
            {
              name: 'College of Business and Economics',
              code: 'CBE',
              description: 'Business and economics honours',
              courses: [
                {
                  name: 'BCom Hons Accounting',
                  code: 'CB101',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BCom Hons Economics',
                  code: 'CB102',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BCom Hons Finance',
                  code: 'CB103',
                  level: 'honours',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Science',
              code: 'SCI',
              description: 'Science honours',
              courses: [
                {
                  name: 'BSc Hons Computer Science',
                  code: 'SC101',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BSc Hons Mathematics',
                  code: 'SC102',
                  level: 'honours',
                  durationYears: 1,
                },
              ],
            },
          ],
        },
        {
          type: 'masters',
          displayName: 'Masters Programmes',
          faculties: [
            {
              name: 'Johannesburg Business School',
              code: 'JBS',
              description: 'Executive and business masters programmes',
              courses: [
                {
                  name: 'MBA Master of Business Administration',
                  code: 'JB201',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MPhil Business Management',
                  code: 'JB202',
                  level: 'masters',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'College of Business and Economics',
              code: 'CBE',
              description: 'Business and economics masters',
              courses: [
                {
                  name: 'MCom Financial Management',
                  code: 'CB201',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MCom Economics',
                  code: 'CB202',
                  level: 'masters',
                  durationYears: 2,
                },
              ],
            },
          ],
        },
        {
          type: 'doctoral',
          displayName: 'Doctoral Programmes',
          faculties: [
            {
              name: 'Johannesburg Business School',
              code: 'JBS',
              description: 'Business doctoral programmes',
              courses: [
                {
                  name: 'PhD Management',
                  code: 'JB301',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Auckland Park Bunting Road Campus',
      code: 'APB',
      location: 'Auckland Park, Johannesburg',
      address: { city: 'Johannesburg', province: 'Gauteng' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'College of Business and Economics',
              code: 'CBE',
              description: 'Business management and entrepreneurship programmes',
              courses: [
                {
                  name: 'BCom Business Management',
                  code: 'CB023',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BCom Retail Management',
                  code: 'CB024',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BCom Transport Economics',
                  code: 'CB025',
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
      ],
    },
    {
      name: 'Doornfontein Campus',
      code: 'DFC',
      location: 'Doornfontein, Johannesburg',
      address: { city: 'Johannesburg', province: 'Gauteng' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Health Sciences',
              code: 'FHS',
              description: 'Medical and health sciences programmes',
              courses: [
                // Nursing
                {
                  name: 'BNurs Nursing Science',
                  code: 'FH001',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                // Optometry
                {
                  name: 'BOptom Optometry',
                  code: 'FH002',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 34,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                // Podiatry
                {
                  name: 'BPod Podiatry',
                  code: 'FH003',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                // Sport & Movement Studies
                {
                  name: 'BA Sport and Movement Studies',
                  code: 'FH004',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BA Sport Management',
                  code: 'FH005',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BA Biokinetics',
                  code: 'FH006',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                // Biomedical Sciences
                {
                  name: 'BSc Biomedical Technology',
                  code: 'FH007',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Environmental Health',
                  code: 'FH008',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'BSc Human Anatomy',
                  code: 'FH009',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'BSc Human Physiology',
                  code: 'FH010',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Engineering and the Built Environment',
              code: 'FEBE',
              description: 'Engineering and built environment programmes',
              courses: [
                // Engineering
                {
                  name: 'BEng Civil Engineering',
                  code: 'FE001',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Electrical Engineering',
                  code: 'FE002',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Electronic Engineering',
                  code: 'FE003',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Mechanical Engineering',
                  code: 'FE004',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Metallurgical Engineering',
                  code: 'FE005',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Mining Engineering',
                  code: 'FE006',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Industrial Engineering',
                  code: 'FE007',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Chemical Engineering',
                  code: 'FE008',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                // Built Environment
                {
                  name: 'BSc Construction Management',
                  code: 'FE009',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Quantity Surveying',
                  code: 'FE010',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BSc Town and Regional Planning',
                  code: 'FE011',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Science',
              code: 'SCI',
              description: 'Applied science programmes at DFC',
              courses: [
                {
                  name: 'BSc Medical Laboratory Technology',
                  code: 'SC019',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'diploma',
          displayName: 'Diploma Programmes',
          faculties: [
            {
              name: 'Faculty of Health Sciences',
              code: 'FHS',
              description: 'Health sciences diplomas',
              courses: [
                {
                  name: 'National Diploma: Emergency Medical Care',
                  code: 'FHD01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 24,
                    requiredSubjects: ['Life Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Radiography',
                  code: 'FHD02',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Engineering and the Built Environment',
              code: 'FEBE',
              description: 'Engineering technology diplomas',
              courses: [
                {
                  name: 'National Diploma: Civil Engineering Technology',
                  code: 'FED01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Electrical Engineering Technology',
                  code: 'FED02',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Mechanical Engineering Technology',
                  code: 'FED03',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Chemical Engineering Technology',
                  code: 'FED04',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'National Diploma: Metallurgical Engineering Technology',
                  code: 'FED05',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'honours',
          displayName: 'Honours Programmes',
          faculties: [
            {
              name: 'Faculty of Engineering and the Built Environment',
              code: 'FEBE',
              description: 'Engineering honours',
              courses: [
                {
                  name: 'BEng Hons Civil Engineering',
                  code: 'FE101',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BEng Hons Electrical Engineering',
                  code: 'FE102',
                  level: 'honours',
                  durationYears: 1,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      name: 'Soweto Campus',
      code: 'SWC',
      location: 'Soweto, Johannesburg',
      address: { city: 'Johannesburg', province: 'Gauteng' },
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Education',
              code: 'EDUC',
              description: 'Teacher training and educational development',
              courses: [
                {
                  name: 'BEd Foundation Phase Teaching',
                  code: 'ED001',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BEd Intermediate Phase Teaching',
                  code: 'ED002',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BEd Senior Phase Teaching',
                  code: 'ED003',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BEd FET Phase Teaching',
                  code: 'ED004',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BA Education',
                  code: 'ED005',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BSc Education (Science & Mathematics)',
                  code: 'ED006',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEd Early Childhood Development',
                  code: 'ED007',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 26,
                  },
                },
              ],
            },
            {
              name: 'Faculty of Law',
              code: 'LAW',
              description: 'Legal studies programmes',
              courses: [
                {
                  name: 'LLB Bachelor of Laws',
                  code: 'LW003',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                  },
                },
              ],
            },
            {
              name: 'Community Development and Access Programmes',
              code: 'CDAP',
              description: 'Extended curriculum and access programmes',
              courses: [
                {
                  name: 'BCom Extended Programme',
                  code: 'CD001',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BSc Extended Programme',
                  code: 'CD002',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 26,
                  },
                },
                {
                  name: 'BEng Extended Programme',
                  code: 'CD003',
                  level: 'undergraduate',
                  durationYears: 5,
                  requirements: {
                    minimumAps: 28,
                  },
                },
                {
                  name: 'BEd Extended Programme',
                  code: 'CD004',
                  level: 'undergraduate',
                  durationYears: 5,
                  requirements: {
                    minimumAps: 24,
                  },
                },
              ],
            },
          ],
        },
        {
          type: 'diploma',
          displayName: 'Diploma Programmes',
          faculties: [
            {
              name: 'Faculty of Education',
              code: 'EDUC',
              description: 'Education diplomas',
              courses: [
                {
                  name: 'National Diploma: Education',
                  code: 'EDD01',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 22,
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
              name: 'Faculty of Education',
              code: 'EDUC',
              description: 'Education postgraduate programmes',
              courses: [
                {
                  name: 'PGCE Postgraduate Certificate in Education',
                  code: 'ED201',
                  level: 'postgraduate',
                  durationYears: 1,
                },
                {
                  name: 'BEd Hons Education',
                  code: 'ED101',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'MEd Educational Leadership',
                  code: 'ED202',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MEd Curriculum Studies',
                  code: 'ED203',
                  level: 'masters',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'Faculty of Law',
              code: 'LAW',
              description: 'Legal postgraduate programmes',
              courses: [
                {
                  name: 'LLM Master of Laws',
                  code: 'LW201',
                  level: 'masters',
                  durationYears: 1,
                },
                {
                  name: 'LLD Doctor of Laws',
                  code: 'LW301',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
          ],
        },
      ],
    },
  ],

  stats: {
    totalCampuses: 4,
    totalFaculties: 9,
    totalCourses: 195,
  },
}
