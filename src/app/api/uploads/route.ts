import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST() {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      message: "Upload endpoint scaffolded. File persistence will be wired into the review flow next.",
    },
    { status: 202 },
  );
}
