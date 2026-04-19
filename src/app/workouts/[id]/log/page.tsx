type Params = Promise<{ id: string }>;

export default async function WorkoutLogPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Log workout</h1>
      <p className="mt-2 text-muted-foreground">
        TODO: set logger for workout <code>{id}</code>.
      </p>
    </main>
  );
}
