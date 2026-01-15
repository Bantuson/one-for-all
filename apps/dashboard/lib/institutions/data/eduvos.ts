/**
 * Eduvos Pre-Configured Data
 *
 * Private higher education institution with 12 campuses across South Africa.
 * Rebranded from Pearson Institute in 2019.
 * DHET registered, CHE accredited.
 * 4 intakes per year: February, May, July, October
 *
 * Programme Distribution:
 * - Commerce, Humanities, Technology, Law: All 12 campuses
 * - Applied Science (Biomedicine, Biotech): Midrand & Pretoria only (requires labs)
 */

import type {
  PreConfiguredInstitution,
  PreConfiguredProgrammeType,
  PreConfiguredFaculty,
} from '../types'

// ============================================================================
// Core Faculties (Available at ALL campuses)
// ============================================================================

const FACULTY_COMMERCE: PreConfiguredFaculty = {
  name: 'Faculty of Commerce',
  code: 'COM',
  description: 'Business, accounting, marketing and management programmes',
  courses: [
    {
      name: 'BCom General',
      code: 'EDUCOM01',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - General commerce degree',
      requirements: { minimumAps: 24 },
      // Add opening and closing dates for automated system updates.
    },
    {
      name: 'BCom Accounting',
      code: 'EDUCOM02',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Professional accounting pathway',
      requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
    },
    {
      name: 'BCom Marketing Management',
      code: 'EDUCOM03',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Marketing and brand management',
      requirements: { minimumAps: 24 },
    },
    {
      name: 'BCom Human Resource Management',
      code: 'EDUCOM04',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Strategic HR and people management',
      requirements: { minimumAps: 24 },
    },
    {
      name: 'BCom Tourism Management',
      code: 'EDUCOM05',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Tourism and hospitality management',
      requirements: { minimumAps: 22 },
    },
    {
      name: 'BCom Law',
      code: 'EDUCOM06',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Business law and legal principles',
      requirements: { minimumAps: 24 },
    },
    {
      name: 'Bachelor of Business Administration',
      code: 'EDUCOM07',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - General business administration',
      requirements: { minimumAps: 22 },
    },
  ],
}

const FACULTY_HUMANITIES: PreConfiguredFaculty = {
  name: 'Faculty of Humanities',
  code: 'HUM',
  description: 'Psychology, arts, and graphic design programmes',
  courses: [
    {
      name: 'BA Psychology and English',
      code: 'EDUHUM01',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Combined psychology and literature',
      requirements: { minimumAps: 24 },
    },
    {
      name: 'BA Psychology and HR Management',
      code: 'EDUHUM02',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Applied psychology in workplace context',
      requirements: { minimumAps: 24 },
    },
    {
      name: 'BA Psychology and Political Science',
      code: 'EDUHUM03',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Social psychology and political systems',
      requirements: { minimumAps: 24 },
    },
    {
      name: 'BA Industrial Psychology and Linguistics',
      code: 'EDUHUM04',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Workplace psychology and language studies',
      requirements: { minimumAps: 24 },
    },
    {
      name: 'BA Graphic Design',
      code: 'EDUHUM05',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Visual communication and design',
      requirements: { minimumAps: 22 },
    },
  ],
}

const FACULTY_TECHNOLOGY: PreConfiguredFaculty = {
  name: 'Faculty of Technology',
  code: 'TECH',
  description: 'Computer science, IT, and emerging technology programmes',
  courses: [
    {
      name: 'BSc Computer Science',
      code: 'EDUTECH01',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Core computer science and programming',
      requirements: { minimumAps: 26, requiredSubjects: ['Mathematics'] },
    },
    {
      name: 'BSc IT (Software Engineering)',
      code: 'EDUTECH02',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Software development and engineering',
      requirements: { minimumAps: 24, requiredSubjects: ['Mathematics'] },
    },
    {
      name: 'BSc IT (Data Science)',
      code: 'EDUTECH03',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Big data analytics and machine learning',
      requirements: { minimumAps: 24, requiredSubjects: ['Mathematics'] },
    },
    {
      name: 'BSc IT (Security and Network Engineering)',
      code: 'EDUTECH04',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Cybersecurity and network infrastructure',
      requirements: { minimumAps: 24, requiredSubjects: ['Mathematics'] },
    },
    {
      name: 'BSc IT (Robotics)',
      code: 'EDUTECH05',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Robotics and automation systems',
      requirements: { minimumAps: 24, requiredSubjects: ['Mathematics'] },
    },
  ],
}

