"use client";

import { useCallback, useState } from "react";

import { ReferralOverview } from "@/app/(dashboard)/client/_components";

type ReferralOverviewProps = React.ComponentProps<typeof ReferralOverview>;

export function ReferralOverviewClient(props: ReferralOverviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(
    async (shareUrl: string) => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy referral link", error);
      }
    },
    [],
  );

  return (
    <div className="space-y-3">
      <ReferralOverview {...props} onCopyLink={handleCopy} />
      {copied ? (
        <p className="text-sm text-emerald-600">Link copied to clipboard ✨</p>
      ) : null}
    </div>
  );
}
