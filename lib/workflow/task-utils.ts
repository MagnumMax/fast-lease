type TaskLike = {
  type?: string | null;
  guardKey?: string | null;
  payload?: Record<string, unknown> | null;
};

export function resolveTaskGuardKey(task: TaskLike): string | null {
  if (task.guardKey && typeof task.guardKey === "string") {
    return task.guardKey;
  }

  const payloadGuard =
    task.payload && typeof task.payload.guard_key === "string"
      ? (task.payload.guard_key as string)
      : null;
  if (payloadGuard) {
    return payloadGuard;
  }

  return null;
}
