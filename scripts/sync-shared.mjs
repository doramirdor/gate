// Mirrors shared pure-TS modules into places that cannot import across
// package boundaries:
//   lib/brand.ts, lib/profile.ts -> supabase/functions/_shared/   (Deno can
//     only bundle files under supabase/functions/)
//   public/brand/*.svg           -> apps/web/public/brand/        (Next.js
//     serves its own public dir)
// Runs automatically before dev/build/deploy via package.json scripts.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const HEADER =
  "// AUTO-GENERATED - edit /lib/%s and run `npm run sync`. Do not edit here.\n";

for (const name of ["brand.ts", "profile.ts"]) {
  const src = readFileSync(join(root, "lib", name), "utf8");
  const dest = join(root, "supabase/functions/_shared", name);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, HEADER.replace("%s", name) + src);
  console.log(`synced lib/${name} -> supabase/functions/_shared/${name}`);
}

const brandSrc = join(root, "public/brand");
const brandDest = join(root, "apps/web/public/brand");
mkdirSync(brandDest, { recursive: true });
for (const file of readdirSync(brandSrc)) {
  if (!file.endsWith(".svg")) continue;
  copyFileSync(join(brandSrc, file), join(brandDest, file));
  console.log(`synced public/brand/${file} -> apps/web/public/brand/${file}`);
}
