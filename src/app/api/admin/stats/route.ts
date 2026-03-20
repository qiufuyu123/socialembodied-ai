import { prisma } from "@/lib/prisma";
import questions from "@/data/meta_full.json";

export const dynamic = "force-dynamic";

export async function GET() {
  // Pre-compute question counts per category from meta_full.json
  const qCountPerTask = new Map<string, number>();
  const qCountPerType = new Map<string, number>();
  const qCountPerPersp = new Map<string, number>();
  const qCountPerScenario = new Map<string, Map<string, number>>();

  for (const q of questions) {
    qCountPerTask.set(q.task, (qCountPerTask.get(q.task) ?? 0) + 1);
    const qtype = q.tag[1] ?? "unknown";
    qCountPerType.set(qtype, (qCountPerType.get(qtype) ?? 0) + 1);
    const persp = q.tag[0] ?? "unknown";
    qCountPerPersp.set(persp, (qCountPerPersp.get(persp) ?? 0) + 1);
    if (!qCountPerScenario.has(q.task)) qCountPerScenario.set(q.task, new Map());
    const sm = qCountPerScenario.get(q.task)!;
    sm.set(q.scenario, (sm.get(q.scenario) ?? 0) + 1);
  }

  // Fetch all responses
  const allResponses = await prisma.response.findMany({
    select: {
      username: true,
      questionIndex: true,
      isCorrect: true,
      timeSpentMs: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const totalResponses = allResponses.length;
  const uniqueUsers = new Set(allResponses.map((r) => r.username)).size;

  // Step 1: Group responses by questionIndex to compute per-question score
  // Per-question score = (number of correct answers) / (number of total answers for that question)
  const perQuestionResponses = new Map<number, { correctCount: number; totalCount: number }>();
  for (const r of allResponses) {
    const entry = perQuestionResponses.get(r.questionIndex) ?? { correctCount: 0, totalCount: 0 };
    entry.totalCount++;
    if (r.isCorrect) entry.correctCount++;
    perQuestionResponses.set(r.questionIndex, entry);
  }

  // Per-question score: average correctness
  const perQuestionScore = new Map<number, number>();
  for (const [qIdx, entry] of perQuestionResponses) {
    perQuestionScore.set(qIdx, entry.correctCount / entry.totalCount);
  }

  // Step 2: Aggregate per-question scores by category
  // "answered" = number of distinct questions that have at least one response in that category
  // "score" = sum of per-question scores for questions in that category
  type CategoryAgg = { scoreSum: number; answeredCount: number };

  const perTaskAgg = new Map<string, CategoryAgg>();
  const perTypeAgg = new Map<string, CategoryAgg>();
  const perPerspAgg = new Map<string, CategoryAgg>();
  const perScenAgg = new Map<string, Map<string, CategoryAgg>>();

  for (const [qIdx, score] of perQuestionScore) {
    if (qIdx < 0 || qIdx >= questions.length) continue;
    const q = questions[qIdx];

    const addTo = (map: Map<string, CategoryAgg>, key: string) => {
      const e = map.get(key) ?? { scoreSum: 0, answeredCount: 0 };
      e.scoreSum += score;
      e.answeredCount++;
      map.set(key, e);
    };

    addTo(perTaskAgg, q.task);
    addTo(perTypeAgg, q.tag[1] ?? "unknown");
    addTo(perPerspAgg, q.tag[0] ?? "unknown");

    if (!perScenAgg.has(q.task)) perScenAgg.set(q.task, new Map());
    const sm = perScenAgg.get(q.task)!;
    const se = sm.get(q.scenario) ?? { scoreSum: 0, answeredCount: 0 };
    se.scoreSum += score;
    se.answeredCount++;
    sm.set(q.scenario, se);
  }

  // Overall accuracy: average of all per-question scores
  let overallScoreSum = 0;
  for (const score of perQuestionScore.values()) {
    overallScoreSum += score;
  }
  const answeredQuestions = perQuestionScore.size;
  const overallAccuracy = answeredQuestions > 0 ? (overallScoreSum / answeredQuestions) * 100 : 0;

  // Step 3: Build output entries
  type Entry = { score: number; answered: number; questionCount: number; accuracy: number };

  const buildEntries = (
    aggMap: Map<string, CategoryAgg>,
    countMap: Map<string, number>,
  ): Record<string, Entry> => {
    const result: Record<string, Entry> = {};
    for (const [key, qCount] of countMap) {
      const agg = aggMap.get(key) ?? { scoreSum: 0, answeredCount: 0 };
      result[key] = {
        score: Math.round(agg.scoreSum * 100) / 100,
        answered: agg.answeredCount,
        questionCount: qCount,
        accuracy: agg.answeredCount > 0 ? (agg.scoreSum / agg.answeredCount) * 100 : 0,
      };
    }
    return result;
  };

  const perTask = buildEntries(perTaskAgg, qCountPerTask);
  const perQuestionType = buildEntries(perTypeAgg, qCountPerType);
  const perPerspective = buildEntries(perPerspAgg, qCountPerPersp);

  const perScenario: Record<string, Record<string, Entry>> = {};
  for (const [task, scenCountMap] of qCountPerScenario) {
    perScenario[task] = {};
    const aggMap = perScenAgg.get(task);
    for (const [scenario, qCount] of scenCountMap) {
      const agg = aggMap?.get(scenario) ?? { scoreSum: 0, answeredCount: 0 };
      perScenario[task][scenario] = {
        score: Math.round(agg.scoreSum * 100) / 100,
        answered: agg.answeredCount,
        questionCount: qCount,
        accuracy: agg.answeredCount > 0 ? (agg.scoreSum / agg.answeredCount) * 100 : 0,
      };
    }
  }

  const recentResponses = allResponses.slice(0, 20).map((r) => ({
    username: r.username,
    questionIndex: r.questionIndex,
    isCorrect: r.isCorrect,
    timeSpentMs: r.timeSpentMs,
    createdAt: r.createdAt,
  }));

  const answerDist: Record<number, number> = {};
  for (const [idx, count] of perQuestionResponses) {
    answerDist[idx] = count.totalCount;
  }

  return Response.json({
    totalQuestions: questions.length,
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
