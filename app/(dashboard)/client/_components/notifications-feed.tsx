import { CircleDot } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "./utils";

type NotificationItem = {
  id: string;
  title: string;
  message?: string | null;
  icon?: string | null;
  severity?: string | null;
  createdAt: string;
};

type NotificationsFeedProps = {
  title?: string;
  notifications: NotificationItem[];
};

export function NotificationsFeed({
  title = "Notifications",
  notifications,
}: NotificationsFeedProps) {
  return (
    <Card className="border border-border bg-card shadow-linear">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No notifications at the moment — you are up to date.
          </p>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-border px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <CircleDot className="mt-1 h-4 w-4 text-brand-600" />
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {notification.title}
                  </p>
                  {notification.message ? (
                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                  ) : null}
                </div>
              </div>
              <p className="shrink-0 text-xs text-muted-foreground">
                {formatDate(notification.createdAt, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
