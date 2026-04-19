"use client";

import Link from "next/link";
import { useRef } from "react";
import { track } from "@/lib/posthog/events";

interface FeaturedMovementCardProps {
  id: string;
  name: string;
  primaryMuscle: string | null;
  equipment: string | null;
  videoUrl: string;
}

export function FeaturedMovementCard({
  id,
  name,
  primaryMuscle,
  equipment,
  videoUrl,
}: FeaturedMovementCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  function playMuted() {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = 0;
    const maybePromise = el.play();
    if (maybePromise && typeof maybePromise.catch === "function") {
      maybePromise.catch(() => {
        // Browsers may reject autoplay; ignore.
      });
    }
  }

  function pause() {
    const el = videoRef.current;
    if (!el) return;
    el.pause();
  }

  return (
    <Link
      href={`/exercises/${id}`}
      onClick={() => track.exerciseDetailOpened(id)}
      onMouseEnter={playMuted}
      onMouseLeave={pause}
      onFocus={playMuted}
      onBlur={pause}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/20"
    >
      <div className="aspect-video w-full overflow-hidden bg-muted">
        <video
          ref={videoRef}
          src={videoUrl}
          muted
          loop
          playsInline
          preload="metadata"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-sm font-medium leading-tight tracking-tight">
          {name}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {primaryMuscle ? <span className="capitalize">{primaryMuscle}</span> : null}
          {primaryMuscle && equipment ? <span className="mx-1">&middot;</span> : null}
          {equipment ? <span className="capitalize">{equipment}</span> : null}
        </p>
        <p className="mt-3 text-xs text-muted-foreground group-hover:text-foreground">
          Click to view &rarr;
        </p>
      </div>
    </Link>
  );
}
