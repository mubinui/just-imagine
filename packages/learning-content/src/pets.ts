import { PetSchema, type Pet } from './schema';

// Eight collectible pets unlocked by accumulated points (spec 6b). Thresholds rise so that the
// first pet arrives after two or three challenges and the last after most of the six sections.
// Art and sounds are authored separately; the sound paths below are the agreed locations.
export const PETS: readonly Pet[] = [
  {
    id: 'tuktuk',
    name: 'Tuktuk',
    nameBn: 'টুকটুক',
    look: 'a tiny green turtle with a star-patterned shell and sleepy eyes',
    sound: 'assets/sounds/pets/tuktuk.ogg',
    unlockPoints: 10,
  },
  {
    id: 'chiku',
    name: 'Chiku',
    nameBn: 'চিকু',
    look: 'a fluffy yellow chick with one feather sticking up',
    sound: 'assets/sounds/pets/chiku.ogg',
    unlockPoints: 25,
  },
  {
    id: 'bubbli',
    name: 'Bubbli',
    nameBn: 'বুবলি',
    look: 'a round orange goldfish in a floating bubble of water',
    sound: 'assets/sounds/pets/bubbli.ogg',
    unlockPoints: 45,
  },
  {
    id: 'meghla',
    name: 'Meghla',
    nameBn: 'মেঘলা',
    look: 'a cloud-grey bunny with long ears and pink cheeks',
    sound: 'assets/sounds/pets/meghla.ogg',
    unlockPoints: 70,
  },
  {
    id: 'tara',
    name: 'Tara',
    nameBn: 'তারা',
    look: 'a firefly with a glowing golden tail and big curious eyes',
    sound: 'assets/sounds/pets/tara.ogg',
    unlockPoints: 100,
  },
  {
    id: 'golu',
    name: 'Golu',
    nameBn: 'গোলু',
    look: 'a chubby panda cub who is always holding a bamboo stick',
    sound: 'assets/sounds/pets/golu.ogg',
    unlockPoints: 140,
  },
  {
    id: 'jhilmil',
    name: 'Jhilmil',
    nameBn: 'ঝিলমিল',
    look: 'a butterfly with rainbow wings that sparkle when she flaps',
    sound: 'assets/sounds/pets/jhilmil.ogg',
    unlockPoints: 190,
  },
  {
    id: 'dhumketu',
    name: 'Dhumketu',
    nameBn: 'ধূমকেতু',
    look: 'a small orange fox with a tail that trails like a comet',
    sound: 'assets/sounds/pets/dhumketu.ogg',
    unlockPoints: 250,
  },
].map((pet) => PetSchema.parse(pet));

export function petById(id: string): Pet | undefined {
  return PETS.find((pet) => pet.id === id);
}
