import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to add categories");
    }

    // Check if category already exists
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existing) {
      throw new Error("Category already exists");
    }

    await ctx.db.insert("categories", {
      name: args.name,
      color: args.color,
      userId,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to delete categories");
    }

    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    if (category.userId !== userId) {
      throw new Error("Not authorized to delete this category");
    }

    // Check if any todos use this category
    const todosWithCategory = await ctx.db
      .query("todos")
      .withIndex("by_user_and_category", (q) => 
        q.eq("userId", userId).eq("category", category.name)
      )
      .first();

    if (todosWithCategory) {
      throw new Error("Cannot delete category that has todos. Move or delete todos first.");
    }

    await ctx.db.delete(args.id);
  },
});
