import { MeldeSeiteClient } from "./MeldeSeiteClient";

export default async function OrtMeldenSeite({
  params,
}: PageProps<"/ort/[id]/melden">) {
  const { id } = await params;
  return <MeldeSeiteClient placeId={id} />;
}
