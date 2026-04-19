"use client";

import Link from "next/link";
import { GitFork, Key, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { track } from "@/lib/posthog/events";

const GITHUB_URL = "https://github.com/westvegh/nextjs-workout-tracker";
const API_URL = "https://exerciseapi.dev";

interface NavCtaProps {
  isSignedIn: boolean;
}

export function NavCta({ isSignedIn }: NavCtaProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 md:flex">
        <Button asChild size="sm" variant="ghost">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => track.forkClicked("nav")}
          >
            <GitFork className="mr-1 h-4 w-4" />
            Fork on GitHub
          </a>
        </Button>
        <Button asChild size="sm">
          <a
            href={API_URL}
            target="_blank"
            rel="noreferrer"
            onClick={() => track.apiKeyClicked("nav")}
          >
            Get API key
          </a>
        </Button>
      </div>
      <div className="md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open CTA menu"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem asChild>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => track.forkClicked("nav")}
              >
                <GitFork className="mr-2 h-4 w-4" />
                Fork on GitHub
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={API_URL}
                target="_blank"
                rel="noreferrer"
                onClick={() => track.apiKeyClicked("nav")}
              >
                <Key className="mr-2 h-4 w-4" />
                Get API key
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!isSignedIn ? (
        <Link
          href="/auth/signin"
          className="ml-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => track.signinStarted()}
        >
          Sign in
        </Link>
      ) : null}
    </div>
  );
}
