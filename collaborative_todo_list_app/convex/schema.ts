import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  todos: defineTable({
    text: v.string(),
    description: v.optional(v.string()),
    isCompleted: v.boolean(),
    userId: v.id("users"),
    category: v.string(),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    deadline: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_category", ["userId", "category"])
    .index("by_user_and_priority", ["userId", "priority"])
    .index("by_user_and_completed", ["userId", "isCompleted"])
    .searchIndex("search_text", {
      searchField: "text",
      filterFields: ["userId", "category", "isCompleted"],
    }),
  
  categories: defineTable({
    name: v.string(),
    userId: v.id("users"),
    color: v.string(),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
