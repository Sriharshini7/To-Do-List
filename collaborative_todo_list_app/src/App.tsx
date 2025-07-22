import { Authenticated, Unauthenticated, useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { useState, useEffect } from "react";
import { Id } from "../convex/_generated/dataModel";

type Priority = "low" | "medium" | "high";

interface Todo {
  _id: Id<"todos">;
  text: string;
  description?: string;
  isCompleted: boolean;
  category: string;
  priority: Priority;
  deadline?: number;
  _creationTime: number;
}

interface Category {
  _id: Id<"categories">;
  name: string;
  color: string;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">Advanced Todo List</h2>
        <SignOutButton />
      </header>
      <main className="flex-1 p-4">
        <div className="w-full max-w-6xl mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Task Manager</h1>
        <Authenticated>
          <p className="text-lg text-secondary">
            Welcome back, {loggedInUser?.email ?? "friend"}!
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-xl text-secondary">Sign in to manage your tasks</p>
        </Unauthenticated>
      </div>

      <Authenticated>
        <TodoApp />
      </Authenticated>

      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>
    </div>
  );
}

function TodoApp() {
  const [filters, setFilters] = useState({
    category: "",
    priority: "" as Priority | "",
    completed: undefined as boolean | undefined,
    search: "",
  });

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const todos = useQuery(api.todos.list, {
    category: filters.category || undefined,
    priority: filters.priority || undefined,
    completed: filters.completed,
    search: filters.search || undefined,
  }) || [];

  const categories = useQuery(api.categories.list) || [];

  // Initialize with default categories
  const addCategory = useMutation(api.categories.add);
  
  useEffect(() => {
    const initializeCategories = async () => {
      if (categories.length === 0) {
        const defaultCategories = [
          { name: "Work", color: "#3B82F6" },
          { name: "Personal", color: "#10B981" },
          { name: "Shopping", color: "#F59E0B" },
          { name: "Health", color: "#EF4444" },
        ];

        for (const cat of defaultCategories) {
          try {
            await addCategory(cat);
          } catch (error) {
            // Category might already exist, ignore error
          }
        }
      }
    };

    initializeCategories();
  }, [categories.length, addCategory]);

  const completedCount = todos.filter(todo => todo.isCompleted).length;
  const totalCount = todos.length;
  const overdueTodos = todos.filter(todo => 
    !todo.isCompleted && todo.deadline && todo.deadline < Date.now()
  ).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-sm border p-4 sticky top-20">
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total Tasks:</span>
                <span className="font-medium">{totalCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Completed:</span>
                <span className="font-medium text-green-600">{completedCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span className="font-medium text-blue-600">{totalCount - completedCount}</span>
              </div>
              {overdueTodos > 0 && (
                <div className="flex justify-between">
                  <span>Overdue:</span>
                  <span className="font-medium text-red-600">{overdueTodos}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Categories</h3>
            <div className="space-y-1">
              <button
                onClick={() => setFilters(prev => ({ ...prev, category: "" }))}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  !filters.category ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                }`}
              >
                All Categories
              </button>
              {categories.map((category) => (
                <button
                  key={category._id}
                  onClick={() => setFilters(prev => ({ ...prev, category: category.name }))}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                    filters.category === category.name ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  {category.name}
                </button>
              ))}
              <button
                onClick={() => setShowCategoryForm(true)}
                className="w-full text-left px-3 py-2 rounded text-sm text-gray-500 hover:bg-gray-100 transition-colors"
              >
                + Add Category
              </button>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Priority</h3>
            <div className="space-y-1">
              <button
                onClick={() => setFilters(prev => ({ ...prev, priority: "" }))}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  !filters.priority ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                }`}
              >
                All Priorities
              </button>
              {(["high", "medium", "low"] as Priority[]).map((priority) => (
                <button
                  key={priority}
                  onClick={() => setFilters(prev => ({ ...prev, priority }))}
                  className={`w-full text-left px-3 py-2 rounded text-sm transition-colors flex items-center gap-2 ${
                    filters.priority === priority ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                  }`}
                >
                  <PriorityBadge priority={priority} />
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Status</h3>
            <div className="space-y-1">
              <button
                onClick={() => setFilters(prev => ({ ...prev, completed: undefined }))}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  filters.completed === undefined ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, completed: false }))}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  filters.completed === false ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, completed: true }))}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  filters.completed === true ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
                }`}
              >
                Completed
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                Add Task
              </button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="p-6">
            {todos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {filters.search || filters.category || filters.priority || filters.completed !== undefined
                  ? "No tasks match your filters."
                  : "No tasks yet. Add one to get started!"
                }
              </div>
            ) : (
              <div className="space-y-3">
                {todos.map((todo) => (
                  <TodoItem
                    key={todo._id}
                    todo={todo}
                    categories={categories}
                    onEdit={() => setEditingTodo(todo)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddForm && (
        <TodoForm
          categories={categories}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {editingTodo && (
        <TodoForm
          todo={editingTodo}
          categories={categories}
          onClose={() => setEditingTodo(null)}
        />
      )}

      {showCategoryForm && (
        <CategoryForm onClose={() => setShowCategoryForm(false)} />
      )}
    </div>
  );
}

function TodoItem({ todo, categories, onEdit }: {
  todo: Todo;
  categories: Category[];
  onEdit: () => void;
}) {
  const toggleTodo = useMutation(api.todos.toggle);
  const removeTodo = useMutation(api.todos.remove);

  const category = categories.find(c => c.name === todo.category);
  const isOverdue = todo.deadline && todo.deadline < Date.now() && !todo.isCompleted;

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await removeTodo({ id: todo._id });
        toast.success("Task deleted");
      } catch (error) {
        toast.error("Failed to delete task");
      }
    }
  };

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      todo.isCompleted ? "bg-gray-50 border-gray-200" : "bg-white border-gray-300"
    } ${isOverdue ? "border-red-300 bg-red-50" : ""}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => toggleTodo({ id: todo._id })}
          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            todo.isCompleted
              ? "bg-green-500 border-green-500 text-white"
              : "border-gray-300 hover:border-green-400"
          }`}
        >
          {todo.isCompleted && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`font-medium ${
                todo.isCompleted ? "text-gray-500 line-through" : "text-gray-900"
              }`}>
                {todo.text}
              </h4>
              {todo.description && (
                <p className={`text-sm mt-1 ${
                  todo.isCompleted ? "text-gray-400" : "text-gray-600"
                }`}>
                  {todo.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="text-blue-500 hover:text-blue-700 p-1 transition-colors"
                title="Edit task"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700 p-1 transition-colors"
                title="Delete task"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            {category && (
              <div className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-xs text-gray-600">{category.name}</span>
              </div>
            )}
            
            <PriorityBadge priority={todo.priority} />
            
            {todo.deadline && (
              <div className={`text-xs px-2 py-1 rounded ${
                isOverdue
                  ? "bg-red-100 text-red-700"
                  : todo.deadline < Date.now() + 24 * 60 * 60 * 1000
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-600"
              }`}>
                {isOverdue ? "Overdue" : "Due"}: {new Date(todo.deadline).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const colors = {
    high: "bg-red-100 text-red-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-green-100 text-green-700",
  };

  return (
    <span className={`text-xs px-2 py-1 rounded ${colors[priority]}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}

function TodoForm({ todo, categories, onClose }: {
  todo?: Todo;
  categories: Category[];
  onClose: () => void;
}) {
  const [formData, setFormData] = useState({
    text: todo?.text || "",
    description: todo?.description || "",
    category: todo?.category || (categories[0]?.name || ""),
    priority: todo?.priority || "medium" as Priority,
    deadline: todo?.deadline ? new Date(todo.deadline).toISOString().split('T')[0] : "",
  });

  const addTodo = useMutation(api.todos.add);
  const updateTodo = useMutation(api.todos.update);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.text.trim()) {
      toast.error("Task title is required");
      return;
    }

    try {
      const data = {
        text: formData.text.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        priority: formData.priority,
        deadline: formData.deadline ? new Date(formData.deadline).getTime() : undefined,
      };

      if (todo) {
        await updateTodo({ id: todo._id, ...data });
        toast.success("Task updated");
      } else {
        await addTodo(data);
        toast.success("Task added");
      }
      
      onClose();
    } catch (error) {
      toast.error(todo ? "Failed to update task" : "Failed to add task");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {todo ? "Edit Task" : "Add New Task"}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={formData.text}
                onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter task title..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter task description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category._id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {todo ? "Update" : "Add"} Task
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CategoryForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    color: "#3B82F6",
  });

  const addCategory = useMutation(api.categories.add);

  const colors = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
    "#8B5CF6", "#F97316", "#06B6D4", "#84CC16",
    "#EC4899", "#6B7280"
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      await addCategory({
        name: formData.name.trim(),
        color: formData.color,
      });
      toast.success("Category added");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to add category");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Add New Category</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter category name..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color
              </label>
              <div className="grid grid-cols-5 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color === color ? "border-gray-400 scale-110" : "border-gray-200"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Category
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
