import { prisma } from "@/lib/prisma";

const ADMIN_PASSWORD = "qiu980409";

export async function POST(request: Request) {
  let body: { password?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.password !== ADMIN_PASSWORD) {
    return Response.json({ error: "Wrong password" }, { status: 403 });
  }

  const result = await prisma.response.deleteMany({});

  return Response.json({ deleted: result.count });
}
