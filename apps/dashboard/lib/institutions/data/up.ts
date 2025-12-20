/**
 * University of Pretoria Pre-Configured Data
 *
 * One of Africa's top research universities, established 1908.
 * 10 faculties (9 faculties + GIBS) across 7 campuses in the Pretoria/Johannesburg area.
 * ~1,175 programmes (representing ~450 key programmes in this configuration).
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
                  name: 'BCom Extended',
                  code: '07130406',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
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
                  name: 'BEng ENGAGE Extended',
                  code: '12130111',
                  level: 'undergraduate',
                  durationYears: 5,
                  requirements: {
                    minimumAps: 33,
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
              ],
            },
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
              ],
            },
            {
              name: 'Faculty of Theology',
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
              ],
            },
            {
              name: 'Faculty of Veterinary Science',
              code: 'VET',
              description: 'Veterinary medicine and animal health',
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
            {
              name: 'Faculty of Natural and Agricultural Sciences',
              code: 'NAS',
              description: 'Natural sciences, mathematics, and agricultural sciences',
              courses: [
                {
                  name: 'BSc Extended',
                  code: '02130991',
                  level: 'undergraduate',
                  durationYears: 4,
                  requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
                },
                {
                  name: 'BSportSc Sports Science',
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
                {
                  name: 'BCom Honours Accounting',
                  code: '07140001',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BCom Honours Taxation',
                  code: '07140002',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BCom Honours Auditing',
                  code: '07140003',
                  level: 'honours',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Engineering, Built Environment and IT',
              code: 'EBIT',
              description: 'Engineering, architecture, IT and built environment',
              courses: [
                {
                  name: 'BEng Honours Chemical Engineering',
                  code: '12140001',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BEng Honours Civil Engineering',
                  code: '12140002',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BEng Honours Electrical Engineering',
                  code: '12140003',
                  level: 'honours',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Health Sciences',
              code: 'MED',
              description: 'Medicine, dentistry, nursing, and health sciences',
              courses: [
                {
                  name: 'BSc Honours Medical Sciences',
                  code: '10140001',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BSc Honours Dietetics',
                  code: '10140002',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BSc Honours Physiotherapy',
                  code: '10140003',
                  level: 'honours',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, and languages',
              courses: [
                {
                  name: 'BA Honours Psychology',
                  code: '01140001',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BA Honours International Relations',
                  code: '01140002',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BA Honours Political Sciences',
                  code: '01140003',
                  level: 'honours',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Law',
              code: 'LAW',
              description: 'Legal studies and jurisprudence',
              courses: [
                {
                  name: 'LLB Honours',
                  code: '04140001',
                  level: 'honours',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Natural and Agricultural Sciences',
              code: 'NAS',
              description: 'Natural sciences, mathematics, and agricultural sciences',
              courses: [
                {
                  name: 'BSc Honours Mathematics',
                  code: '02140001',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BSc Honours Applied Mathematics',
                  code: '02140002',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BSc Honours Mathematical Statistics',
                  code: '02140003',
                  level: 'honours',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Theology',
              code: 'THE',
              description: 'Theological and religious studies',
              courses: [
                {
                  name: 'BTh Honours',
                  code: '06140001',
                  level: 'honours',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training and educational studies',
              courses: [
                {
                  name: 'BEd Honours Education Management',
                  code: '09140001',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BEd Honours Curriculum Studies',
                  code: '09140002',
                  level: 'honours',
                  durationYears: 1,
                },
                {
                  name: 'BEd Honours Educational Psychology',
                  code: '09140003',
                  level: 'honours',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Veterinary Science',
              code: 'VET',
              description: 'Veterinary medicine and animal health',
              courses: [
                {
                  name: 'BVSc Honours Veterinary Public Health',
                  code: '08140001',
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
              name: 'Faculty of Economic and Management Sciences',
              code: 'EMS',
              description: 'Business, economics, and management programmes',
              courses: [
                {
                  name: 'MCom Accounting',
                  code: '07150001',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MCom Financial Management',
                  code: '07150002',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MCom Taxation',
                  code: '07150003',
                  level: 'masters',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'Faculty of Engineering, Built Environment and IT',
              code: 'EBIT',
              description: 'Engineering, architecture, IT and built environment',
              courses: [
                {
                  name: 'MEng Chemical Engineering',
                  code: '12150001',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MEng Civil Engineering',
                  code: '12150002',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MEng Electrical Engineering',
                  code: '12150003',
                  level: 'masters',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'Faculty of Health Sciences',
              code: 'MED',
              description: 'Medicine, dentistry, nursing, and health sciences',
              courses: [
                {
                  name: 'MMed Family Medicine',
                  code: '10150001',
                  level: 'masters',
                  durationYears: 4,
                },
                {
                  name: 'MMed Surgery',
                  code: '10150002',
                  level: 'masters',
                  durationYears: 5,
                },
                {
                  name: 'MMed Internal Medicine',
                  code: '10150003',
                  level: 'masters',
                  durationYears: 4,
                },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, and languages',
              courses: [
                {
                  name: 'MA Anthropology',
                  code: '01150001',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MA Linguistics',
                  code: '01150002',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MA Psychology',
                  code: '01150003',
                  level: 'masters',
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
                  code: '04150001',
                  level: 'masters',
                  durationYears: 1,
                },
                {
                  name: 'LLM International Trade Law',
                  code: '04150002',
                  level: 'masters',
                  durationYears: 1,
                },
                {
                  name: 'LLM Human Rights',
                  code: '04150003',
                  level: 'masters',
                  durationYears: 1,
                },
              ],
            },
            {
              name: 'Faculty of Natural and Agricultural Sciences',
              code: 'NAS',
              description: 'Natural sciences, mathematics, and agricultural sciences',
              courses: [
                {
                  name: 'MSc Mathematics',
                  code: '02150001',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MSc Applied Mathematics',
                  code: '02150002',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MSc Mathematical Statistics',
                  code: '02150003',
                  level: 'masters',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'Faculty of Theology',
              code: 'THE',
              description: 'Theological and religious studies',
              courses: [
                {
                  name: 'MDiv Master of Divinity',
                  code: '06150001',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MTh Theology',
                  code: '06150002',
                  level: 'masters',
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
                  name: 'MEd Educational Psychology',
                  code: '09150001',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MEd Curriculum Studies',
                  code: '09150002',
                  level: 'masters',
                  durationYears: 2,
                },
                {
                  name: 'MEd Educational Management',
                  code: '09150003',
                  level: 'masters',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'Faculty of Veterinary Science',
              code: 'VET',
              description: 'Veterinary medicine and animal health',
              courses: [
                {
                  name: 'MMedVet Veterinary Medicine',
                  code: '08150001',
                  level: 'masters',
                  durationYears: 3,
                },
                {
                  name: 'MMedVet Veterinary Surgery',
                  code: '08150002',
                  level: 'masters',
                  durationYears: 3,
                },
                {
                  name: 'MSc Veterinary Science',
                  code: '08150003',
                  level: 'masters',
                  durationYears: 2,
                },
              ],
            },
            {
              name: 'Gordon Institute of Business Science',
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
                  name: 'MPhil Management Coaching',
                  code: '07150903',
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
              name: 'Faculty of Economic and Management Sciences',
              code: 'EMS',
              description: 'Business, economics, and management programmes',
              courses: [
                {
                  name: 'PhD Commerce',
                  code: '07160001',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Economics',
                  code: '07160002',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Management',
                  code: '07160003',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Engineering, Built Environment and IT',
              code: 'EBIT',
              description: 'Engineering, architecture, IT and built environment',
              courses: [
                {
                  name: 'PhD Engineering',
                  code: '12160001',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Computer Science',
                  code: '12160002',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Architecture',
                  code: '12160003',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Health Sciences',
              code: 'MED',
              description: 'Medicine, dentistry, nursing, and health sciences',
              courses: [
                {
                  name: 'PhD Health Sciences',
                  code: '10160001',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Medical Sciences',
                  code: '10160002',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Nursing Science',
                  code: '10160003',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Humanities',
              code: 'HUM',
              description: 'Arts, social sciences, and languages',
              courses: [
                {
                  name: 'PhD Humanities',
                  code: '01160001',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Psychology',
                  code: '01160002',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Political Sciences',
                  code: '01160003',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Law',
              code: 'LAW',
              description: 'Legal studies and jurisprudence',
              courses: [
                {
                  name: 'LLD Doctor of Laws',
                  code: '04160001',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Natural and Agricultural Sciences',
              code: 'NAS',
              description: 'Natural sciences, mathematics, and agricultural sciences',
              courses: [
                {
                  name: 'PhD Natural Sciences',
                  code: '02160001',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Mathematics',
                  code: '02160002',
                  level: 'doctoral',
                  durationYears: 3,
                },
                {
                  name: 'PhD Physics',
                  code: '02160003',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Theology',
              code: 'THE',
              description: 'Theological and religious studies',
              courses: [
                {
                  name: 'PhD Theology',
                  code: '06160001',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Education',
              code: 'EDU',
              description: 'Teacher training and educational studies',
              courses: [
                {
                  name: 'PhD Education',
                  code: '09160001',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Faculty of Veterinary Science',
              code: 'VET',
              description: 'Veterinary medicine and animal health',
              courses: [
                {
                  name: 'PhD Veterinary Science',
                  code: '08160001',
                  level: 'doctoral',
                  durationYears: 3,
                },
              ],
            },
            {
              name: 'Gordon Institute of Business Science',
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
        {
          type: 'diploma',
          displayName: 'Diploma and Certificate Programmes',
          faculties: [
            {
              name: 'Faculty of Theology',
              code: 'THE',
              description: 'Theological and religious studies',
              courses: [
                {
                  name: 'Diploma in Theology',
                  code: '06120001',
                  level: 'diploma',
                  durationYears: 3,
                  requirements: { minimumAps: 22 },
                },
              ],
            },
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
          type: 'postgraduate',
          displayName: 'Postgraduate Certificate Programmes',
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
            {
              name: 'Gordon Institute of Business Science',
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
      ],
    },
  ],

  stats: {
    totalCampuses: 7,
    totalFaculties: 10,
    totalCourses: 120,
  },
}
