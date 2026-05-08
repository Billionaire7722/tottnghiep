import dogAvatar from "./assets/profile-images/dog.gif";
import koalaAvatar from "./assets/profile-images/Koala.gif";
import pandaAvatar from "./assets/profile-images/panda.gif";
import slothAvatar from "./assets/profile-images/Sloth.gif";

export const profileAvatars = [
  { key: "panda", label: "Panda", src: pandaAvatar },
  { key: "sloth", label: "Sloth", src: slothAvatar },
  { key: "dog", label: "Dog", src: dogAvatar },
  { key: "koala", label: "Koala", src: koalaAvatar }
] as const;

export type ProfileAvatarKey = (typeof profileAvatars)[number]["key"];

export function getProfileAvatar(key: string | null | undefined) {
  return profileAvatars.find((avatar) => avatar.key === key) ?? null;
}
