import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PetForm } from "@/components/pet-form";
import { createPetAction } from "@/lib/pet-actions";
import { NewPetClient } from "./new-pet-client";

export default async function NewPetPage() {
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

  return (
    <NewPetClient
      fullForm={<PetForm action={createPetAction} shopId={staff.shop_id} />}
    />
  );
}
