const petAssetModules = import.meta.glob("../../pets/*.{png,jpg,jpeg,webp,gif}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const petAssetUrlByName = new Map(
  Object.entries(petAssetModules).map(([path, url]) => {
    const filename = path.split("/").pop() || path;
    return [filename.toLowerCase(), url];
  })
);

export function resolveGameAssetUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith("data:")) {
    return trimmed;
  }

  return petAssetUrlByName.get(trimmed.toLowerCase()) ?? trimmed;
}
