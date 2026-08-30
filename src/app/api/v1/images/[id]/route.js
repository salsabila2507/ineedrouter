import { getGeneratedImage } from "open-sse/handlers/imageProviders/cache.js";

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
}

export async function GET(_request, { params }) {
  const { id } = await params;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json(
      { error: { message: "Invalid image ID", type: "invalid_request_error" } },
      { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const image = getGeneratedImage(id);
  if (!image) {
    return Response.json(
      { error: { message: "Image not found or expired", type: "invalid_request_error" } },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  return new Response(image.bytes, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
