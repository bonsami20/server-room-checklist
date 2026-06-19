export async function onRequestPost(context) {
  try {
    const body = await context.request.json();

    const response = await fetch(
      `${context.env.DIRECTUS_URL}/items/server_room_checklist`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${context.env.DIRECTUS_TOKEN}`
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return new Response(error, { status: response.status });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    return new Response(error.message, { status: 500 });
  }
}
