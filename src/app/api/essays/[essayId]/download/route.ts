import JSZip from "jszip";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { renderApprovedReportHtml } from "@/lib/essay/report";
import { getObjectBuffer } from "@/lib/storage";

export async function GET(_request: Request, context: { params: Promise<{ essayId: string }> }) {
  const session = await auth();

  if (!session?.user?.email) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { essayId } = await context.params;
  const essay = await db.essaySubmission.findUniqueOrThrow({
    where: { id: essayId },
    include: { finalReview: true, files: true },
  });

  const zip = new JSZip();

  zip.file("report.html", renderApprovedReportHtml(essay));
  zip.file(
    "scores.json",
    JSON.stringify(
      {
        raw: essay.finalReview?.approvedTotalRawScore ?? 0,
        thousand: essay.finalReview?.approvedTotal1000Score ?? 0,
      },
      null,
      2,
    ),
  );
  zip.file("transcription.txt", essay.finalReview?.approvedTranscription ?? "");

  await Promise.all(
    essay.files.map(async (file) => {
      const buffer = await getObjectBuffer(file.storagePath);
      zip.file(`original/page-${file.pageOrder}.jpg`, buffer);
    }),
  );

  const body = await zip.generateAsync({ type: "uint8array" });

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="essay-${essayId}.zip"`,
    },
  });
}
