import { getStorage } from "../../../../../lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/colloquy/runs/:id — one full persisted transcript. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    return Response.json({ error: "Invalid run id." }, { status: 400 });
  }
  try {
    const run = await getStorage().getRun(id);
    if (!run) return Response.json({ error: "Run not found." }, { status: 404 });
    return Response.json(run);
  } catch {
    return Response.json(
      { error: "The stored transcript could not be read." },
      { status: 500 },
    );
  }
}