const FACULTY_LAW: PreConfiguredFaculty = {
  name: 'Faculty of Law',
  code: 'LAW',
  description: 'Legal studies and law programmes',
  courses: [
    {
      name: 'LLB (Bachelor of Laws)',
      code: 'EDULAW01',
      level: 'undergraduate',
      durationYears: 4,
      description: 'NQF 8 - Professional law degree',
      requirements: { minimumAps: 28 },
    },
  ],
}

// ============================================================================
// Applied Science Faculty (Midrand & Pretoria ONLY - requires specialized labs)
// ============================================================================

const FACULTY_APPLIED_SCIENCE: PreConfiguredFaculty = {
  name: 'Faculty of Applied Science',
  code: 'ASCI',
  description: 'Biomedicine and biotechnology programmes',
  courses: [
    {
      name: 'BSc Biomedicine',
      code: 'EDUASCI01',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Medical sciences and healthcare',
      requirements: {
        minimumAps: 26,
        requiredSubjects: ['Mathematics', 'Physical Sciences'],
      },
    },
    {
      name: 'BSc Biotechnology Management',
      code: 'EDUASCI02',
      level: 'undergraduate',
      durationYears: 3,
      description: 'NQF 7 - Biotech business and management',
      requirements: { minimumAps: 24, requiredSubjects: ['Life Sciences'] },
    },
  ],
}

// ============================================================================
// Certificate Faculties
// ============================================================================

const FACULTY_COMMERCE_CERT: PreConfiguredFaculty = {
  name: 'Faculty of Commerce',
  code: 'COM',
  description: 'Business and management certificates',
  courses: [
    {
      name: 'Higher Certificate in Business Management',
      code: 'EDUCOM08',
      level: 'certificate',
      durationYears: 1,
      description: 'NQF 5 - Foundation business qualification',
      requirements: { minimumAps: 18 },
    },
  ],
}

const FACULTY_TECHNOLOGY_CERT: PreConfiguredFaculty = {
  name: 'Faculty of Technology',
  code: 'TECH',
  description: 'IT foundation certificates',
  courses: [
    {
      name: 'Higher Certificate in Information Systems',
      code: 'EDUTECH06',
      level: 'certificate',
      durationYears: 1,
      description: 'NQF 5 - IT fundamentals and information systems',
      requirements: { minimumAps: 18 },
    },
  ],
}

const FACULTY_APPLIED_SCIENCE_CERT: PreConfiguredFaculty = {
  name: 'Faculty of Applied Science',
  code: 'ASCI',
  description: 'Bioscience foundation programmes',
  courses: [
    {
      name: 'Higher Certificate in Bioscience',
      code: 'EDUASCI03',
      level: 'certificate',
      durationYears: 1,
      description: 'NQF 5 - Foundation biological sciences',
      requirements: { minimumAps: 18 },
    },
  ],
}

// ============================================================================
// Honours Faculties
// ============================================================================

const FACULTY_COMMERCE_HONOURS: PreConfiguredFaculty = {
  name: 'Faculty of Commerce',
  code: 'COM',
  description: 'Postgraduate business studies',
  courses: [
    {
      name: 'BCom Honours in Business Management',
      code: 'EDUCOM09',
      level: 'honours',
      durationYears: 1,
      description: 'NQF 8 - Advanced business management',
      requirements: { minimumAps: 0 },
    },
  ],
}

