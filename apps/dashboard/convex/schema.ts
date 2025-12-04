import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // ============================================
  // USERS & AUTHENTICATION
  // ============================================
  users: defineTable({
    clerkUserId: v.string(), // Links to Clerk user
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phoneNumber: v.optional(v.string()),
    profileImageUrl: v.optional(v.string()),
    onboardingCompleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerk_user', ['clerkUserId'])
    .index('by_email', ['email']),

  // ============================================
  // MULTI-TENANT HIERARCHY
  // ============================================
  institutions: defineTable({
    name: v.string(),
    slug: v.string(), // e.g., "university-of-cape-town"
    type: v.union(
      v.literal('university'),
      v.literal('college'),
      v.literal('nsfas'),
      v.literal('bursary_provider')
    ),
    logoUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        province: v.string(),
        postalCode: v.string(),
        country: v.string(),
      })
    ),
    settings: v.optional(
      v.object({
        allowPublicApplications: v.boolean(),
        requireDocumentVerification: v.boolean(),
        enableAIProcessing: v.boolean(),
      })
    ),
    status: v.union(v.literal('active'), v.literal('inactive'), v.literal('suspended')),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_type', ['type'])
    .index('by_status', ['status']),

  campuses: defineTable({
    institutionId: v.id('institutions'),
    name: v.string(),
    slug: v.string(), // e.g., "main-campus"
    code: v.optional(v.string()), // e.g., "UCT-MAIN"
    address: v.optional(
      v.object({
        street: v.string(),
        city: v.string(),
        province: v.string(),
        postalCode: v.string(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_institution', ['institutionId'])
    .index('by_slug', ['slug']),

  faculties: defineTable({
    campusId: v.id('campuses'),
    institutionId: v.id('institutions'), // Denormalized for faster queries
    name: v.string(),
    slug: v.string(), // e.g., "engineering"
    code: v.optional(v.string()), // e.g., "ENG"
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_campus', ['campusId'])
    .index('by_institution', ['institutionId'])
    .index('by_slug', ['slug']),

  courses: defineTable({
    facultyId: v.id('faculties'),
    campusId: v.id('campuses'), // Denormalized
    institutionId: v.id('institutions'), // Denormalized
    name: v.string(),
    code: v.string(), // e.g., "CS101"
    description: v.optional(v.string()),
    level: v.union(
      v.literal('undergraduate'),
      v.literal('postgraduate'),
      v.literal('diploma'),
      v.literal('certificate')
    ),
    duration: v.optional(
      v.object({
        years: v.number(),
        semesters: v.number(),
      })
    ),
    requirements: v.optional(v.array(v.string())), // e.g., ["Matric", "60% Math"]
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_faculty', ['facultyId'])
    .index('by_campus', ['campusId'])
    .index('by_institution', ['institutionId'])
    .index('by_code', ['code']),

  // ============================================
  // ROLE-BASED ACCESS CONTROL (RBAC)
  // ============================================
  roles: defineTable({
    name: v.string(), // "super_admin", "institution_admin", "reviewer", "applicant"
    description: v.string(),
    permissions: v.array(v.string()), // ["institutions:create", "applications:review"]
    isSystemRole: v.boolean(), // Prevent modification of core roles
    createdAt: v.number(),
  }).index('by_name', ['name']),

  userRoles: defineTable({
    userId: v.id('users'),
    roleId: v.id('roles'),
    // Multi-tenant context (role applies to specific institution)
    institutionId: v.optional(v.id('institutions')),
    campusId: v.optional(v.id('campuses')),
    facultyId: v.optional(v.id('faculties')),
    // Metadata
    assignedBy: v.id('users'),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()), // For temporary roles
  })
    .index('by_user', ['userId'])
    .index('by_role', ['roleId'])
    .index('by_institution', ['institutionId'])
    .index('by_user_institution', ['userId', 'institutionId']),

  // ============================================
  // INVITATIONS & ONBOARDING
  // ============================================
  invitations: defineTable({
    email: v.string(),
    roleId: v.id('roles'),
    institutionId: v.optional(v.id('institutions')),
    campusId: v.optional(v.id('campuses')),
    invitedBy: v.id('users'),
    token: v.string(), // Unique invitation token
    status: v.union(
      v.literal('pending'),
      v.literal('accepted'),
      v.literal('expired'),
      v.literal('revoked')
    ),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_email', ['email'])
    .index('by_token', ['token'])
    .index('by_status', ['status'])
    .index('by_institution', ['institutionId']),

  // ============================================
  // APPLICATIONS
  // ============================================
  applications: defineTable({
    applicantId: v.id('users'),
    institutionId: v.id('institutions'),
    campusId: v.optional(v.id('campuses')),
    courseId: v.id('courses'),
    status: v.union(
      v.literal('draft'),
      v.literal('submitted'),
      v.literal('under_review'),
      v.literal('accepted'),
      v.literal('rejected')
    ),
    submittedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_applicant', ['applicantId'])
    .index('by_institution', ['institutionId'])
    .index('by_status', ['status']),
})
