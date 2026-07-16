import { z } from "zod";

export const createEssaySchema = z.object({
  studentName: z.string().trim().min(1),
  classGroup: z.string().trim().min(1),
  theme: z.string().trim().min(1),
  submissionDate: z.string().datetime(),
  files: z.array(z.string().min(1)).min(1),
});

export type CreateEssayInput = z.infer<typeof createEssaySchema>;
