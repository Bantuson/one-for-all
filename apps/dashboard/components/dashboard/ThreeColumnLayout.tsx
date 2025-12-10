'use client'

import { useState } from 'react'
import { ChevronRight, Plus, GraduationCap, Building } from 'lucide-react'
import Link from 'next/link'

interface Course {
  id: string
  name: string
  code: string
  status: string
}

interface Faculty {
  id: string
  name: string
  code: string
  courses: Course[]
}

interface Campus {
  id: string
  name: string
  code: string
  faculties: Faculty[]
}

interface ThreeColumnLayoutProps {
  campuses: Campus[]
  institutionSlug: string
}

export function ThreeColumnLayout({
  campuses,
  institutionSlug,
}: ThreeColumnLayoutProps) {
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(
    campuses[0] || null
  )
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(
    campuses[0]?.faculties[0] || null
  )

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Column 1: Campuses */}
      <div className="w-80 border-r bg-gray-50 dark:bg-gray-950 overflow-y-auto">
        <div className="p-4 border-b bg-white dark:bg-black flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-sm">Campuses</h2>
            <span className="text-xs text-gray-500">({campuses.length})</span>
          </div>
          <button
            className="text-blue-600 hover:text-blue-700 transition-colors"
            title="Add Campus"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {campuses.map((campus) => (
            <button
              key={campus.id}
              onClick={() => {
                setSelectedCampus(campus)
                setSelectedFaculty(campus.faculties[0] || null)
              }}
              className={`w-full px-4 py-3 text-left hover:bg-white dark:hover:bg-gray-900 flex justify-between items-center transition-colors ${
                selectedCampus?.id === campus.id
                  ? 'bg-white dark:bg-gray-900 border-l-4 border-blue-600'
                  : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{campus.name}</div>
                <div className="text-xs text-gray-500">
                  {campus.faculties.length} faculties •{' '}
                  {campus.faculties.reduce(
                    (sum, f) => sum + f.courses.length,
                    0
                  )}{' '}
                  courses
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Column 2: Faculties */}
      <div className="w-80 border-r bg-gray-50 dark:bg-gray-950 overflow-y-auto">
        <div className="p-4 border-b bg-white dark:bg-black flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-gray-500" />
            <h2 className="font-semibold text-sm">Faculties</h2>
            {selectedCampus && (
              <span className="text-xs text-gray-500">
                ({selectedCampus.faculties.length})
              </span>
            )}
          </div>
          <button
            className="text-blue-600 hover:text-blue-700 transition-colors"
            title="Add Faculty"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {selectedCampus ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {selectedCampus.faculties.map((faculty) => (
              <button
                key={faculty.id}
                onClick={() => setSelectedFaculty(faculty)}
                className={`w-full px-4 py-3 text-left hover:bg-white dark:hover:bg-gray-900 transition-colors ${
                  selectedFaculty?.id === faculty.id
                    ? 'bg-white dark:bg-gray-900 border-l-4 border-blue-600'
                    : ''
                }`}
              >
                <div className="font-medium text-sm">{faculty.name}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {faculty.code && `${faculty.code} • `}
                  {faculty.courses.length} courses
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-gray-500">
            Select a campus to view faculties
          </div>
        )}
      </div>

      {/* Column 3: Courses */}
      <div className="flex-1 bg-white dark:bg-black overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center sticky top-0 z-10 bg-white dark:bg-black">
          <div>
            <h2 className="font-semibold text-sm">Courses</h2>
            {selectedFaculty && (
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedFaculty.name}
              </p>
            )}
          </div>
          <button
            className="text-blue-600 hover:text-blue-700 transition-colors"
            title="Add Course"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {selectedFaculty ? (
          selectedFaculty.courses.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {selectedFaculty.courses.map((course) => (
                <div
                  key={course.id}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{course.name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {course.code}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded ${
                            course.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          {course.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-2xl font-bold text-blue-600">
                        0
                      </div>
                      <div className="text-xs text-gray-500">Applications</div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/dashboard/${institutionSlug}/courses/${course.id}/applications`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View Applications →
                    </Link>
                    <Link
                      href={`/dashboard/${institutionSlug}/courses/${course.id}/settings`}
                      className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
                    >
                      Edit Course
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              <p>No courses in this faculty yet</p>
              <button className="mt-2 text-blue-600 hover:underline">
                Add your first course
              </button>
            </div>
          )
        ) : (
          <div className="p-8 text-center text-sm text-gray-500">
            Select a faculty to view courses
          </div>
        )}
      </div>
    </div>
  )
}
