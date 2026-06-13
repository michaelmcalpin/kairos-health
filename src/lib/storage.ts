/**
 * Cloud-agnostic storage abstraction layer.
 *
 * Supports two providers, selected via the STORAGE_PROVIDER env var:
 *   - "vercel" (default) — uses @vercel/blob
 *   - "azure"            — uses @azure/storage-blob
 *
 * Vercel env vars:
 *   BLOB_READ_WRITE_TOKEN  — required by @vercel/blob
 *
 * Azure env vars:
 *   AZURE_STORAGE_CONNECTION_STRING — required
 *   AZURE_STORAGE_CONTAINER         — optional, defaults to "uploads"
 */

export type StorageProvider = "vercel" | "azure";

export interface UploadResult {
  url: string;
  pathname: string;
}

export interface UploadOptions {
  contentType?: string;
  access?: "public";
}

function getProvider(): StorageProvider {
  const raw = process.env.STORAGE_PROVIDER ?? "vercel";
  if (raw !== "vercel" && raw !== "azure") {
    throw new Error(
      `Invalid STORAGE_PROVIDER "${raw}". Expected "vercel" or "azure".`
    );
  }
  return raw;
}

// ---------------------------------------------------------------------------
// Vercel Blob implementation
// ---------------------------------------------------------------------------

async function vercelUpload(
  file: Buffer | Blob,
  filename: string,
  options?: UploadOptions
): Promise<UploadResult> {
  const { put } = await import("@vercel/blob");
  const blob = await put(filename, file, {
    access: options?.access ?? "public",
    contentType: options?.contentType,
    addRandomSuffix: true,
  });
  return { url: blob.url, pathname: blob.pathname };
}

async function vercelDelete(url: string): Promise<void> {
  const { del } = await import("@vercel/blob");
  await del(url);
}

function vercelGetUrl(pathname: string): string {
  // Vercel Blob URLs are absolute and returned by put(), so the pathname
  // stored in the database *is* the full URL in most setups. If a bare
  // pathname is passed we construct a best-effort URL using the configured
  // blob store base, but callers should prefer storing the full URL.
  if (pathname.startsWith("http")) {
    return pathname;
  }
  const base = process.env.BLOB_STORE_BASE_URL ?? "";
  return base ? `${base}/${pathname}` : pathname;
}

// ---------------------------------------------------------------------------
// Azure Blob Storage implementation
// ---------------------------------------------------------------------------

function getAzureContainer() {
  return process.env.AZURE_STORAGE_CONTAINER ?? "uploads";
}

async function azureUpload(
  file: Buffer | Blob,
  filename: string,
  options?: UploadOptions
): Promise<UploadResult> {
  const { BlobServiceClient } = await import("@azure/storage-blob");

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING is required when STORAGE_PROVIDER is azure"
    );
  }

  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(
    getAzureContainer()
  );

  // Ensure the container exists (no-op if it already does)
  await containerClient.createIfNotExists({
    access: options?.access === "public" ? "blob" : undefined,
  });

  const blockBlobClient = containerClient.getBlockBlobClient(filename);

  const contentType =
    options?.contentType ?? "application/octet-stream";

  if (Buffer.isBuffer(file)) {
    await blockBlobClient.uploadData(file, {
      blobHTTPHeaders: { blobContentType: contentType },
    });
  } else {
    // Blob (Web API) — convert to Buffer
    const arrayBuffer = await file.arrayBuffer();
    await blockBlobClient.uploadData(Buffer.from(arrayBuffer), {
      blobHTTPHeaders: { blobContentType: contentType },
    });
  }

  return { url: blockBlobClient.url, pathname: filename };
}

async function azureDelete(url: string): Promise<void> {
  const { BlobServiceClient } = await import("@azure/storage-blob");

  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error(
      "AZURE_STORAGE_CONNECTION_STRING is required when STORAGE_PROVIDER is azure"
    );
  }

  const blobServiceClient =
    BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(
    getAzureContainer()
  );

  // Extract blob name from URL
  const blobUrl = new URL(url);
  // Azure blob URLs: https://<account>.blob.core.windows.net/<container>/<blob-name>
  const parts = blobUrl.pathname.split("/").filter(Boolean);
  // First part is container name, rest is blob path
  const blobName = parts.slice(1).join("/");

  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.deleteIfExists();
}

function azureGetUrl(pathname: string): string {
  if (pathname.startsWith("http")) {
    return pathname;
  }
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "";
  // Extract account name from connection string to build URL
  const accountMatch = connectionString.match(/AccountName=([^;]+)/i);
  const account = accountMatch?.[1] ?? "unknown";
  const container = getAzureContainer();
  return `https://${account}.blob.core.windows.net/${container}/${pathname}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Upload a file to the configured cloud storage provider.
 */
export async function uploadFile(
  file: Buffer | Blob,
  filename: string,
  options?: UploadOptions
): Promise<UploadResult> {
  const provider = getProvider();
  if (provider === "azure") {
    return azureUpload(file, filename, options);
  }
  return vercelUpload(file, filename, options);
}

/**
 * Delete a file from the configured cloud storage provider.
 *
 * @param url — The full URL of the blob to delete.
 */
export async function deleteFile(url: string): Promise<void> {
  const provider = getProvider();
  if (provider === "azure") {
    return azureDelete(url);
  }
  return vercelDelete(url);
}

/**
 * Resolve a pathname to a full public URL.
 *
 * For files uploaded through this module the URL returned by `uploadFile` is
 * usually what you should store. This helper is useful when you only have the
 * pathname/key and need to reconstruct the URL.
 */
export function getFileUrl(pathname: string): string {
  const provider = getProvider();
  if (provider === "azure") {
    return azureGetUrl(pathname);
  }
  return vercelGetUrl(pathname);
}
