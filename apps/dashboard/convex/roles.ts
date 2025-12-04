import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Seed default roles (run once on setup)
export const seedDefaultRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const roles = [
      {
        name: 'super_admin',
        description: 'Platform-wide administrator',
        permissions: ['*'],
        isSystemRole: true,
      },
      {
        name: 'institution_admin',
        description: 'Institution administrator',
        permissions: [
          'institutions:read',
          'institutions:update',
          'users:invite',
          'applications:*',
          'campuses:*',
          'faculties:*',
        ],
        isSystemRole: true,
      },
      {
        name: 'reviewer',
        description: 'Application reviewer',
        permissions: ['applications:read', 'applications:review', 'applications:comment'],
        isSystemRole: true,
      },
      {
        name: 'applicant',
        description: 'Applicant user',
        permissions: ['applications:create', 'applications:read_own'],
        isSystemRole: true,
      },
    ]

    for (const role of roles) {
      const existing = await ctx.db
        .query('roles')
        .withIndex('by_name', (q) => q.eq('name', role.name))
        .unique()

      if (!existing) {
        await ctx.db.insert('roles', {
          ...role,
          createdAt: Date.now(),
        })
      }
    }

    return { message: 'Default roles seeded successfully' }
  },
})

// Check if user has a specific permission
export const hasPermission = query({
  args: {
    permission: v.string(),
    institutionId: v.optional(v.id('institutions')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return false

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', identity.subject))
      .unique()

    if (!user) return false

    // Get user roles
    const userRolesQuery = ctx.db
      .query('userRoles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))

    const userRoles = args.institutionId
      ? await userRolesQuery
          .filter((q) => q.eq(q.field('institutionId'), args.institutionId))
          .collect()
      : await userRolesQuery.collect()

    // Check permissions
    for (const userRole of userRoles) {
      const role = await ctx.db.get(userRole.roleId)
      if (role && (role.permissions.includes('*') || role.permissions.includes(args.permission))) {
        return true
      }
    }

    return false
  },
})

// Get user's roles for an institution
export const getUserRoles = query({
  args: {
    institutionId: v.optional(v.id('institutions')),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return []

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', identity.subject))
      .unique()

    if (!user) return []

    const userRolesQuery = ctx.db
      .query('userRoles')
      .withIndex('by_user', (q) => q.eq('userId', user._id))

    const userRoles = args.institutionId
      ? await userRolesQuery
          .filter((q) => q.eq(q.field('institutionId'), args.institutionId))
          .collect()
      : await userRolesQuery.collect()

    // Fetch full role details
    const roles = await Promise.all(
      userRoles.map(async (ur) => {
        const role = await ctx.db.get(ur.roleId)
        return {
          ...ur,
          role,
        }
      })
    )

    return roles
  },
})
