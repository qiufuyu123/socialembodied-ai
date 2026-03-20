import { prisma } from "@/lib/prisma";
import questions from "@/data/meta_full.json";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Fetch all responses
  const allResponses = await prisma.response.findMany({
    select: {
      id: true,
      username: true,
      questionIndex: true,
      isCorrect: true,
      timeSpentMs: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalResponses = allResponses.length;

  // Unique users
  const uniqueUsersSet = new Set(allResponses.map((r) => r.username));
  const uniqueUsers = uniqueUsersSet.size;

  // Overall accuracy
  const correctCount = allResponses.filter((r) => r.isCorrect).length;
  const overallAccuracy = totalResponses > 0 ? (correctCount / totalResponses) * 100 : 0;

  // Build per-task, per-question-type (tag[1]), per-perspective (tag[0]), per-scenario stats
  const perTaskMap = new Map<string, { correct: number; total: number }>();
  const perQuestionTypeMap = new Map<string, { correct: number; total: number }>();
  const perPerspectiveMap = new Map<string, { correct: number; total: number }>();
  const perScenarioMap = new Map<string, Map<string, { correct: number; total: number }>>();
  const answerDistribution = new Map<number, number>();

  for (const r of allResponses) {
    // Answer distribution
    answerDistribution.set(r.questionIndex, (answerDistribution.get(r.questionIndex) ?? 0) + 1);

    if (r.questionIndex < 0 || r.questionIndex >= questions.length) continue;
    const q = questions[r.questionIndex];

    // Per task
    const taskEntry = perTaskMap.get(q.task) ?? { correct: 0, total: 0 };
    taskEntry.total++;
    if (r.isCorrect) taskEntry.correct++;
    perTaskMap.set(q.task, taskEntry);

    // Per question type (tag[1])
    const questionType = q.tag[1] ?? "unknown";
    const typeEntry = perQuestionTypeMap.get(questionType) ?? { correct: 0, total: 0 };
    typeEntry.total++;
    if (r.isCorrect) typeEntry.correct++;
    perQuestionTypeMap.set(questionType, typeEntry);

    // Per perspective (tag[0])
    const perspective = q.tag[0] ?? "unknown";
    const perspEntry = perPerspectiveMap.get(perspective) ?? { correct: 0, total: 0 };
    perspEntry.total++;
    if (r.isCorrect) perspEntry.correct++;
    perPerspectiveMap.set(perspective, perspEntry);

    // Per scenario (nested by task)
    if (!perScenarioMap.has(q.task)) {
      perScenarioMap.set(q.task, new Map());
    }
    const scenarioMap = perScenarioMap.get(q.task)!;
    const scenEntry = scenarioMap.get(q.scenario) ?? { correct: 0, total: 0 };
    scenEntry.total++;
    if (r.isCorrect) scenEntry.correct++;
    scenarioMap.set(q.scenario, scenEntry);
  }

  // Convert maps to plain objects with accuracy
  const withAccuracy = (entry: { correct: number; total: number }) => ({
    correct: entry.correct,
    total: entry.total,
    accuracy: entry.total > 0 ? (entry.correct / entry.total) * 100 : 0,
  });

  const perTask: Record<string, { correct: number; total: number; accuracy: number }> = {};
  for (const [task, entry] of perTaskMap) {
    perTask[task] = withAccuracy(entry);
  }

  const perQuestionType: Record<string, { correct: number; total: number; accuracy: number }> = {};
  for (const [type, entry] of perQuestionTypeMap) {
    perQuestionType[type] = withAccuracy(entry);
  }

  const perPerspective: Record<string, { correct: number; total: number; accuracy: number }> = {};
  for (const [persp, entry] of perPerspectiveMap) {
    perPerspective[persp] = withAccuracy(entry);
  }

  const perScenario: Record<string, Record<string, { correct: number; total: number; accuracy: number }>> = {};
  for (const [task, scenarioMap] of perScenarioMap) {
    perScenario[task] = {};
    for (const [scenario, entry] of scenarioMap) {
      perScenario[task][scenario] = withAccuracy(entry);
    }
  }

  // Recent responses (first 20, already ordered desc)
  const recentResponses = allResponses.slice(0, 20).map((r) => ({
    username: r.username,
    questionIndex: r.questionIndex,
    isCorrect: r.isCorrect,
    timeSpentMs: r.timeSpentMs,
    createdAt: r.createdAt,
  }));

  // Answer distribution as plain object
  const answerDist: Record<number, number> = {};
  for (const [idx, count] of answerDistribution) {
    answerDist[idx] = count;
  }

  return Response.json({
    totalQuestions: 267,
    totalResponses,
    uniqueUsers,
    overallAccuracy,
    perTask,
    perQuestionType,
    perPerspective,
    perScenario,
    recentResponses,
    answerDistribution: answerDist,
  });
}
