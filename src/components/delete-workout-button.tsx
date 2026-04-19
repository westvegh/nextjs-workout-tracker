"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteWorkout } from "@/app/workouts/actions";
import { getStore } from "@/lib/workout-store";

interface DeleteWorkoutButtonProps {
  workoutId: string;
  isGuest?: boolean;
}

export function DeleteWorkoutButton({
  workoutId,
  isGuest = false,
}: DeleteWorkoutButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        if (isGuest) {
          const store = await getStore(null);
          await store.deleteWorkout(workoutId);
          router.push("/workouts");
          router.refresh();
        } else {
          await deleteWorkout(workoutId);
        }
        toast.success("Workout deleted.");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Delete failed."
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete workout?</DialogTitle>
          <DialogDescription>
            This removes the workout, its exercises, and all logged sets. It
            can&apos;t be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
