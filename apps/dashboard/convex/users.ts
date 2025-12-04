import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Sync user from Clerk to Convex database
export const syncUser = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    profileImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', args.clerkUserId))
      .unique()

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        profileImageUrl: args.profileImageUrl,
        updatedAt: Date.now(),
      })
      return existingUser._id
    }

    const userId = await ctx.db.insert('users', {
      clerkUserId: args.clerkUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      profileImageUrl: args.profileImageUrl,
      onboardingCompleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return userId
  },
})

// Get current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', identity.subject))
      .unique()

    return user
  },
})

// Check if user needs onboarding
export const needsOnboarding = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return true

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', identity.subject))
      .unique()

    return !user || !user.onboardingCompleted
  },
})

// Mark onboarding as complete
export const completeOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error('Not authenticated')

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerk_user', (q) => q.eq('clerkUserId', identity.subject))
      .unique()

    if (!user) throw new Error('User not found')

    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
      updatedAt: Date.now(),
    })
  },
})
