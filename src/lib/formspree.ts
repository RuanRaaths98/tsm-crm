import { z } from "zod";

export const formspreeLeadSchema = z
  .object({
    name: z.string().optional(),
    fullName: z.string().optional(),
    full_name: z.string().optional(),
    firstName: z.string().optional(),
    first_name: z.string().optional(),
    lastName: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().min(5).optional(),
    company: z.string().optional(),
    companyName: z.string().optional(),
    company_name: z.string().optional(),
    website: z.string().optional(),
    websiteUrl: z.string().optional(),
    website_url: z.string().optional(),
    service: z.string().optional(),
    services: z.union([z.string(), z.array(z.string())]).optional(),
    serviceInterested: z.string().optional(),
    service_interested: z.string().optional(),
    interestedIn: z.string().optional(),
    interested_in: z.string().optional(),
    budget: z.union([z.string(), z.number()]).optional(),
    monthlyBudget: z.union([z.string(), z.number()]).optional(),
    monthly_budget: z.union([z.string(), z.number()]).optional(),
    message: z.string().optional(),
    notes: z.string().optional(),
  })
  .passthrough();

export type FormspreeLeadInput = z.infer<typeof formspreeLeadSchema>;

export function normalizeFormspreeLead(input: FormspreeLeadInput) {
  const record = input as Record<string, unknown>;
  const getString = (...keys: string[]) => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    return "";
  };
  const firstName = getString("firstName", "first_name", "firstname", "First Name");
  const lastName = getString("lastName", "last_name", "lastname", "Last Name");
  const fullName =
    getString("fullName", "full_name", "name", "full-name") ||
    [firstName, lastName].filter(Boolean).join(" ");
  const services =
    Array.isArray(input.services) ? input.services.join(", ") : input.services;
  const website = getString("website", "websiteUrl", "website_url", "url", "Website URL?");
  const budgetNumber =
    typeof input.budget === "number"
      ? input.budget
      : Number(
          String(input.budget ?? input.monthlyBudget ?? input.monthly_budget ?? "0").replace(
            /[^\d.]/g,
            "",
          ),
        ) || 0;
  const message = [input.message ?? input.notes ?? "", website ? `Website: ${website}` : ""]
    .filter(Boolean)
    .join("\n");

  return {
    full_name: fullName || "Unnamed lead",
    email: input.email?.toLowerCase() ?? null,
    phone: input.phone ?? null,
    company_name: input.companyName ?? input.company_name ?? input.company ?? website ?? "",
    source: "Formspree",
    service_interested:
      input.serviceInterested ??
      input.service_interested ??
      input.interestedIn ??
      input.interested_in ??
      services ??
      input.service ??
      "",
    budget: budgetNumber,
    message,
    status: "New",
    temperature: "Warm",
    raw_submission: input,
  };
}
