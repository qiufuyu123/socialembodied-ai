import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import questions from "@/data/meta_full.json";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");

  if (!username) {
    return Response.json({ error: "username is required" }, { status: 400 });
  }

  // Get all question indices this user has already answered
  const userResponses = await prisma.response.findMany({
    where: { username },
    select: { questionIndex: true },
  });
  const answeredSet = new Set(userResponses.map((r) => r.questionIndex));

  // Get answer counts for all questions
  const answerCounts = await prisma.response.groupBy({
    by: ["questionIndex"],
    _count: { questionIndex: true },
  });
  const countMap = new Map<number, number>();
  for (const entry of answerCounts) {
    countMap.set(entry.questionIndex, entry._count.questionIndex);
  }

  // Filter out already-answered questions
  const remaining = questions
    .map((q, idx) => ({ question: q, idx }))
    .filter((item) => !answeredSet.has(item.idx));

  const totalQuestions = questions.length;
  const answeredCount = answeredSet.size;

  if (remaining.length === 0) {
    return Response.json({ done: true, totalAnswered: answeredCount, totalQuestions });
  }

  // Sort by answer count ascending, then pick randomly among the least-answered
  remaining.sort(
    (a, b) => (countMap.get(a.idx) ?? 0) - (countMap.get(b.idx) ?? 0)
  );
  const minCount = countMap.get(remaining[0].idx) ?? 0;
  const leastAnswered = remaining.filter(
    (item) => (countMap.get(item.idx) ?? 0) === minCount
  );

  const picked = leastAnswered[Math.floor(Math.random() * leastAnswered.length)];
  const q = picked.question;

  return Response.json({
    done: false,
    questionIndex: picked.idx,
    question: q.question,
    choices: q.choices,
    videoUrl: `https://huggingface.co/datasets/qiufuyu123/SocialEmbodiedAI/resolve/main/${q.clip}`,
    task: q.task,
    scenario: q.scenario,
    tag: q.tag,
    answeredCount,
    totalQuestions,
  });
}
