import { createClient } from "@/lib/supabase/server";
import { AlbumGrid } from "@/components/album/AlbumGrid";

const KATEGORIE = process.env.NEXT_PUBLIC_DEFAULT_CATEGORY || "baustelle";

export default async function AlbumSeite() {
  const supabase = await createClient();

  const [{ data: typen }, { data: userData }] = await Promise.all([
    supabase
      .from("observable_types")
      .select("*")
      .eq("category_id", KATEGORIE)
      .eq("is_active", true)
      .order("sort_order"),
    supabase.auth.getUser(),
  ]);

  const user = userData.user;

  const { data: freischaltungen } = user
    ? await supabase
        .from("user_observable_unlocks")
        .select("observable_type_id, unlocked_at, first_place_id, places(title)")
        .eq("user_id", user.id)
    : { data: null };

  return (
    <main className="flex-1 px-6 py-6 pb-10">
      <AlbumGrid
        typen={typen ?? []}
        freischaltungen={freischaltungen ?? []}
        angemeldet={!!user}
      />
    </main>
  );
}
