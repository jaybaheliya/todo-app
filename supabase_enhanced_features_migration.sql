-- Migration: Add enhanced features to todos table
-- Features: notes, tags, subtasks, order

-- Add new columns to todos table
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS subtasks jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0;

-- Create index on order for faster sorting
CREATE INDEX IF NOT EXISTS idx_todos_order ON todos("order");

-- Create index on tags for faster tag filtering
CREATE INDEX IF NOT EXISTS idx_todos_tags ON todos USING GIN(tags);

-- Update existing rows to have sequential order based on created_at
UPDATE todos
SET "order" = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
  FROM todos
) AS subquery
WHERE todos.id = subquery.id;

-- Comment on new columns
COMMENT ON COLUMN todos.notes IS 'Additional notes/description for the task';
COMMENT ON COLUMN todos.tags IS 'Array of tag strings for categorization';
COMMENT ON COLUMN todos.subtasks IS 'JSON array of subtask objects with id, text, completed fields';
COMMENT ON COLUMN todos."order" IS 'Custom sort order for tasks (lower = higher priority)';
