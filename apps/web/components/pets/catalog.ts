// The pets' public facts for client components, which may not import the content package (it
// carries answer keys). test/pets-catalog.test.ts keeps this in step with
// @just-imagine/learning-content PETS.
export interface PetInfo {
  id: string;
  name: string;
  nameBn: string;
  unlockPoints: number;
}
export const PET_CATALOG: readonly PetInfo[] = [
  { id: 'tuktuk', name: 'Tuktuk', nameBn: 'টুকটুক', unlockPoints: 10 },
  { id: 'chiku', name: 'Chiku', nameBn: 'চিকু', unlockPoints: 25 },
  { id: 'bubbli', name: 'Bubbli', nameBn: 'বুবলি', unlockPoints: 45 },
  { id: 'meghla', name: 'Meghla', nameBn: 'মেঘলা', unlockPoints: 70 },
  { id: 'tara', name: 'Tara', nameBn: 'তারা', unlockPoints: 100 },
  { id: 'golu', name: 'Golu', nameBn: 'গোলু', unlockPoints: 140 },
  { id: 'jhilmil', name: 'Jhilmil', nameBn: 'ঝিলমিল', unlockPoints: 190 },
  { id: 'dhumketu', name: 'Dhumketu', nameBn: 'ধূমকেতু', unlockPoints: 250 },
];
export function petInfo(id: string): PetInfo | undefined {
  return PET_CATALOG.find((pet) => pet.id === id);
}
export function petName(id: string, language: 'en' | 'bn'): string {
  const pet = petInfo(id);
  return pet ? (language === 'bn' ? pet.nameBn : pet.name) : id;
}