const FACULTY_HUMANITIES_HONOURS: PreConfiguredFaculty = {
  name: 'Faculty of Humanities',
  code: 'HUM',
  description: 'Postgraduate design programmes',
  courses: [
    {
      name: 'BA Honours in Graphic Design',
      code: 'EDUHUM06',
      level: 'honours',
      durationYears: 1,
      description: 'NQF 8 - Advanced design studies',
      requirements: { minimumAps: 0 },
    },
  ],
}

const FACULTY_TECHNOLOGY_HONOURS: PreConfiguredFaculty = {
  name: 'Faculty of Technology',
  code: 'TECH',
  description: 'Postgraduate IT programmes',
  courses: [
    {
      name: 'BSc Honours in Information Technology',
      code: 'EDUTECH07',
      level: 'honours',
      durationYears: 1,
      description: 'NQF 8 - Advanced IT specialization',
      requirements: { minimumAps: 0 },
    },
  ],
}

// ============================================================================
// Masters Faculties
// ============================================================================

const FACULTY_LAW_MASTERS: PreConfiguredFaculty = {
  name: 'Faculty of Law',
  code: 'LAW',
  description: 'Postgraduate law programmes',
  courses: [
    {
      name: 'LLM Commercial Law',
      code: 'EDULAW02',
      level: 'masters',
      durationYears: 2,
      description: 'NQF 9 - Advanced commercial and corporate law',
      requirements: { minimumAps: 0 },
    },
  ],
}

// ============================================================================
// Programme Type Configurations
// ============================================================================

// Core undergraduate faculties (all campuses)
const UNDERGRADUATE_CORE: PreConfiguredProgrammeType = {
  type: 'undergraduate',
  displayName: 'Undergraduate Programmes',
  faculties: [
    FACULTY_COMMERCE,
    FACULTY_HUMANITIES,
    FACULTY_TECHNOLOGY,
    FACULTY_LAW,
  ],
}

// Full undergraduate with Applied Science (Midrand & Pretoria only)
const UNDERGRADUATE_WITH_APPLIED_SCIENCE: PreConfiguredProgrammeType = {
  type: 'undergraduate',
  displayName: 'Undergraduate Programmes',
  faculties: [
    FACULTY_COMMERCE,
    FACULTY_HUMANITIES,
    FACULTY_TECHNOLOGY,
    FACULTY_APPLIED_SCIENCE,
    FACULTY_LAW,
  ],
}

// Core certificate programmes (all campuses)
const CERTIFICATE_CORE: PreConfiguredProgrammeType = {
  type: 'certificate',
  displayName: 'Certificate Programmes',
  faculties: [FACULTY_COMMERCE_CERT, FACULTY_TECHNOLOGY_CERT],
}

// Full certificate with Applied Science (Midrand & Pretoria only)
const CERTIFICATE_WITH_APPLIED_SCIENCE: PreConfiguredProgrammeType = {
  type: 'certificate',
  displayName: 'Certificate Programmes',
  faculties: [
    FACULTY_COMMERCE_CERT,
    FACULTY_TECHNOLOGY_CERT,
    FACULTY_APPLIED_SCIENCE_CERT,
  ],
}

// Honours programmes (all campuses)
const HONOURS: PreConfiguredProgrammeType = {
  type: 'honours',
  displayName: 'Honours Programmes',
  faculties: [
    FACULTY_COMMERCE_HONOURS,
    FACULTY_HUMANITIES_HONOURS,
    FACULTY_TECHNOLOGY_HONOURS,
  ],
}

// Masters programmes (all campuses)
const MASTERS: PreConfiguredProgrammeType = {
  type: 'masters',
  displayName: 'Masters Programmes',
  faculties: [FACULTY_LAW_MASTERS],
}

// ============================================================================
// Campus-Specific Programme Configurations
// ============================================================================

// Full programmes (Midrand & Pretoria - with Applied Science)
const FULL_PROGRAMME_TYPES: PreConfiguredProgrammeType[] = [
  UNDERGRADUATE_WITH_APPLIED_SCIENCE,
  CERTIFICATE_WITH_APPLIED_SCIENCE,
  HONOURS,
  MASTERS,
]

