import { AlertTriangle } from "lucide-react";

interface SetupBannerProps {
  title: string;
  envVar: string;
  description?: React.ReactNode;
}

export function SetupBanner({ title, envVar, description }: SetupBannerProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-2">
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm">
            Set <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/60">{envVar}</code> in
            your <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/60">.env.local</code>{" "}
            and restart the dev server.
          </p>
          {description ? <div className="text-sm">{description}</div> : null}
        </div>
      </div>
    </div>
  );
}
