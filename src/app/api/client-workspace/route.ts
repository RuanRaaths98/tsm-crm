import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

type ClientWorkspaceState = {
  checklistItems?: string[];
  generatedDocuments?: Record<string, string>;
  testingTracker?: Record<string, string>;
};

type ClientWorkspaceRow = {
  client_id: string;
  checklist_items: string[] | null;
  generated_documents: Record<string, string> | null;
  testing_tracker: Record<string, string> | null;
};

async function getAuthenticatedUser(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey) {
    return null;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

function normalizeRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapWorkspaceRow(row: ClientWorkspaceRow): ClientWorkspaceState {
  return {
    checklistItems: normalizeStringArray(row.checklist_items),
    generatedDocuments: normalizeRecord(row.generated_documents),
    testingTracker: normalizeRecord(row.testing_tracker),
  };
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const clientIds = (request.nextUrl.searchParams.get("clientIds") ?? "")
    .split(",")
    .map((clientId) => clientId.trim())
    .filter(Boolean);

  if (!clientIds.length) {
    return NextResponse.json({ states: {} });
  }

  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("client_workspace_state")
    .select("client_id, checklist_items, generated_documents, testing_tracker")
    .in("client_id", clientIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const states = Object.fromEntries(
    ((data ?? []) as ClientWorkspaceRow[]).map((row) => [row.client_id, mapWorkspaceRow(row)]),
  );

  return NextResponse.json({ states });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as ClientWorkspaceState & { clientId?: string };

  if (!body.clientId) {
    return NextResponse.json({ error: "Client is required." }, { status: 400 });
  }

  const update: {
    client_id: string;
    checklist_items?: string[];
    generated_documents?: Record<string, string>;
    testing_tracker?: Record<string, string>;
    updated_at: string;
  } = {
    client_id: body.clientId,
    updated_at: new Date().toISOString(),
  };

  if (body.checklistItems) {
    update.checklist_items = normalizeStringArray(body.checklistItems);
  }

  if (body.generatedDocuments) {
    update.generated_documents = normalizeRecord(body.generatedDocuments);
  }

  if (body.testingTracker) {
    update.testing_tracker = normalizeRecord(body.testingTracker);
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("client_workspace_state")
    .upsert(update, { onConflict: "client_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "saved" });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { clientId?: string };

  if (!body.clientId) {
    return NextResponse.json({ error: "Client is required." }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const { error } = await supabase.from("client_workspace_state").delete().eq("client_id", body.clientId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "removed" });
}
