import { z } from "zod";

export const formspreeLeadSchema = z
  .object({
    name: z.string().optional(),
    fullName: z.string().optional(),
    full_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5).optional(),
    company: z.string().optional(),
    companyName: z.string().optional(),
    company_name: z.string().optional(),
    service: z.string().optional(),
    serviceInterested: z.string().optional(),
    service_interested: z.string().optional(),
    budget: z.union([z.string(), z.number()]).optional(),
    message: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough()
  .refine((data) => data.email || data.phone, {
    message: "Formspree submissions must include at least an email or phone number.",
    path: ["email"],
  });

export type FormspreeLeadInput = z.infer<typeof formspreeLeadSchema>;

export function normalizeFormspreeLead(input: FormspreeLeadInput) {
  const budgetNumber =
    typeof input.budget === "number"
      ? input.budget
      : Number(String(input.budget ?? "0").replace(/[^\d.]/g, "")) || 0;

  return {
    full_name: input.fullName ?? input.full_name ?? input.name ?? "Unnamed lead",
    email: input.email?.toLowerCase() ?? null,
    phone: input.phone ?? null,
    company_name: input.companyName ?? input.company_name ?? input.company ?? "",
    source: "Formspree",
    service_interested:
      input.serviceInterested ?? input.service_interested ?? input.service ?? "",
    budget: budgetNumber,
    message: input.message ?? input.notes ?? "",
    status: "New",
    temperature: "Warm",
    raw_submission: input,
  };
}
