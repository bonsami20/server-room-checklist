export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/submit-checklist") {
      const body = await request.json();

      const response = await fetch(`${env.DIRECTUS_URL}/items/server_room_checklist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.DIRECTUS_TOKEN}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        return new Response(await response.text(), { status: response.status });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
