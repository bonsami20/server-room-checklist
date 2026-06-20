export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/submit-checklist") {
      try {
        const body = await request.json();

        if (!body.telegram_init_data) {
          return new Response(JSON.stringify(memberData, null, 2),
          {
              status: 403,
              headers: { "Content-Type": "application/json" }
       }
      );
        }

        const initData = new URLSearchParams(body.telegram_init_data);
        const userRaw = initData.get("user");

        if (!userRaw) {
          return new Response("Access denied. Telegram user not found.", {
            status: 403
          });
        }

        const telegramUser = JSON.parse(userRaw);
        const userId = telegramUser.id;

        const memberResponse = await fetch(
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${env.TELEGRAM_GROUP_ID}&user_id=${userId}`
        );

        const memberData = await memberResponse.json();

        const allowedStatuses = ["creator", "administrator", "member"];

        if (!memberData.ok || !allowedStatuses.includes(memberData.result.status)) {
          return new Response("Access denied. You are not a member of the authorized Telegram group.", {
            status: 403
          });
        }

        delete body.telegram_init_data;

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

      } catch (error) {
        return new Response(error.message, { status: 500 });
      }
    }

    return env.ASSETS.fetch(request);
  }
};
