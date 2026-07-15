import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const clientServiceDocumentsBucket = "client-service-documents";

type ServiceDocument = {
  name: string;
  size: number;
  uploadedAt: string;
  path: string;
};

function sanitizePathPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
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

async function ensureServiceDocumentsBucket() {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.storage.getBucket(clientServiceDocumentsBucket);

  if (data) {
    return supabase;
  }

  const { error } = await supabase.storage.createBucket(clientServiceDocumentsBucket, {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf"],
  });

  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }

  return supabase;
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const path = request.nextUrl.searchParams.get("path");

  if (!path) {
    return NextResponse.json({ error: "Document path is required." }, { status: 400 });
  }

  try {
    const supabase = await ensureServiceDocumentsBucket();
    const { data, error } = await supabase.storage
      .from(clientServiceDocumentsBucket)
      .createSignedUrl(path, 60 * 5);

    if (error || !data?.signedUrl) {
      return NextResponse.json(
        { error: error?.message ?? "Could not create signed URL." },
        { status: 500 },
      );
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not open service document." },
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
    const serviceId = String(form.get("serviceId") ?? "");
    const file = form.get("file");

    if (!clientId || !serviceId || !(file instanceof File)) {
      return NextResponse.json({ error: "Client, service, and PDF file are required." }, { status: 400 });
    }

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Only PDF files can be uploaded." }, { status: 400 });
    }

    const supabase = await ensureServiceDocumentsBucket();
    const folder = `${sanitizePathPart(clientId)}/${sanitizePathPart(serviceId)}`;
    const { data: existingFiles } = await supabase.storage.from(clientServiceDocumentsBucket).list(folder);
    const existingPaths = (existingFiles ?? []).map((existingFile) => `${folder}/${existingFile.name}`);

    if (existingPaths.length) {
      await supabase.storage.from(clientServiceDocumentsBucket).remove(existingPaths);
    }

    const storageFileName = `${Date.now()}-${sanitizePathPart(file.name) || "research.pdf"}`;
    const path = `${folder}/${storageFileName}`;
    const { error } = await supabase.storage.from(clientServiceDocumentsBucket).upload(path, file, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const document: ServiceDocument = {
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      path,
    };

    return NextResponse.json({ document });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not upload service document." },
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
    const body = (await request.json()) as { path?: string };

    if (!body.path) {
      return NextResponse.json({ error: "Document path is required." }, { status: 400 });
    }

    const supabase = await ensureServiceDocumentsBucket();
    const { error } = await supabase.storage.from(clientServiceDocumentsBucket).remove([body.path]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: "removed" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove service document." },
      { status: 500 },
    );
  }
}
