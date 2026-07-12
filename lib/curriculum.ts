import { ActionItem } from './types';
import { loadItems, saveItems } from './storage';
import { CLAUDE_THREAD_URL } from './config';

const SEED_FLAG = 'curriculum_seeded_v1';
const START_DATE = '2026-07-11'; // day 1 of the 30-day prep track

interface DayContent {
  sqlTitle: string;
  sql: string;
  csTitle: string;
  cs: string;
}

const DAYS: DayContent[] = [
  { sqlTitle: 'SQL: Multi-table JOINs', sql: 'Multi-table JOINs with filtering and aggregation on an e-commerce schema.', csTitle: 'C#: LINQ fundamentals', cs: 'LINQ fundamentals: Where/Select/OrderBy chains over collections.' },
  { sqlTitle: 'SQL: GROUP BY & HAVING', sql: 'GROUP BY with HAVING and multiple aggregate functions.', csTitle: 'C#: Value vs reference types', cs: 'Value vs reference types, structs vs classes, boxing/unboxing pitfalls.' },
  { sqlTitle: 'SQL: Subqueries', sql: 'Subqueries: correlated vs non-correlated for existence checks.', csTitle: 'C#: Exception handling', cs: 'Exception handling: custom exceptions, catch vs rethrow.' },
  { sqlTitle: 'SQL: CTEs', sql: 'Common Table Expressions (CTEs) for multi-step queries.', csTitle: 'C#: Generic repository', cs: 'Generics: build a generic repository class with constraints.' },
  { sqlTitle: 'SQL: Ranking window functions', sql: 'Window functions: ROW_NUMBER/RANK/DENSE_RANK ranking report.', csTitle: 'C#: Delegates & events', cs: 'Delegates, Func/Action, events: implement observer pattern.' },
  { sqlTitle: 'SQL: Running totals', sql: 'Window functions: running totals and moving averages (SUM/AVG OVER).', csTitle: 'C#: Async/await fundamentals', cs: 'Async/await fundamentals: convert sync I/O to async correctly.' },
  { sqlTitle: 'SQL: Pivot-style reports', sql: 'Conditional aggregation / pivot-style cross-tab report.', csTitle: 'C#: Task composition', cs: 'Task composition: WhenAll/WhenAny, cancellation tokens.' },
  { sqlTitle: 'SQL: Recursive CTEs', sql: 'Recursive CTEs for hierarchical data (org chart/category tree).', csTitle: 'C#: Extension methods', cs: 'Extension methods and fluent API design.' },
  { sqlTitle: 'SQL: Execution plans', sql: 'Reading and interpreting query execution plans.', csTitle: 'C#: Dependency injection', cs: 'Dependency injection: service lifetimes (singleton/scoped/transient).' },
  { sqlTitle: 'SQL: Index design', sql: 'Index design: covering vs non-covering, composite indexes.', csTitle: 'C#: EF Core basics', cs: 'EF Core basics: DbContext, migrations, CRUD.' },
  { sqlTitle: 'SQL: Transactions & isolation', sql: 'Transactions and isolation levels; diagnosing a deadlock.', csTitle: 'C#: EF Core change tracking', cs: 'EF Core: change tracking, AsNoTracking, eager vs lazy loading.' },
  { sqlTitle: 'SQL: Stored procedures', sql: 'Stored procedures with parameters and TRY/CATCH error handling.', csTitle: 'C#: API request validation', cs: 'Minimal API/controller with proper request validation.' },
  { sqlTitle: 'SQL: Audit triggers', sql: 'Triggers for audit/history tables.', csTitle: 'C#: Custom middleware', cs: 'Custom middleware pipeline (logging/error handling).' },
  { sqlTitle: 'SQL: Dynamic SQL safely', sql: 'Dynamic SQL construction and injection prevention.', csTitle: 'C#: Strategy & Factory patterns', cs: 'Strategy and Factory patterns applied to a real scenario.' },
  { sqlTitle: 'SQL: Table partitioning', sql: 'Partitioning a large table by date range and query pruning.', csTitle: 'C#: Decorator & Adapter patterns', cs: 'Decorator and Adapter patterns for extending legacy code.' },
  { sqlTitle: 'SQL: SARGable rewrites', sql: 'Rewriting a slow query using SARGability principles.', csTitle: 'C#: SOLID refactor', cs: 'SOLID refactor: fix a violating class.' },
  { sqlTitle: 'SQL: SCD Type 2', sql: 'Slowly changing dimensions (SCD Type 2) modeling.', csTitle: 'C#: Concurrency primitives', cs: 'Concurrency: locks, Monitor, SemaphoreSlim, avoiding deadlocks.' },
  { sqlTitle: 'SQL: MERGE upserts', sql: 'MERGE statement for bulk upsert logic.', csTitle: 'C#: Concurrent collections', cs: 'Concurrent collections and thread-safe patterns.' },
  { sqlTitle: 'SQL: Lock contention', sql: 'Diagnosing and resolving lock contention/blocking chains.', csTitle: 'C#: Memory & GC', cs: 'Memory management: GC generations, IDisposable/using pattern.' },
  { sqlTitle: 'SQL: 3NF & denormalization', sql: 'Normalize to 3NF, then selectively denormalize for read performance.', csTitle: 'C#: Span<T>/Memory<T>', cs: 'Span<T>/Memory<T> for allocation-free code.' },
  { sqlTitle: 'SQL: Cross-database queries', sql: 'Linked server/cross-database query considerations.', csTitle: 'C#: Resilient HTTP (Polly)', cs: 'Resilient HTTP client: retry with backoff, circuit breaker (Polly).' },
  { sqlTitle: 'SQL: Replication & read replicas', sql: 'Replication concepts: read replicas, lag, query routing.', csTitle: 'C#: Caching layers', cs: 'Caching: in-memory vs distributed (Redis) implementation.' },
  { sqlTitle: 'SQL: Sharding strategy', sql: 'Sharding strategy: choosing a shard key, cross-shard queries.', csTitle: 'C#: Unit testing & mocking', cs: 'Unit testing/mocking: xUnit + Moq for a service layer.' },
  { sqlTitle: 'SQL: Percentile analytics', sql: 'Analytical queries: percentile/statistical functions.', csTitle: 'C#: Background services', cs: 'Background service (IHostedService) for scheduled/queued work.' },
  { sqlTitle: 'SQL: Parameter sniffing', sql: 'Query plan caching and parameter sniffing mitigation.', csTitle: 'C#: Performance profiling', cs: 'Performance profiling: fix an allocation-heavy hot path.' },
  { sqlTitle: 'SQL: Zero-downtime migrations', sql: 'Zero-downtime migration plan (expand/contract pattern).', csTitle: 'C#: CQRS-lite', cs: 'CQRS-lite: separate read/write models for a feature.' },
  { sqlTitle: 'SQL: Time-series modeling', sql: 'Time-series data modeling and efficient range queries.', csTitle: 'C#: Rate limiter middleware', cs: 'Rate limiter/throttling middleware from scratch.' },
  { sqlTitle: 'SQL: Row-level security', sql: 'Row-level security and column-level encryption.', csTitle: 'C#: Idempotency keys', cs: 'Idempotency keys for a distributed API.' },
  { sqlTitle: 'SQL: Idempotent ETL', sql: 'Idempotent batch ETL job with checkpointing.', csTitle: 'C#: Async streams', cs: 'Async streams: IAsyncEnumerable for paginated data processing.' },
  { sqlTitle: 'SQL: Capstone schema design', sql: 'Capstone: schema + optimized queries for a system design prompt (e.g. booking/ticketing system at scale).', csTitle: 'C#: Capstone service', cs: 'Capstone: production-shaped service (API + EF Core + caching + resilience) for the same prompt.' },
];

