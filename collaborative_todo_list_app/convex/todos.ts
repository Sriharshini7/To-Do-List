import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    category: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    completed: v.optional(v.boolean()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // If search is provided, use search index
    if (args.search && args.search.trim()) {
      let query = ctx.db
        .query("todos")
        .withSearchIndex("search_text", (q) => {
          let searchQuery = q.search("text", args.search!);
          searchQuery = searchQuery.eq("userId", userId);
          
          if (args.category) {
            searchQuery = searchQuery.eq("category", args.category);
          }
          if (args.completed !== undefined) {
            searchQuery = searchQuery.eq("isCompleted", args.completed);
          }
          
          return searchQuery;
        });
      
      const results = await query.collect();
      
      // Filter by priority if specified (search index doesn't support priority filtering)
      if (args.priority) {
        return results.filter(todo => todo.priority === args.priority);
      }
      
      return results;
    }

    // Regular filtering without search
    let query = ctx.db.query("todos").withIndex("by_user", (q) => q.eq("userId", userId));

    if (args.category) {
      query = ctx.db.query("todos").withIndex("by_user_and_category", (q) => 
        q.eq("userId", userId).eq("category", args.category!)
      );
    } else if (args.priority) {
      query = ctx.db.query("todos").withIndex("by_user_and_priority", (q) => 
        q.eq("userId", userId).eq("priority", args.priority!)
      );
    } else if (args.completed !== undefined) {
      query = ctx.db.query("todos").withIndex("by_user_and_completed", (q) => 
        q.eq("userId", userId).eq("isCompleted", args.completed!)
      );
    }

    const results = await query.order("desc").collect();

    // Apply additional filters
    return results.filter(todo => {
      if (args.category && todo.category !== args.category) return false;
      if (args.priority && todo.priority !== args.priority) return false;
      if (args.completed !== undefined && todo.isCompleted !== args.completed) return false;
      return true;
    });
  },
});

export const add = mutation({
  args: {
    text: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    deadline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to add todos");
    }

    await ctx.db.insert("todos", {
      text: args.text,
      description: args.description,
      isCompleted: false,
      userId,
      category: args.category,
      priority: args.priority,
      deadline: args.deadline,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("todos"),
    text: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    deadline: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to update todos");
    }

    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    if (todo.userId !== userId) {
      throw new Error("Not authorized to modify this todo");
    }

    const updates: any = {};
    if (args.text !== undefined) updates.text = args.text;
    if (args.description !== undefined) updates.description = args.description;
    if (args.category !== undefined) updates.category = args.category;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.deadline !== undefined) updates.deadline = args.deadline;

    await ctx.db.patch(args.id, updates);
  },
});

export const toggle = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to toggle todos");
    }

    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    if (todo.userId !== userId) {
      throw new Error("Not authorized to modify this todo");
    }

    await ctx.db.patch(args.id, {
      isCompleted: !todo.isCompleted,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be logged in to delete todos");
    }

    const todo = await ctx.db.get(args.id);
    if (!todo) {
      throw new Error("Todo not found");
    }

    if (todo.userId !== userId) {
      throw new Error("Not authorized to delete this todo");
    }

    await ctx.db.delete(args.id);
  },
});
