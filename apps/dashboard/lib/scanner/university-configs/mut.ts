/**
 * Mangosuthu University of Technology Configuration
 *
 * University of Technology in KwaZulu-Natal. Founded in 1979 as Mangosuthu Technikon,
 * renamed to MUT in 2007. Located in Umlazi overlooking the Indian Ocean.
 */

import type { UniversityConfig } from './types'

export const MUT_CONFIG: UniversityConfig = {
  name: 'Mangosuthu University of Technology',
  shortName: 'MUT',
  type: 'university-of-technology',
  domains: ['mut.ac.za', 'www.mut.ac.za'],

  faculties: [
    {
      name: 'Faculty of Engineering',
      slug: 'faculty-of-engineering',
      aliases: ['Engineering'],
    },
    {
      name: 'Faculty of Management Sciences',
      slug: 'faculty-of-management-sciences',
      aliases: ['Management', 'Management Sciences', 'Business'],
    },
    {
      name: 'Faculty of Natural Sciences',
      slug: 'faculty-of-natural-sciences',
      aliases: ['Natural Sciences', 'Science'],
    },
  ],

  campuses: [
    {
      name: 'Umlazi Campus',
      location: 'Umlazi, Durban, KwaZulu-Natal',
      isMain: true,
      aliases: ['Umlazi', 'Main Campus'],
    },
    {
      name: 'City Campus',
      location: 'Durban, KwaZulu-Natal',
      aliases: ['City', 'Durban City', 'City Centre'],
    },
  ],

  urlPatterns: {
    faculty: /\/facult(y|ies)/i,
    programme: /\/programme|\/courses?|\/qualification/i,
    campus: /\/campus|umlazi|city/i,
  },

  selectors: {
    mainContent: 'main, .content, .page-content',
    facultyList: '.faculties, .faculty-list',
    programmeList: '.programmes, .courses, .qualification-list',
  },

  establishedYear: 1979,
  city: 'Durban',
  province: 'KwaZulu-Natal',
}
