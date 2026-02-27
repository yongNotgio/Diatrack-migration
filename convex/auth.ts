import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const login = query({
  args: { email: v.string(), password: v.string(), role: v.string() },
  handler: async (ctx, { email, password, role }) => {
    let user: any = null;

    if (role === "admin") {
      user = await ctx.db
        .query("admins")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (user && user.password === password) {
        return { ...user, admin_id: user._id };
      }
    } else if (role === "doctor") {
      user = await ctx.db
        .query("doctors")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (user && user.password === password) {
        return { ...user, doctor_id: user._id };
      }
    } else if (role === "secretary") {
      user = await ctx.db
        .query("secretaries")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (user && user.password === password) {
        return { ...user, secretary_id: user._id };
      }
    }

    return null;
  },
});

export const signUpDoctor = mutation({
  args: {
    first_name: v.string(),
    last_name: v.string(),
    email: v.string(),
    password: v.string(),
    specialization: v.string(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("doctors", {
      ...args,
      doctor_is_in: false,
      created_at: Date.now(),
    });
    return id;
  },
});
