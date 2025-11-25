# 🔍 PERPLEXITY PROMPT: React Checkbox Not Saving After Submit

## ПРОБЛЕМА:

У нас React form с checkbox и auto-save. Checkbox визуально отмечается, auto-save срабатывает, API возвращает 200 OK, НО:
- После закрытия/открытия modal → checkbox снова unchecked
- State синхронизируется через useEffect с props
- Controlled component (checked={state}, не defaultChecked)

## ЗАПРОС ДЛЯ PERPLEXITY:

```
I have a React modal with a controlled checkbox that uses auto-save with debounce. The checkbox state is not persisting after save. Here's my setup:

**ARCHITECTURE:**
- Parent component (GoalsTodoSystemDB) renders task cards
- Child component (TaskEditModal) for editing task details
- When user clicks task → modal opens with current task data
- Modal has controlled checkbox for "telegram_reminder"
- Changes auto-save after 1.5s debounce
- After save, modal stays open

**CODE:**

```typescript
// TaskEditModal.tsx
export function TaskEditModal({ task, onUpdate, isOpen, onClose }) {
  const [telegramReminder, setTelegramReminder] = useState(task.telegram_reminder || false);
  const [hasChanges, setHasChanges] = useState(false);

  // 🔑 Sync props → state when task changes
  useEffect(() => {
    setTelegramReminder(task.telegram_reminder || false);
    setHasChanges(false);
  }, [task.id, isOpen]);

  // Auto-save with debounce
  useEffect(() => {
    if (!hasChanges) return;
    
    const timer = setTimeout(async () => {
      await onUpdate(task.id, {
        telegram_reminder: telegramReminder,
      });
      setHasChanges(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, [telegramReminder, hasChanges]);

  return (
    <Checkbox
      checked={telegramReminder}  // Controlled
      onCheckedChange={(checked) => {
        setTelegramReminder(checked);
        setHasChanges(true);
      }}
    />
  );
}
```

```typescript
// Parent: GoalsTodoSystemDB.tsx
const [editingTask, setEditingTask] = useState<Goal | null>(null);
const [goals, setGoals] = useState<Goal[]>([]);

async function handleUpdateTask(taskId: string, updates: Partial<Goal>) {
  // API call
  const updated = await updateGoal(taskId, updates);
  
  // Update goals array
  setGoals(goals.map(g => g.id === taskId ? updated : g));
  
  // Should I also update editingTask here? ← QUESTION
  return updated;
}

return (
  <>
    {goals.map(task => (
      <TaskCard onClick={() => setEditingTask(task)} />
    ))}
    
    <TaskEditModal
      task={editingTask}
      isOpen={!!editingTask}
      onUpdate={handleUpdateTask}
      onClose={() => setEditingTask(null)}
    />
  </>
);
```

**PROBLEM:**
1. User checks the checkbox → telegramReminder = true
2. Auto-save triggers after 1.5s → API returns 200 OK
3. setGoals updates the goals array
4. User closes modal
5. User reopens same task → checkbox is UNCHECKED again! ❌

**QUESTION:**
Why doesn't the checkbox stay checked after save? Possible causes:
1. Parent не обновляет editingTask после API call?
2. useEffect sync не срабатывает?
3. API не сохраняет в БД?
4. State race condition?

**DEBUGGING LOGS:**
```
🔄 Syncing state with task prop: { telegram_reminder: false }  ← Why false?
💾 Сохраняем обновления: { telegram_reminder: true }
✅ Goal updated: abc-123
```

API returns success, but when re-opening task, telegram_reminder is still false.

**SOLUTIONS TO CONSIDER:**
1. Should parent update `editingTask` after `handleUpdateTask`?
   ```typescript
   setEditingTask(updated); // ← Add this?
   ```

2. Should I refetch task from server after save?
   ```typescript
   const fresh = await fetchGoal(taskId);
   setEditingTask(fresh);
   ```

3. Is useEffect dependency array correct? Should I add `task.telegram_reminder`?
   ```typescript
   useEffect(() => {
     setTelegramReminder(task.telegram_reminder || false);
   }, [task.id, isOpen, task.telegram_reminder]); // ← Add this?
   ```

4. Optimistic update - should I update both `goals` AND `editingTask`?

5. Is there a state synchronization pattern I'm missing?

**SEARCH FOCUS:**
- React controlled checkbox not persisting after save
- Parent-child state synchronization patterns
- How to update both array state and single item state simultaneously
- useEffect dependencies for prop changes detection
- Optimistic UI updates with React hooks
- Common pitfalls with modal forms and state management

Please provide:
✅ Root cause analysis
✅ Code fix with explanation
✅ Best practice pattern for this scenario
✅ How to properly sync parent array + modal state
```

---

## ДОПОЛНИТЕЛЬНЫЕ ВОПРОСЫ ДЛЯ RESEARCH:

1. **React state synchronization:**
   - "React parent child state sync after API call"
   - "React useState not updating after props change"
   - "useEffect not triggering on prop changes"

2. **Modal + Array patterns:**
   - "React modal editing item from array state management"
   - "Update array item and keep modal in sync React"
   - "React editing task in modal pattern"

3. **Checkbox specific:**
   - "React controlled checkbox not staying checked after save"
   - "Checkbox state reset after component re-render"
   - "Shadcn UI Checkbox controlled component pattern"

4. **Common solutions:**
   - "React lifting state up modal form"
   - "Optimistic updates React hooks"
   - "React form state management best practices"

---

## EXPECTED ANSWER FORMAT:

```typescript
// ✅ SOLUTION: Update editingTask after save

async function handleUpdateTask(taskId: string, updates: Partial<Goal>) {
  const updated = await updateGoal(taskId, updates);
  
  // 1. Update array
  setGoals(goals.map(g => g.id === taskId ? updated : g));
  
  // 2. Update modal state ← THIS WAS MISSING!
  if (editingTask?.id === taskId) {
    setEditingTask(updated);
  }
  
  return updated;
}
```

OR provide alternative pattern with detailed explanation.

---

## KEY SEARCH TERMS:

- React controlled component state not persisting
- Parent component not passing updated props
- useEffect dependencies for object props
- Modal form state synchronization React
- Checkbox checked state reset issue React
- React hooks state update pattern
- Optimistic UI React patterns

---

🎯 **GOAL:** Find the correct pattern to keep checkbox checked after save!






