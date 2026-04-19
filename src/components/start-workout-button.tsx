"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setWorkoutStatus } from "@/app/workouts/actions";
import { getStore } from "@/lib/workout-store";

interface StartWorkoutButtonProps {
  workoutId: string;
  isGuest?: boolean;
}

export function StartWorkoutButton({
  workoutId,
  isGuest = false,
}: StartWorkoutButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (isGuest) {
        const store = await getStore(null);
        await store.setWorkoutStatus(workoutId, "in_progress");
      } else {
        await setWorkoutStatus(workoutId, "in_progress");
      }
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
