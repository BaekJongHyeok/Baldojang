import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PetForm } from "@/components/pet-form";
import { updatePetAction } from "@/lib/pet-actions";
import { getPetPhotoUrl } from "@/lib/storage";

export default async function EditPetPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: staff } = await supabase
    .from("staff")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!staff) redirect("/dashboard");

  const { data: pet } = await supabase
    .from("pets")
    .select(
      "id, name, breed, size, birth_date, weight_kg, photo_url, caution_tags, caution_memo, vaccinated, neutered, customer_id, customers(id, name, phone)",
    )
    .eq("id", petId)
    .single();

  if (!pet) notFound();

  const photoSignedUrl = await getPetPhotoUrl(pet.photo_url);

  const customer = Array.isArray(pet.customers)
    ? pet.customers[0]
    : pet.customers;

  return (
    <div>
      <h1 className="text-xl font-bold text-stone-900">펫 수정</h1>
      <div className="mt-6">
        <PetForm
          action={updatePetAction}
          pet={{
            id: pet.id,
            name: pet.name,
            breed: pet.breed,
            size: pet.size,
            birth_date: pet.birth_date,
            weight_kg: pet.weight_kg,
            photo_url: pet.photo_url,
            caution_tags: pet.caution_tags,
            caution_memo: pet.caution_memo,
            vaccinated: pet.vaccinated,
            neutered: pet.neutered,
            customer_id: pet.customer_id,
          }}
          customer={customer ?? undefined}
          shopId={staff.shop_id}
          initialPhotoSignedUrl={photoSignedUrl ?? undefined}
        />
      </div>
    </div>
  );
}
