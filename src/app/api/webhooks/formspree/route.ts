import { NextResponse } from "next/server";
import { formspreeLeadSchema, normalizeFormspreeLead } from "@/lib/formspree";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const secret = process.env.FORMSPREE_WEBHOOK_SECRET;
  const incomingSecret = request.headers.get("x-webhook-secret");
  const bearerToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (secret && incomingSecret !== secret && bearerToken !== secret) {
    return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Webhook body must be valid JSON." }, { status: 400 });
  }

  const parsed = formspreeLeadSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid lead submission.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const supabase = getSupabaseServiceClient();
    const lead = normalizeFormspreeLead(parsed.data);
    const duplicateFilters = [
      lead.email ? `email.eq.${lead.email}` : null,
      lead.phone ? `phone.eq.${lead.phone}` : null,
    ].filter(Boolean);

    const { data: existingLead, error: findError } = await supabase
      .from("leads")
      .select("id, full_name, email, phone, internal_notes")
      .or(duplicateFilters.join(","))
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existingLead) {
      const note = `Formspree resubmission received at ${new Date().toISOString()}.`;

      const { data: updatedLead, error: updateError } = await supabase
        .from("leads")
        .update({
          ...lead,
          internal_notes: [existingLead.internal_notes, note].filter(Boolean).join("\n"),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingLead.id)
        .select("id")
        .single();

      if (updateError) {
        throw updateError;
      }

      await supabase.from("activities").insert({
        entity_type: "lead",
        entity_id: existingLead.id,
        type: "Formspree submission received",
        message: "Duplicate Formspree submission updated the existing lead.",
        actor: "Formspree",
      });

      return NextResponse.json({ status: "updated", leadId: updatedLead.id });
    }

    const { data: createdLead, error: createError } = await supabase
      .from("leads")
      .insert(lead)
      .select("id")
      .single();

    if (createError) {
      throw createError;
    }

    await supabase.from("activities").insert({
      entity_type: "lead",
      entity_id: createdLead.id,
      type: "Formspree submission received",
      message: "New Formspree submission created a lead.",
      actor: "Formspree",
    });

    return NextResponse.json({ status: "created", leadId: createdLead.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
