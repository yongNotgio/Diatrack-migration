import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listBySecretary = query({
  args: { secretaryId: v.id("secretaries") },
  handler: async (ctx, { secretaryId }) => {
    const links = await ctx.db
      .query("secretary_doctor_links")
      .withIndex("by_secretary", (q) => q.eq("secretary_id", secretaryId))
      .collect();

    const result = [];
    for (const link of links) {
      const doctor = await ctx.db.get(link.doctor_id);
      result.push({
        ...link,
        link_id: link._id,
        doctors: doctor
          ? {
              doctor_id: doctor._id,
              first_name: doctor.first_name,
              last_name: doctor.last_name,
              specialization: doctor.specialization,
            }
          : null,
      });
    }
    return result;
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const links = await ctx.db.query("secretary_doctor_links").collect();
    const result = [];
    for (const link of links) {
      const secretary = await ctx.db.get(link.secretary_id);
      const doctor = await ctx.db.get(link.doctor_id);
      result.push({
        ...link,
        link_id: link._id,
        secretaries: secretary
          ? { first_name: secretary.first_name, last_name: secretary.last_name }
          : null,
        doctors: doctor
          ? { first_name: doctor.first_name, last_name: doctor.last_name }
          : null,
      });
    }
    return result;
  },
});

export const create = mutation({
  args: {
    secretary_id: v.id("secretaries"),
    doctor_id: v.id("doctors"),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("secretary_doctor_links", args);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("secretary_doctor_links") },
  handler: async (ctx, { id }) => {
    const link = await ctx.db.get(id);
    if (link) {
      const secretary = await ctx.db.get(link.secretary_id);
      const doctor = await ctx.db.get(link.doctor_id);
      await ctx.db.delete(id);
      return {
        ...link,
        link_id: id,
        secretaries: secretary
          ? { first_name: secretary.first_name, last_name: secretary.last_name }
          : null,
        doctors: doctor
          ? { first_name: doctor.first_name, last_name: doctor.last_name }
          : null,
      };
    }
    await ctx.db.delete(id);
    return null;
  },
});
