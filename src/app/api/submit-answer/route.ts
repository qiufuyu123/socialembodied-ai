import { prisma } from "@/lib/prisma";
import questions from "@/data/meta_full.json";

export async function POST(request: Request) {
  let body: { username?: string; questionIndex?: number; selectedOption?: number; timeSpentMs?: number };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { username, questionIndex, selectedOption, timeSpentMs } = body;

  if (
    typeof username !== "string" ||
    !username.trim() ||
    typeof questionIndex !== "number" ||
    typeof selectedOption !== "number" ||
    typeof timeSpentMs !== "number"
  ) {
    return Response.json(
      { error: "Missing or invalid fields: username, questionIndex, selectedOption, timeSpentMs" },
      { status: 400 }
    );
  }

  if (questionIndex < 0 || questionIndex >= questions.length) {
    return Response.json(
      { error: `questionIndex must be between 0 and ${questions.length - 1}` },
      { status: 400 }
    );
  }

  const question = questions[questionIndex];
  const isCorrect = selectedOption === question.answer;

  const response = await prisma.response.create({
    data: {
      username,
      questionIndex,
      selectedOption,
      isCorrect,
      timeSpentMs,
    },
  });

  return Response.json({
    isCorrect,
    correctAnswer: question.answer,
  });
}