// Core programmes (all other campuses - no Applied Science)
const CORE_PROGRAMME_TYPES: PreConfiguredProgrammeType[] = [
  UNDERGRADUATE_CORE,
  CERTIFICATE_CORE,
  HONOURS,
  MASTERS,
]

// ============================================================================
// Eduvos Institution Data
// ============================================================================

export const EDUVOS_DATA: PreConfiguredInstitution = {
  id: 'eduvos',
  name: 'Eduvos',
  shortName: 'Eduvos',
  type: 'college',
  website: 'https://www.eduvos.com',
  contactEmail: 'info@eduvos.com',
  city: 'Midrand',
  province: 'Gauteng',

  campuses: [
    // Midrand - Headquarters (with Applied Science labs)
    {
      name: 'Midrand Campus',
      code: 'MID',
      location: 'Midrand, Gauteng',
      address: { city: 'Midrand', province: 'Gauteng' },
      isMain: true,
      programmeTypes: FULL_PROGRAMME_TYPES,
    },
    // Pretoria (with Applied Science labs)
    {
      name: 'Pretoria Campus',
      code: 'PTA',
      location: 'Menlo Park, Pretoria',
      address: { city: 'Pretoria', province: 'Gauteng' },
      programmeTypes: FULL_PROGRAMME_TYPES,
    },
    // All other campuses - core programmes only
    {
      name: 'Bedfordview Campus',
      code: 'BED',
      location: 'Bedfordview, Gauteng',
      address: { city: 'Johannesburg', province: 'Gauteng' },
      programmeTypes: CORE_PROGRAMME_TYPES,
    },
    {
      name: 'Vanderbijlpark Campus',
      code: 'VAN',
      location: 'Vanderbijlpark, Gauteng',
      address: { city: 'Vanderbijlpark', province: 'Gauteng' },
      programmeTypes: CORE_PROGRAMME_TYPES,
    },
    {
      name: 'Durban Campus',
      code: 'DUR',
      location: 'Umhlanga, Durban',
      address: { city: 'Durban', province: 'KwaZulu-Natal' },
      programmeTypes: CORE_PROGRAMME_TYPES,
    },
    {
      name: 'Cape Town Tyger Valley Campus',
      code: 'CPT1',
      location: 'Bellville, Cape Town',
      address: { city: 'Cape Town', province: 'Western Cape' },
      programmeTypes: CORE_PROGRAMME_TYPES,
    },
    {
      name: 'Cape Town Mowbray Campus',
      code: 'CPT2',
      location: 'Mowbray, Cape Town',
      address: { city: 'Cape Town', province: 'Western Cape' },
      programmeTypes: CORE_PROGRAMME_TYPES,
    },
    {
      name: 'Bloemfontein Campus',
      code: 'BLM',
      location: 'Bloemfontein, Free State',
      address: { city: 'Bloemfontein', province: 'Free State' },
      programmeTypes: CORE_PROGRAMME_TYPES,
    },
    {
      name: 'East London Campus',
      code: 'EL',
      location: 'East London, Eastern Cape',
      address: { city: 'East London', province: 'Eastern Cape' },
      programmeTypes: CORE_PROGRAMME_TYPES,
    },
    {
      name: 'Nelson Mandela Bay Campus',
      code: 'NMB',
      location: 'Port Elizabeth, Eastern Cape',
      address: { city: 'Port Elizabeth', province: 'Eastern Cape' },
      programmeTypes: CORE_PROGRAMME_TYPES,
    },
    {
      name: 'Mbombela Campus',
      code: 'MBO',
      location: 'Mbombela, Mpumalanga',
      address: { city: 'Mbombela', province: 'Mpumalanga' },
      programmeTypes: CORE_PROGRAMME_TYPES,
    },
    {
      name: 'Potchefstroom Campus',
      code: 'POT',
      location: 'Potchefstroom, North West',
      address: { city: 'Potchefstroom', province: 'North West' },
      programmeTypes: CORE_PROGRAMME_TYPES,
    },
  ],

  stats: {
    totalCampuses: 12,
    totalFaculties: 5,
    totalCourses: 27,
  },
}