function priorityForDay(day: number): ActionItem['priority'] {
  if (day >= 29) return 'high';
  if (day >= 15) return 'medium';
  return 'low';
}

function dateForDay(day: number): string {
  const [y, m, d] = START_DATE.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + day - 1));
  return date.toISOString().slice(0, 10);
}

function buildCurriculumItems(): ActionItem[] {
  const createdAt = new Date().toISOString();
  return DAYS.flatMap((content, i) => {
    const day = i + 1;
    const shared = {
      priority: priorityForDay(day),
      done: false,
      createdAt,
      date: dateForDay(day),
      threadUrl: CLAUDE_THREAD_URL,
    };
    return [
      {
        ...shared,
        id: `curr-d${String(day).padStart(2, '0')}-sql`,
        title: `Day ${day} — ${content.sqlTitle}`,
        description: content.sql,
        tasks: [{ task: content.sql, done: false }],
      },
      {
        ...shared,
        id: `curr-d${String(day).padStart(2, '0')}-cs`,
        title: `Day ${day} — ${content.csTitle}`,
        description: content.cs,
        tasks: [{ task: content.cs, done: false }],
      },
    ];
  });
}

/** One-time merge of the 30-day prep curriculum into localStorage,
 *  plus a backfill so items seeded before the thread URL was configured
 *  pick it up once it's set. */
export function seedCurriculum(): void {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(SEED_FLAG)) {
    const existing = loadItems();
    const fresh = buildCurriculumItems().filter(c => !existing.some(e => e.id === c.id));
    saveItems([...fresh, ...existing]);
    localStorage.setItem(SEED_FLAG, '1');
    return;
  }

  if (CLAUDE_THREAD_URL) {
    const items = loadItems();
    let changed = false;
    const next = items.map(item => {
      if (item.id.startsWith('curr-') && item.threadUrl !== CLAUDE_THREAD_URL) {
        changed = true;
        return { ...item, threadUrl: CLAUDE_THREAD_URL };
      }
      return item;
    });
    if (changed) saveItems(next);
  }
}
