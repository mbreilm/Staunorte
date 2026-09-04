"use client";

import { useRouter } from "next/navigation";
import { MeldeFormular } from "@/components/melden/MeldeFormular";

export function MeldeSeiteClient({ placeId }: { placeId: string }) {
  const router = useRouter();

  return (
    <main className="flex-1">
      <MeldeFormular
        targetType="place"
        targetId={placeId}
        onFertig={() => router.push(`/ort/${placeId}`)}
      />
    </main>
  );
}
