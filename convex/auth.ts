import { convexAuth } from "@convex-dev/auth/server"
import { Password } from "@convex-dev/auth/providers/Password"
import { query } from "./_generated/server"
import { requireAuthUserId } from "./authHelpers"

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
})

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireAuthUserId(ctx)
    const user = await ctx.db.get(userId)
    if (!user) {
      return null
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      image: user.image,
    }
  },
})
