"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setWorkoutStatus } from "@/app/workouts/actions";

export function StartWorkoutButton({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await setWorkoutStatus(workoutId, "in_progress");
      router.push(`/workouts/${workoutId}/log`);
      router.refresh();
    });
  }

  return (
    <Button onClick={handleClick} disabled={pending}>
      {pending ? "Starting..." : "Start workout"}
    </Button>
  );
}
