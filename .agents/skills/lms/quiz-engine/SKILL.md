---
name: quiz-engine
description: Hướng dẫn triển khai Quiz và Assignment system cho DevVerse LMS. Bao gồm quiz state machine, auto-grading, manual grading cho code assignments, và submission lifecycle.
---

# Quiz Engine Skill — DevVerse LMS

## Quiz Types

| Type | Grading | Yêu cầu |
|---|---|---|
| Multiple Choice | Auto (instant) | So sánh answer với correct option |
| True/False | Auto (instant) | Binary check |
| Short Answer | Auto hoặc Manual | Exact match hoặc instructor review |
| Code Assignment | Auto (Judge0) | Run test cases |

## 1. Database Schema

```sql
-- Quizzes
CREATE TABLE quizzes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id    UUID REFERENCES modules(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  time_limit   INTEGER,      -- minutes, NULL = no limit
  max_attempts INTEGER DEFAULT 3,
  pass_score   FLOAT DEFAULT 0.7,  -- 70%
  is_published BOOLEAN DEFAULT FALSE,
  order_index  INTEGER NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Questions
CREATE TABLE questions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id        UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question_text  TEXT NOT NULL,
  question_type  TEXT CHECK (question_type IN ('mcq', 'true_false', 'short_answer', 'code')),
  options        JSONB,        -- [{id, text, is_correct}] for MCQ
  correct_answer TEXT,        -- for short_answer exact match
  points         FLOAT DEFAULT 1.0,
  order_index    INTEGER NOT NULL
);

-- Quiz Attempts
CREATE TABLE quiz_attempts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id      UUID REFERENCES quizzes(id),
  user_id      UUID REFERENCES auth.users(id),
  started_at   TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score        FLOAT,          -- final score (0-1)
  is_passed    BOOLEAN,
  status       TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'submitted', 'graded'))
);

-- Question Answers (per attempt)
CREATE TABLE attempt_answers (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id    UUID REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id   UUID REFERENCES questions(id),
  answer        TEXT,
  is_correct    BOOLEAN,
  points_earned FLOAT DEFAULT 0,
  graded_by     UUID REFERENCES auth.users(id)  -- NULL = auto-graded
);
```

## 2. Auto-grading

```typescript
async function autoGradeAttempt(attemptId: string): Promise<number> {
  const { data: answers } = await supabase
    .from('attempt_answers')
    .select('*, question:questions(*)')
    .eq('attempt_id', attemptId)

  let totalPoints = 0
  let earnedPoints = 0

  for (const answer of answers) {
    const q = answer.question
    totalPoints += q.points

    let isCorrect = false

    if (q.question_type === 'mcq') {
      const correctOption = q.options.find((o: any) => o.is_correct)
      isCorrect = answer.answer === correctOption?.id
    } else if (q.question_type === 'true_false') {
      isCorrect = answer.answer === q.correct_answer
    } else if (q.question_type === 'short_answer') {
      isCorrect = answer.answer?.toLowerCase().trim() === q.correct_answer?.toLowerCase().trim()
    }

    if (isCorrect) earnedPoints += q.points

    await supabase.from('attempt_answers').update({
      is_correct: isCorrect,
      points_earned: isCorrect ? q.points : 0
    }).eq('id', answer.id)
  }

  const score = totalPoints > 0 ? earnedPoints / totalPoints : 0

  await supabase.from('quiz_attempts').update({
    score,
    is_passed: score >= 0.7,
    status: 'graded',
    submitted_at: new Date().toISOString()
  }).eq('id', attemptId)

  return score
}
```

## 3. Attempt Limit Check

```typescript
async function canStartQuiz(userId: string, quizId: string): Promise<boolean> {
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('max_attempts')
    .eq('id', quizId)
    .single()

  const { count } = await supabase
    .from('quiz_attempts')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .eq('quiz_id', quizId)
    .eq('status', 'graded')

  return (count || 0) < (quiz?.max_attempts || 3)
}
```

## Khi nào activate skill này

- Build quiz creation flow (instructor)
- Build quiz taking flow (student)
- Implement auto-grading
- Add new question type
- Debug score calculation issues
