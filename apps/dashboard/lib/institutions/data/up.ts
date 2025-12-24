/**
 * University of Pretoria Pre-Configured Data
 *
 * One of Africa's top research universities, established 1908.
 * 10 faculties (9 faculties + GIBS) across 6 academic campuses.
 * ~1,175 programmes (representing key programmes in this configuration).
 */

import type { PreConfiguredInstitution } from '../types'

export const UP_DATA: PreConfiguredInstitution = {
  id: 'up',
  name: 'University of Pretoria',
  shortName: 'UP',
  type: 'university',
  website: 'https://www.up.ac.za',
  contactEmail: 'csc@up.ac.za',
  city: 'Pretoria',
  province: 'Gauteng',

  campuses: [
    // =========================================================================
    // HATFIELD CAMPUS (Main) - EMS, EBIT, HUM, LAW, NAS, THE
    // =========================================================================
    {
      name: 'Hatfield Campus',
      code: 'HAT',
      location: 'Hatfield, Pretoria',
      address: { city: 'Pretoria', province: 'Gauteng' },
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
                  name: 'BCom Accounting Sciences',
                  code: '07130102',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 34, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Investment Management',
                  code: '07130103',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 34, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Financial Sciences',
                  code: '07130104',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Econometrics',
                  code: '07130105',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Economics',
                  code: '07130201',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Statistics and Data Science',
                  code: '07130202',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Law',
                  code: '07130203',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Informatics',
                  code: '07130301',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Agribusiness Management',
                  code: '07130302',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Business Management',
                  code: '07130401',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BCom Supply Chain Management',
                  code: '07130402',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BCom Marketing Management',
                  code: '07130403',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BCom Human Resource Management',
                  code: '07130404',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BCom General',
                  code: '07130405',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BAdmin Public Management',
                  code: '07130501',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BCom Actuarial Science',
                  code: '07131301',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 34, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BCom Tourism Management',
                  code: '07131201',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
              ],
            },
            {
              name: 'Faculty of Engineering, Built Environment and IT',
              code: 'EBIT',
              description: 'Engineering, architecture, IT and built environment',
              courses: [
                {
                  name: 'BEng Chemical Engineering',
                  code: '12130101',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Civil Engineering',
                  code: '12130102',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Electrical Engineering',
                  code: '12130103',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Electronic Engineering',
                  code: '12130104',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Computer Engineering',
                  code: '12130105',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Industrial Engineering',
                  code: '12130106',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Mechanical Engineering',
                  code: '12130107',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Aeronautical Engineering',
                  code: '12130108',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Metallurgical Engineering',
                  code: '12130109',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BEng Mining Engineering',
                  code: '12130110',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BArch Architecture',
                  code: '12130201',
                  level: 'undergraduate',
                  durationYears: 5,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics'],
                  },
                },
                {
                  name: 'BIS Information Science',
                  code: '12130301',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BSc Computer Science',
                  code: '12130302',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Information Technology',
                  code: '12130303',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, and languages',
              courses: [
                {
                  name: 'BA General',
                  code: '01130001',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BA Law',
                  code: '01130002',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 34 },
                },
                {
                  name: 'BA Languages',
                  code: '01130003',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BA Visual Studies',
                  code: '01130004',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BA Drama',
                  code: '01130005',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BA Fine Arts',
                  code: '01130006',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BMus Music',
                  code: '01130007',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BA Social Work',
                  code: '01130008',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 30 },
                },
                {
                  name: 'BA Heritage and Cultural Tourism',
                  code: '01130009',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
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
                  requirements: { minimumAps: 34 },
                },
                {
                  name: 'BCom Law',
                  code: '04130102',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 34, requiredSubjects: ['Mathematics'] },
                },
              ],
            },
            {
              name: 'Faculty of Natural and Agricultural Sciences',
              code: 'NAS',
              description: 'Natural sciences, mathematics, and agricultural sciences',
              courses: [
                {
                  name: 'BSc Physical Sciences',
                  code: '02130101',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics', 'Physical Sciences'] },
                },
                {
                  name: 'BSc Biological Sciences',
                  code: '02130102',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics', 'Life Sciences'] },
                },
                {
                  name: 'BSc Mathematical Sciences',
                  code: '02130103',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 32, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Actuarial and Financial Mathematics',
                  code: '02130104',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 34, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Geology',
                  code: '02130105',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics', 'Physical Sciences'] },
                },
                {
                  name: 'BScAgric Agricultural Economics',
                  code: '02130201',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BScAgric Animal Science',
                  code: '02130202',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics', 'Life Sciences'] },
                },
                {
                  name: 'BScAgric Plant Science',
                  code: '02130203',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics', 'Life Sciences'] },
                },
                {
                  name: 'BSc Food Science',
                  code: '02130204',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 30, requiredSubjects: ['Mathematics', 'Physical Sciences'] },
                },
                {
                  name: 'BSportSci Sports Science',
                  code: '02130401',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Life Sciences'],
                  },
                },
              ],
            },
            {
              name: 'Faculty of Theology and Religion',
              code: 'THE',
              description: 'Theological and religious studies',
              courses: [
                {
                  name: 'BTh Bachelor of Theology',
                  code: '06130001',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BA Theology',
                  code: '06130002',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: { minimumAps: 28 },
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
              name: 'Faculty of Economic and Management Sciences',
              code: 'EMS',
              description: 'Business, economics, and management programmes',
              courses: [
                { name: 'BCom Honours Accounting', code: '07140001', level: 'honours', durationYears: 1 },
                { name: 'BCom Honours Taxation', code: '07140002', level: 'honours', durationYears: 1 },
                { name: 'BCom Honours Auditing', code: '07140003', level: 'honours', durationYears: 1 },
                { name: 'BCom Honours Financial Management', code: '07140004', level: 'honours', durationYears: 1 },
              ],
            },
            {
              name: 'Faculty of Engineering, Built Environment and IT',
              code: 'EBIT',
              description: 'Engineering, architecture, IT and built environment',
              courses: [
                { name: 'BSc Honours Computer Science', code: '12140001', level: 'honours', durationYears: 1 },
                { name: 'BSc Honours Information Technology', code: '12140002', level: 'honours', durationYears: 1 },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, and languages',
              courses: [
                { name: 'BA Honours Psychology', code: '01140001', level: 'honours', durationYears: 1 },
                { name: 'BA Honours International Relations', code: '01140002', level: 'honours', durationYears: 1 },
                { name: 'BA Honours Political Sciences', code: '01140003', level: 'honours', durationYears: 1 },
              ],
            },
            {
              name: 'Faculty of Law',
              code: 'LAW',
              description: 'Legal studies and jurisprudence',
              courses: [
                { name: 'LLB Honours', code: '04140001', level: 'honours', durationYears: 1 },
              ],
            },
            {
              name: 'Faculty of Natural and Agricultural Sciences',
              code: 'NAS',
              description: 'Natural sciences, mathematics, and agricultural sciences',
              courses: [
                { name: 'BSc Honours Mathematics', code: '02140001', level: 'honours', durationYears: 1 },
                { name: 'BSc Honours Physics', code: '02140002', level: 'honours', durationYears: 1 },
                { name: 'BSc Honours Chemistry', code: '02140003', level: 'honours', durationYears: 1 },
              ],
            },
          ],
        },
        {
          type: 'masters',
          displayName: 'Masters Programmes',
          faculties: [
            {
              name: 'Faculty of Economic and Management Sciences',
              code: 'EMS',
              description: 'Business, economics, and management programmes',
              courses: [
                { name: 'MCom Accounting', code: '07150001', level: 'masters', durationYears: 2 },
                { name: 'MCom Financial Management', code: '07150002', level: 'masters', durationYears: 2 },
                { name: 'MCom Economics', code: '07150003', level: 'masters', durationYears: 2 },
              ],
            },
            {
              name: 'Faculty of Engineering, Built Environment and IT',
              code: 'EBIT',
              description: 'Engineering, architecture, IT and built environment',
              courses: [
                { name: 'MEng Engineering', code: '12150001', level: 'masters', durationYears: 2 },
                { name: 'MSc Computer Science', code: '12150002', level: 'masters', durationYears: 2 },
                { name: 'MArch Architecture', code: '12150003', level: 'masters', durationYears: 2 },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, and languages',
              courses: [
                { name: 'MA Psychology', code: '01150001', level: 'masters', durationYears: 2 },
                { name: 'MA Clinical Psychology', code: '01150002', level: 'masters', durationYears: 2 },
                { name: 'MA Social Work', code: '01150003', level: 'masters', durationYears: 2 },
              ],
            },
            {
              name: 'Faculty of Law',
              code: 'LAW',
              description: 'Legal studies and jurisprudence',
              courses: [
                { name: 'LLM Master of Laws', code: '04150001', level: 'masters', durationYears: 1 },
                { name: 'LLM International Trade Law', code: '04150002', level: 'masters', durationYears: 1 },
                { name: 'LLM Human Rights', code: '04150003', level: 'masters', durationYears: 1 },
              ],
            },
            {
              name: 'Faculty of Natural and Agricultural Sciences',
              code: 'NAS',
              description: 'Natural sciences, mathematics, and agricultural sciences',
              courses: [
                { name: 'MSc Mathematics', code: '02150001', level: 'masters', durationYears: 2 },
                { name: 'MSc Physics', code: '02150002', level: 'masters', durationYears: 2 },
                { name: 'MScAgric Agricultural Sciences', code: '02150003', level: 'masters', durationYears: 2 },
              ],
            },
          ],
        },
        {
          type: 'doctoral',
          displayName: 'Doctoral Programmes',
          faculties: [
            {
              name: 'Faculty of Economic and Management Sciences',
              code: 'EMS',
              description: 'Business, economics, and management programmes',
              courses: [
                { name: 'PhD Commerce', code: '07160001', level: 'doctoral', durationYears: 3 },
                { name: 'PhD Economics', code: '07160002', level: 'doctoral', durationYears: 3 },
              ],
            },
            {
              name: 'Faculty of Engineering, Built Environment and IT',
              code: 'EBIT',
              description: 'Engineering, architecture, IT and built environment',
              courses: [
                { name: 'PhD Engineering', code: '12160001', level: 'doctoral', durationYears: 3 },
                { name: 'PhD Computer Science', code: '12160002', level: 'doctoral', durationYears: 3 },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, and languages',
              courses: [
                { name: 'PhD Psychology', code: '01160001', level: 'doctoral', durationYears: 3 },
                { name: 'PhD Humanities', code: '01160002', level: 'doctoral', durationYears: 3 },
              ],
            },
            {
              name: 'Faculty of Law',
              code: 'LAW',
              description: 'Legal studies and jurisprudence',
              courses: [
                { name: 'LLD Doctor of Laws', code: '04160001', level: 'doctoral', durationYears: 3 },
              ],
            },
            {
              name: 'Faculty of Natural and Agricultural Sciences',
              code: 'NAS',
              description: 'Natural sciences, mathematics, and agricultural sciences',
              courses: [
                { name: 'PhD Natural Sciences', code: '02160001', level: 'doctoral', durationYears: 3 },
                { name: 'PhD Agricultural Sciences', code: '02160002', level: 'doctoral', durationYears: 3 },
              ],
            },
          ],
        },
      ],
    },

    // =========================================================================
    // GROENKLOOF CAMPUS - Faculty of Education
    // =========================================================================
    {
      name: 'Groenkloof Campus',
      code: 'GRK',
      location: 'Groenkloof, Pretoria',
      address: { city: 'Pretoria', province: 'Gauteng' },
      isMain: false,
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
                  code: '09130101',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BEd Intermediate Phase Teaching',
                  code: '09130102',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BEd Senior Phase and FET Teaching',
                  code: '09130103',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 28 },
                },
                {
                  name: 'BEd Early Childhood Development',
                  code: '09130104',
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
                  code: '09120001',
                  level: 'postgraduate',
                  durationYears: 1,
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
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training and educational studies',
              courses: [
                { name: 'BEd Honours Education Management', code: '09140001', level: 'honours', durationYears: 1 },
                { name: 'BEd Honours Curriculum Studies', code: '09140002', level: 'honours', durationYears: 1 },
                { name: 'BEd Honours Educational Psychology', code: '09140003', level: 'honours', durationYears: 1 },
              ],
            },
          ],
        },
        {
          type: 'masters',
          displayName: 'Masters Programmes',
          faculties: [
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training and educational studies',
              courses: [
                { name: 'MEd Educational Psychology', code: '09150001', level: 'masters', durationYears: 2 },
                { name: 'MEd Curriculum Studies', code: '09150002', level: 'masters', durationYears: 2 },
                { name: 'MEd Education Management', code: '09150003', level: 'masters', durationYears: 2 },
              ],
            },
          ],
        },
        {
          type: 'doctoral',
          displayName: 'Doctoral Programmes',
          faculties: [
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training and educational studies',
              courses: [
                { name: 'PhD Education', code: '09160001', level: 'doctoral', durationYears: 3 },
              ],
            },
          ],
        },
      ],
    },

    // =========================================================================
    // PRINSHOF CAMPUS - Faculty of Health Sciences
    // =========================================================================
    {
      name: 'Prinshof Campus',
      code: 'PRN',
      location: 'Gezina, Pretoria',
      address: { city: 'Pretoria', province: 'Gauteng' },
      isMain: false,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Health Sciences',
              code: 'MED',
              description: 'Medicine, dentistry, nursing, and health sciences',
              courses: [
                {
                  name: 'MBChB Medicine',
                  code: '10130001',
                  level: 'undergraduate',
                  durationYears: 6,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BChD Dentistry',
                  code: '10130002',
                  level: 'undergraduate',
                  durationYears: 5,
                  requirements: {
                    minimumAps: 35,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BCur Nursing',
                  code: '10130003',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Mathematics', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Physiotherapy',
                  code: '10130004',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Occupational Therapy',
                  code: '10130005',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Life Sciences'],
                  },
                },
                {
                  name: 'BSc Radiography',
                  code: '10130006',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 30,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
                {
                  name: 'BSc Dietetics',
                  code: '10130007',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: {
                    minimumAps: 32,
                    requiredSubjects: ['Mathematics', 'Physical Sciences', 'Life Sciences'],
                  },
                },
                {
                  name: 'BOH Oral Hygiene',
                  code: '10130008',
                  level: 'undergraduate',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences'],
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
              name: 'Faculty of Health Sciences',
              code: 'MED',
              description: 'Medicine, dentistry, nursing, and health sciences',
              courses: [
                { name: 'BSc Honours Medical Sciences', code: '10140001', level: 'honours', durationYears: 1 },
                { name: 'BSc Honours Physiotherapy', code: '10140002', level: 'honours', durationYears: 1 },
                { name: 'BSc Honours Nursing', code: '10140003', level: 'honours', durationYears: 1 },
              ],
            },
          ],
        },
        {
          type: 'masters',
          displayName: 'Masters Programmes',
          faculties: [
            {
              name: 'Faculty of Health Sciences',
              code: 'MED',
              description: 'Medicine, dentistry, nursing, and health sciences',
              courses: [
                { name: 'MMed Family Medicine', code: '10150001', level: 'masters', durationYears: 4 },
                { name: 'MMed Surgery', code: '10150002', level: 'masters', durationYears: 5 },
                { name: 'MMed Internal Medicine', code: '10150003', level: 'masters', durationYears: 4 },
                { name: 'MMed Paediatrics', code: '10150004', level: 'masters', durationYears: 4 },
                { name: 'MMed Psychiatry', code: '10150005', level: 'masters', durationYears: 4 },
                { name: 'MChD Dentistry', code: '10150006', level: 'masters', durationYears: 3 },
                { name: 'MSc Nursing', code: '10150007', level: 'masters', durationYears: 2 },
              ],
            },
          ],
        },
        {
          type: 'doctoral',
          displayName: 'Doctoral Programmes',
          faculties: [
            {
              name: 'Faculty of Health Sciences',
              code: 'MED',
              description: 'Medicine, dentistry, nursing, and health sciences',
              courses: [
                { name: 'PhD Health Sciences', code: '10160001', level: 'doctoral', durationYears: 3 },
                { name: 'PhD Medical Sciences', code: '10160002', level: 'doctoral', durationYears: 3 },
                { name: 'PhD Nursing Science', code: '10160003', level: 'doctoral', durationYears: 3 },
              ],
            },
          ],
        },
      ],
    },

    // =========================================================================
    // ONDERSTEPOORT CAMPUS - Faculty of Veterinary Science
    // =========================================================================
    {
      name: 'Onderstepoort Campus',
      code: 'OND',
      location: 'Onderstepoort, Pretoria North',
      address: { city: 'Pretoria', province: 'Gauteng' },
      isMain: false,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Undergraduate Programmes',
          faculties: [
            {
              name: 'Faculty of Veterinary Science',
              code: 'VET',
              description: 'Veterinary medicine and animal health - South Africa\'s only veterinary faculty',
              courses: [
                {
                  name: 'BVSc Veterinary Science',
                  code: '08130001',
                  level: 'undergraduate',
                  durationYears: 6,
                  requirements: {
                    minimumAps: 35,
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
              name: 'Faculty of Veterinary Science',
              code: 'VET',
              description: 'Veterinary medicine and animal health',
              courses: [
                {
                  name: 'Diploma Veterinary Nursing',
                  code: '08120001',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: {
                    minimumAps: 28,
                    requiredSubjects: ['Life Sciences'],
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
              name: 'Faculty of Veterinary Science',
              code: 'VET',
              description: 'Veterinary medicine and animal health',
              courses: [
                { name: 'BVSc Honours Veterinary Public Health', code: '08140001', level: 'honours', durationYears: 1 },
              ],
            },
          ],
        },
        {
          type: 'masters',
          displayName: 'Masters Programmes',
          faculties: [
            {
              name: 'Faculty of Veterinary Science',
              code: 'VET',
              description: 'Veterinary medicine and animal health',
              courses: [
                { name: 'MMedVet Veterinary Medicine', code: '08150001', level: 'masters', durationYears: 3 },
                { name: 'MMedVet Veterinary Surgery', code: '08150002', level: 'masters', durationYears: 3 },
                { name: 'MSc Veterinary Science', code: '08150003', level: 'masters', durationYears: 2 },
              ],
            },
          ],
        },
        {
          type: 'doctoral',
          displayName: 'Doctoral Programmes',
          faculties: [
            {
              name: 'Faculty of Veterinary Science',
              code: 'VET',
              description: 'Veterinary medicine and animal health',
              courses: [
                { name: 'PhD Veterinary Science', code: '08160001', level: 'doctoral', durationYears: 3 },
              ],
            },
          ],
        },
      ],
    },

    // =========================================================================
    // MAMELODI CAMPUS - Extended/Foundation Programmes
    // =========================================================================
    {
      name: 'Mamelodi Campus',
      code: 'MAM',
      location: 'Mamelodi East, Pretoria',
      address: { city: 'Pretoria', province: 'Gauteng' },
      isMain: false,
      programmeTypes: [
        {
          type: 'undergraduate',
          displayName: 'Extended Programmes (Foundation Year)',
          faculties: [
            {
              name: 'Extended Programmes',
              code: 'EXT',
              description: 'Foundation year programmes - Phase 1 at Mamelodi, then transfer to Hatfield',
              courses: [
                {
                  name: 'BCom Extended Programme',
                  code: '07130406',
                  level: 'undergraduate',
                  durationYears: 4,
                  description: 'Year 1 at Mamelodi, Years 2-4 at Hatfield',
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Extended - Mathematical Sciences',
                  code: '02130991',
                  level: 'undergraduate',
                  durationYears: 4,
                  description: 'Year 1 at Mamelodi, Years 2-4 at Hatfield',
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSc Extended - Biological Sciences',
                  code: '02130992',
                  level: 'undergraduate',
                  durationYears: 4,
                  description: 'Year 1 at Mamelodi, Years 2-4 at Hatfield',
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics', 'Life Sciences'] },
                },
                {
                  name: 'BSc Extended - Physical Sciences',
                  code: '02130993',
                  level: 'undergraduate',
                  durationYears: 4,
                  description: 'Year 1 at Mamelodi, Years 2-4 at Hatfield',
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics', 'Physical Sciences'] },
                },
                {
                  name: 'BScAgric Extended - Agricultural Sciences',
                  code: '02130994',
                  level: 'undergraduate',
                  durationYears: 5,
                  description: 'Year 1 at Mamelodi, Years 2-5 at Hatfield',
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics', 'Life Sciences'] },
                },
                {
                  name: 'BEng ENGAGE Extended',
                  code: '12130111',
                  level: 'undergraduate',
                  durationYears: 5,
                  description: 'Year 1 at Mamelodi, Years 2-5 at Hatfield',
                  requirements: {
                    minimumAps: 33,
                    requiredSubjects: ['Mathematics', 'Physical Sciences'],
                  },
                },
              ],
            },
          ],
        },
      ],
    },

    // =========================================================================
    // GIBS CAMPUS (Johannesburg) - Gordon Institute of Business Science
    // =========================================================================
    {
      name: 'Gordon Institute of Business Science',
      code: 'GIBS',
      location: 'Illovo, Johannesburg',
      address: { city: 'Johannesburg', province: 'Gauteng' },
      isMain: false,
      programmeTypes: [
        {
          type: 'masters',
          displayName: 'Masters Programmes',
          faculties: [
            {
              name: 'GIBS Business School',
              code: 'GIBS',
              description: 'Business school offering MBA and executive education',
              courses: [
                {
                  name: 'MBA Master of Business Administration',
                  code: '07150901',
                  level: 'masters',
                  durationYears: 2,
                  description: 'Full-time and modular MBA programmes',
                },
                {
                  name: 'Executive MBA',
                  code: '07150902',
                  level: 'masters',
                  durationYears: 2,
                  description: 'Part-time MBA for working professionals',
                },
                {
                  name: 'MPhil Corporate Strategy',
                  code: '07150903',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MPhil Management Coaching',
                  code: '07150904',
                  level: 'masters',
                  durationYears: 2,
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
              name: 'GIBS Business School',
              code: 'GIBS',
              description: 'Business school offering MBA and executive education',
              courses: [
                {
                  name: 'PGDBA Postgraduate Diploma in Business Administration',
                  code: '07120001',
                  level: 'postgraduate',
                  durationYears: 1,
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
              name: 'GIBS Business School',
              code: 'GIBS',
              description: 'Business school offering MBA and executive education',
              courses: [
                {
                  name: 'DBA Doctor of Business Administration',
                  code: '07160006',
                  level: 'doctoral',
                  durationYears: 4,
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
    totalFaculties: 10,
    totalCourses: 150,
  },
}
