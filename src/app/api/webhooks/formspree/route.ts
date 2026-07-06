import { NextResponse } from "next/server";
import { formspreeLeadSchema, normalizeFormspreeLead } from "@/lib/formspree";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    route: "formspree-webhook",
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasSupabaseServerKey: Boolean(
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY,
    ),
    hasWebhookSecret: Boolean(process.env.FORMSPREE_WEBHOOK_SECRET),
  });
}

export async function POST(request: Request) {
  const secret = process.env.FORMSPREE_WEBHOOK_SECRET;
  const incomingSecret = request.headers.get("x-webhook-secret");
  const bearerToken = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (secret && incomingSecret !== secret && bearerToken !== secret) {
    console.warn("[formspree-webhook] unauthorized request", {
      hasHeaderSecret: Boolean(incomingSecret),
      hasBearerToken: Boolean(bearerToken),
    });
    return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    console.warn("[formspree-webhook] invalid json body");
    return NextResponse.json({ error: "Webhook body must be valid JSON." }, { status: 400 });
  }

  const parsed = formspreeLeadSchema.safeParse(payload);

  if (!parsed.success) {
    console.warn("[formspree-webhook] invalid submission", parsed.error.flatten());
    return NextResponse.json(
      { error: "Invalid lead submission.", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  try {
    const supabase = getSupabaseServiceClient();
    const lead = normalizeFormspreeLead(parsed.data);

    if (!lead.email && !lead.phone) {
      console.info("[formspree-webhook] ignored submission without email or phone", {
        keys: Object.keys(parsed.data),
      });
      return NextResponse.json({
        status: "ignored",
        reason: "Submission did not include an email or phone number.",
      });
    }

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
      console.error("[formspree-webhook] duplicate lookup failed", findError.message);
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
        console.error("[formspree-webhook] duplicate update failed", updateError.message);
        throw updateError;
      }

      await supabase.from("activities").insert({
        entity_type: "lead",
        entity_id: existingLead.id,
        type: "Formspree submission received",
        message: "Duplicate Formspree submission updated the existing lead.",
        actor: "Formspree",
      });

      console.info("[formspree-webhook] lead updated", {
        leadId: updatedLead.id,
        email: lead.email,
        phonePresent: Boolean(lead.phone),
      });
      return NextResponse.json({ status: "updated", leadId: updatedLead.id });
    }

    const { data: createdLead, error: createError } = await supabase
      .from("leads")
      .insert(lead)
      .select("id")
      .single();

    if (createError) {
      console.error("[formspree-webhook] lead create failed", createError.message);
      throw createError;
    }

    await supabase.from("activities").insert({
      entity_type: "lead",
      entity_id: createdLead.id,
      type: "Formspree submission received",
      message: "New Formspree submission created a lead.",
      actor: "Formspree",
    });

    console.info("[formspree-webhook] lead created", {
      leadId: createdLead.id,
      email: lead.email,
      phonePresent: Boolean(lead.phone),
    });
    return NextResponse.json({ status: "created", leadId: createdLead.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown webhook error.";

    console.error("[formspree-webhook] failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
