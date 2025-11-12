import type { SessionUser } from "@/lib/auth/types";

export type ProfilePageViewModel = {
  profile: {
    fullName: string;
    email: string;
    phone: string;
    timezone: string;
  };
};

export async function loadProfilePageData(
  sessionUser: SessionUser,
): Promise<ProfilePageViewModel> {
  const currentProfile = sessionUser.profile;

  return {
    profile: {
      fullName: currentProfile?.full_name ?? "",
      email: sessionUser.user.email ?? "",
      phone: currentProfile?.phone ?? "",
      timezone: currentProfile?.timezone ?? "Asia/Dubai",
    },
  };
}
