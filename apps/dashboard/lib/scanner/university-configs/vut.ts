/**
 * Vaal University of Technology Configuration
 *
 * University of Technology established in 2004, formerly Vaal Triangle Technikon (1979-2003).
 * Main campus in Vanderbijlpark with satellite campuses in Secunda, Ekurhuleni, and Upington.
 */

import type { UniversityConfig } from './types'

export const VUT_CONFIG: UniversityConfig = {
  name: 'Vaal University of Technology',
  shortName: 'VUT',
  type: 'university-of-technology',
  domains: ['vut.ac.za', 'www.vut.ac.za'],

  faculties: [
    {
      name: 'Faculty of Applied and Computer Sciences',
      slug: 'faculty-of-applied-computer-sciences',
      aliases: ['Applied Sciences', 'Computer Sciences', 'IT', 'Applied & Computer Sciences'],
    },
    {
      name: 'Faculty of Engineering and Technology',
      slug: 'faculty-of-engineering-technology',
      aliases: ['Engineering', 'Technology', 'Engineering & Technology'],
    },
    {
      name: 'Faculty of Human Sciences',
      slug: 'faculty-of-human-sciences',
      aliases: ['Human Sciences', 'Humanities'],
    },
    {
      name: 'Faculty of Management Sciences',
      slug: 'faculty-of-management-sciences',
      aliases: ['Management', 'Management Sciences', 'Business'],
    },
  ],

  campuses: [
    {
      name: 'Vanderbijlpark Campus',
      location: 'Vanderbijlpark, Gauteng',
      isMain: true,
      aliases: ['Vanderbijlpark', 'Main Campus', 'VDP'],
    },
    {
      name: 'Secunda Campus',
      location: 'Secunda, Mpumalanga',
      aliases: ['Secunda', 'Highveld Ridge Campus'],
    },
    {
      name: 'Ekurhuleni Campus',
      location: 'Ekurhuleni (Daveyton), Gauteng',
      aliases: ['Ekurhuleni', 'Daveyton', 'Kempton Park'],
    },
    {
      name: 'Upington Campus',
      location: 'Upington, Northern Cape',
      aliases: ['Upington'],
    },
  ],

  urlPatterns: {
    faculty: /\/facult(y|ies)/i,
    programme: /\/programme|\/courses?|\/qualification/i,
    campus: /\/campus|vanderbijlpark|secunda|ekurhuleni|upington|daveyton/i,
  },

  selectors: {
    mainContent: 'main, .content, .page-content',
    facultyList: '.faculties, .faculty-list',
    programmeList: '.programmes, .courses, .qualification-list',
  },

  establishedYear: 2004,
  city: 'Vanderbijlpark',
  province: 'Gauteng',
}
