import JSZip from "jszip";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { renderApprovedReportHtml } from "@/lib/essay/report";
import { getObjectBuffer } from "@/lib/storage";

function getImageExtension(mimeType?: string | null) {
  return mimeType === "image/png" ? "png" : "jpg";
}

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
      const buffer = file.contentBytes ? Buffer.from(file.contentBytes) : await getObjectBuffer(file.storagePath);
      zip.file(`original/page-${file.pageOrder}.${getImageExtension(file.mimeType)}`, buffer);
    }),
  );

  const body = await zip.generateAsync({ type: "uint8array" });
  const responseBody = new ArrayBuffer(body.byteLength);
  new Uint8Array(responseBody).set(body);

  return new Response(responseBody, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="essay-${essayId}.zip"`,
    },
  });
}
