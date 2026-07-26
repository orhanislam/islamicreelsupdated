import { getJobsDir } from "@/lib/render.functions";

export interface BackgroundTaskRecord {
  id: string;
  type: "plan_generation" | "batch_generation";
  status: "queued" | "processing" | "completed" | "failed";
  progress: number;
  title: string;
  message: string;
  createdAt: number;
  updatedAt: number;
  payload: any;
  result?: any;
  error?: string | null;
}

async function getTasksFilePath(): Promise<string> {
  const path = await import("path");
  const dir = await getJobsDir();
  return path.join(dir, "background_tasks.json");
}

export async function listTasks(): Promise<BackgroundTaskRecord[]> {
  try {
    const fs = (await import("fs")).promises;
    const filePath = await getTasksFilePath();
    const data = await fs.readFile(filePath, "utf-8");
    const tasks: BackgroundTaskRecord[] = JSON.parse(data);
    return Array.isArray(tasks) ? tasks.sort((a, b) => b.createdAt - a.createdAt) : [];
  } catch {
    return [];
  }
}

export async function getTask(id: string): Promise<BackgroundTaskRecord | null> {
  const tasks = await listTasks();
  return tasks.find((t) => t.id === id) || null;
}

let tasksWriteLock: Promise<any> = Promise.resolve();

function withTasksLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = tasksWriteLock.then(() => fn(), () => fn());
  tasksWriteLock = next.catch(() => {});
  return next;
}

async function writeTasksFile(tasks: BackgroundTaskRecord[]): Promise<void> {
  const fs = (await import("fs")).promises;
  const filePath = await getTasksFilePath();
  const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  let success = false;
  try {
    await fs.writeFile(tmpPath, JSON.stringify(tasks, null, 2), "utf-8");
    await fs.rename(tmpPath, filePath);
    success = true;
  } catch (err) {
    throw err;
  } finally {
    if (!success) {
      await fs.unlink(tmpPath).catch(() => {});
    }
  }
}

export async function saveTasksList(tasks: BackgroundTaskRecord[]): Promise<void> {
  return withTasksLock(() => writeTasksFile(tasks));
}

export async function createTask(
  type: "plan_generation" | "batch_generation",
  title: string,
  message: string,
  payload: any
): Promise<BackgroundTaskRecord> {
  return withTasksLock(async () => {
    const tasks = await listTasks();
    const id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTask: BackgroundTaskRecord = {
      id,
      type,
      status: "queued",
      progress: 0,
      title,
      message,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      payload,
    };
    tasks.unshift(newTask);
    await writeTasksFile(tasks);
    return newTask;
  });
}

export async function updateTask(
  id: string,
  updates: Partial<BackgroundTaskRecord>
): Promise<BackgroundTaskRecord | null> {
  return withTasksLock(async () => {
    const tasks = await listTasks();
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    tasks[idx] = {
      ...tasks[idx],
      ...updates,
      updatedAt: Date.now(),
    };
    await writeTasksFile(tasks);
    return tasks[idx];
  });
}

export async function deleteTask(id: string): Promise<boolean> {
  return withTasksLock(async () => {
    const tasks = await listTasks();
    const filtered = tasks.filter((t) => t.id !== id);
    if (filtered.length === tasks.length) return false;
    await writeTasksFile(filtered);
    return true;
  });
}

export async function clearCompletedTasks(): Promise<void> {
  return withTasksLock(async () => {
    const tasks = await listTasks();
    const active = tasks.filter((t) => t.status === "queued" || t.status === "processing");
    await writeTasksFile(active);
  });
}

export async function clearAllTasks(): Promise<void> {
  return withTasksLock(async () => {
    await writeTasksFile([]);
  });
}
