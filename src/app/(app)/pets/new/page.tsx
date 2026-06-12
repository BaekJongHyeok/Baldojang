import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-cache";
import { PetForm } from "@/components/pet-form";
import { createPetAction } from "@/lib/pet-actions";
import { NewPetClient } from "./new-pet-client";

export default async function NewPetPage() {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <NewPetClient
      fullForm={<PetForm action={createPetAction} shopId={ctx.staff.shopId} />}
    />
  );
}
