import { apiFetch } from "./client";
import type {
  CreatePetRequest,
  CreatePetResponse,
  GetMyPetResponse,
  PetCatalogResponse,
  RevivePetResponse,
  UpdatePetNicknameResponse,
} from "./types";

export function getPetCatalog() {
  return apiFetch<PetCatalogResponse>("/pets/catalog");
}

export function getMyPet() {
  return apiFetch<GetMyPetResponse>("/pets/me");
}

export function createPet(body: CreatePetRequest) {
  return apiFetch<CreatePetResponse>("/pets", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePetNickname(nickname: string) {
  return apiFetch<UpdatePetNicknameResponse>("/pets/me/nickname", {
    method: "PATCH",
    body: JSON.stringify({ nickname }),
  });
}

export function revivePet() {
  return apiFetch<RevivePetResponse>("/pets/me/revive", {
    method: "POST",
  });
}
