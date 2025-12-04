import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Create new institution
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    type: v.union(
      v.literal('university'),
      v.literal('college'),
      v.literal('nsfas'),
      v.literal('bursary_provider')
    ),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    website: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    // Check slug uniqueness
    const existing = await ctx.db
      .query('institutions')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (existing) {
      throw new Error('Institution with this slug already exists')
    }

    // Create institution
    const institutionId = await ctx.db.insert('institutions', {
      name: args.name,
      slug: args.slug,
      type: args.type,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      website: args.website,
      logoUrl: args.logoUrl,
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // Get user
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', identity.subject))
      .unique()

    if (!user) throw new Error('User not found')

    // Assign institution_admin role
    const adminRole = await ctx.db
      .query('roles')
      .withIndex('by_name', (q) => q.eq('name', 'institution_admin'))
      .unique()

    if (adminRole) {
      await ctx.db.insert('userRoles', {
        userId: user._id,
        roleId: adminRole._id,
        institutionId: institutionId,
        assignedBy: user._id,
        createdAt: Date.now(),
      })
    }

    return institutionId
  },
})

// Get institution by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('institutions')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
  },
})

// List all active institutions
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('institutions')
      .withIndex('by_status', (q) => q.eq('status', 'active'))
      .collect()
  },
})
