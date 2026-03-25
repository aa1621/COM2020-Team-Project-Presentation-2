const localAssetModules = import.meta.glob("../assets/pets/*.{png,jpg,jpeg,webp,gif}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").trim().replace(/\/+$/, "");
const defaultAssetBucket = (import.meta.env.VITE_SUPABASE_ASSET_BUCKET || "")
  .trim()
  .replace(/^\/+|\/+$/g, "");

const localAssetUrlByName = new Map(
  Object.entries(localAssetModules).map(([path, url]) => {
    const filename = path.split("/").pop() || path;
    return [filename.toLowerCase(), url];
  })
);

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function buildSupabasePublicUrl(path: string) {
  if (!supabaseUrl) return path;

  const trimmedPath = path.trim().replace(/^\/+/, "");
  if (!trimmedPath) return null;

  if (trimmedPath.startsWith("storage/v1/object/public/")) {
    return `${supabaseUrl}/${encodeStoragePath(trimmedPath)}`;
  }

  if (trimmedPath.startsWith("object/public/")) {
    return `${supabaseUrl}/storage/v1/${encodeStoragePath(trimmedPath)}`;
  }

  if (trimmedPath.startsWith("public/")) {
    return `${supabaseUrl}/storage/v1/object/${encodeStoragePath(trimmedPath)}`;
  }

  const storagePath =
    defaultAssetBucket && !trimmedPath.includes("/")
      ? `${defaultAssetBucket}/${trimmedPath}`
      : trimmedPath;

  return `${supabaseUrl}/storage/v1/object/public/${encodeStoragePath(storagePath)}`;
}

// resolution order: absolute/data/blob URLs pass through untouched,
// relative paths go to Supabase storage first, then fall back to local bundled assets
export function resolveGameAssetUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (
    /^(https?:)?\/\//i.test(trimmed) ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  const localFallback = localAssetUrlByName.get(trimmed.toLowerCase());

  return buildSupabasePublicUrl(trimmed) ?? localFallback ?? trimmed;
}
