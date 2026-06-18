create extension if not exists vector;

-- Conversation memory (the learning layer — this is how Vanta gets smarter)
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  embedding vector(1536),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);
create index if not exists memories_embedding_idx
  on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- DSA progress log
create table if not exists dsa_log (
  id uuid primary key default gen_random_uuid(),
  problem_name text not null,
  leetcode_number integer,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  topic text,
  solved boolean default true,
  time_minutes integer,
  notes text,
  solved_at timestamptz default now()
);

-- Fitness session log
create table if not exists fitness_log (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  workout_type text,
  exercises jsonb default '[]',
  completed boolean default false,
  notes text,
  created_at timestamptz default now()
);

-- Key-value preferences and learned context
create table if not exists preferences (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);

-- Job application tracker
create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text,
  status text default 'applied',
  notes text,
  applied_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Semantic memory search function
create or replace function search_memories(
  query_embedding vector(1536),
  match_threshold float default 0.65,
  match_count int default 6
)
returns table (id uuid, role text, content text, similarity float)
language sql stable as $$
  select id, role, content,
    1 - (embedding <=> query_embedding) as similarity
  from memories
  where 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
