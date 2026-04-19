export function Footer() {
  return (
    <footer className="mt-auto border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <p>
          Built with{" "}
          <a
            href="https://exerciseapi.dev"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            exerciseapi.dev
          </a>
        </p>
        <p>MIT licensed. Fork it, ship it.</p>
      </div>
    </footer>
  );
}
