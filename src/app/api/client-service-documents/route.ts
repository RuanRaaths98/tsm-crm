import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseServiceClient } from "@/lib/supabase-server";

const clientServiceDocumentsBucket = "client-service-documents";
const allowedServiceDocumentMimeTypes = [
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/csv",
  "image/jpeg",
];
const allowedServiceDocumentExtensions = [".pdf", ".xls", ".xlsx", ".csv", ".jpg", ".jpeg"];

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

function isAllowedServiceDocument(file: File) {
  const fileName = file.name.toLowerCase();

  return (
    allowedServiceDocumentMimeTypes.includes(file.type)
    || allowedServiceDocumentExtensions.some((extension) => fileName.endsWith(extension))
  );
}

function getServiceDocumentContentType(file: File) {
  const fileName = file.name.toLowerCase();

  if (file.type) {
    return file.type;
  }

  if (fileName.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  if (fileName.endsWith(".xls")) {
    return "application/vnd.ms-excel";
  }

  if (fileName.endsWith(".csv")) {
    return "text/csv";
  }

  if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  return "application/pdf";
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
    await supabase.storage.updateBucket(clientServiceDocumentsBucket, {
      public: false,
      fileSizeLimit: 20 * 1024 * 1024,
      allowedMimeTypes: allowedServiceDocumentMimeTypes,
    });
    return supabase;
  }

  const { error } = await supabase.storage.createBucket(clientServiceDocumentsBucket, {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: allowedServiceDocumentMimeTypes,
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
      return NextResponse.json({ error: "Client, service, and file are required." }, { status: 400 });
    }

    if (!isAllowedServiceDocument(file)) {
      return NextResponse.json(
        { error: "Only PDF, Excel, CSV, JPG, and JPEG files can be uploaded." },
        { status: 400 },
      );
    }

    const supabase = await ensureServiceDocumentsBucket();
    const folder = `${sanitizePathPart(clientId)}/${sanitizePathPart(serviceId)}`;
    const storageFileName = `${Date.now()}-${sanitizePathPart(file.name) || "service-file"}`;
    const path = `${folder}/${storageFileName}`;
    const { error } = await supabase.storage.from(clientServiceDocumentsBucket).upload(path, file, {
      contentType: getServiceDocumentContentType(file),
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
