import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const clientSlaBucket = "client-slas";
const storagePolicyHelp =
  "Supabase Storage rejected the upload. Confirm SUPABASE_SERVICE_ROLE_KEY is the real service_role key in Railway, then run the client-slas storage policy SQL from supabase/schema.sql.";

type SlaDocument = {
  name: string;
  size: number;
  uploadedAt: string;
  path: string;
};

function sanitizeStorageFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isRowLevelSecurityError(error: { message?: string } | null) {
  return error?.message?.toLowerCase().includes("row-level security") ?? false;
}

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

async function ensureSlaBucket() {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.storage.getBucket(clientSlaBucket);

  if (data) {
    return supabase;
  }

  const { error } = await supabase.storage.createBucket(clientSlaBucket, {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }

  return supabase;
}

async function listClientSlaDocuments(clientIds: string[]) {
  const supabase = await ensureSlaBucket();
  const entries = await Promise.all(
    clientIds.map(async (clientId) => {
      const { data, error } = await supabase.storage
        .from(clientSlaBucket)
        .list(clientId, { limit: 1, sortBy: { column: "created_at", order: "desc" } });

      if (error || !data?.[0]) {
        return null;
      }

      const file = data[0];

      return [
        clientId,
        {
          name: file.name,
          size: Number(file.metadata?.size ?? 0),
          uploadedAt: file.created_at ?? file.updated_at ?? new Date().toISOString(),
          path: `${clientId}/${file.name}`,
        },
      ] as const;
    }),
  );

  return Object.fromEntries(entries.filter((entry): entry is NonNullable<typeof entry> => entry !== null));
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path");

    if (path) {
      const supabase = await ensureSlaBucket();
      const { data, error } = await supabase.storage.from(clientSlaBucket).createSignedUrl(path, 60 * 5);

      if (error || !data?.signedUrl) {
        return NextResponse.json(
          { error: error?.message ?? "Could not create signed URL." },
          { status: 500 },
        );
      }

      return NextResponse.json({ signedUrl: data.signedUrl });
    }

    const clientIds = (searchParams.get("clientIds") ?? "")
      .split(",")
      .map((clientId) => clientId.trim())
      .filter(Boolean);

    if (!clientIds.length) {
      return NextResponse.json({ documents: {} });
    }

    const documents = await listClientSlaDocuments(clientIds);

    return NextResponse.json({ documents });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load SLA PDFs." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const clientId = String(form.get("clientId") ?? "");
    const file = form.get("file");

    if (!clientId || !(file instanceof File)) {
      return NextResponse.json({ error: "Client and PDF file are required." }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF SLA files can be uploaded." }, { status: 400 });
    }

    const supabase = await ensureSlaBucket();
    const { data: existingFiles } = await supabase.storage.from(clientSlaBucket).list(clientId);
    const existingPaths = (existingFiles ?? []).map((existingFile) => `${clientId}/${existingFile.name}`);

    if (existingPaths.length) {
      await supabase.storage.from(clientSlaBucket).remove(existingPaths);
    }

    const storageFileName = `${Date.now()}-${sanitizeStorageFileName(file.name) || "sla.pdf"}`;
    const path = `${clientId}/${storageFileName}`;
    const { error } = await supabase.storage.from(clientSlaBucket).upload(path, file, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (error) {
      if (isRowLevelSecurityError(error)) {
        return NextResponse.json({ error: storagePolicyHelp }, { status: 500 });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const document: SlaDocument = {
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      path,
    };

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not upload SLA PDF." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { clientId?: string; path?: string };
    const supabase = await ensureSlaBucket();
    const paths = body.path ? [body.path] : [];

    if (!paths.length && body.clientId) {
      const { data } = await supabase.storage.from(clientSlaBucket).list(body.clientId);
      paths.push(...(data ?? []).map((file) => `${body.clientId}/${file.name}`));
    }

    if (paths.length) {
      const { error } = await supabase.storage.from(clientSlaBucket).remove(paths);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ status: "removed" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove SLA PDF." },
      { status: 500 },
    );
  }
}
