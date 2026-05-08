export const profileAvatarKeys = ["panda", "sloth", "dog", "koala"] as const;

export type ProfileAvatarKey = (typeof profileAvatarKeys)[number];
