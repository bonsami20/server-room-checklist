// src/index.js

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function valueFrom(body, ...keys) {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
      return body[key];
    }
  }
  return null;
}

async function verifyTelegramUser(body, env) {
  if (!body.telegram_init_data) {
    // Allows submissions from normal browser / PWA.
    // If you want Telegram-only access, replace this with a 403 response.
    return { ok: true, skipped: true };
  }

  const initData = new URLSearchParams(body.telegram_init_data);
  const userRaw = initData.get("user");

  if (!userRaw) {
    return { ok: false, message: "Access denied. Telegram user not found." };
  }

  const telegramUser = JSON.parse(userRaw);
  const userId = telegramUser.id;

  const memberResponse = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${env.TELEGRAM_GROUP_ID}&user_id=${userId}`
  );

  const memberData = await memberResponse.json();
  const allowedStatuses = ["creator", "administrator", "member"];

  if (!memberData.ok || !allowedStatuses.includes(memberData.result.status)) {
    return {
      ok: false,
      message: "Access denied. You are not a member of the authorized Telegram group."
    };
  }

  return { ok: true, skipped: false };
}

async function insertIntoD1(body, env) {
  const cleanedBody = { ...body };
  delete cleanedBody.telegram_init_data;

  const columns = [
    "date", "heure", "nom",
    "temperature_status", "temperature_comment",
    "humidity_status", "humidity_comment",
    "hvac_status", "hvac_comment",
    "airflow_status", "airflow_comment",
    "proprete_status", "proprete_comment",
    "onduleurs_ups", "onduleurs_ups_comment",
    "alarme_ups", "alarme_ups_comment",
    "cables_dalimentation", "cables_dalimentation_comment",
    "acces", "acces_comment",
    "cameras_cctv", "cameras_cctv_comment",
    "zones_sensibles", "zones_sensibles_comment",
    "voyants_serveurs", "voyants_serveurs_comment",
    "voyants_disques_san", "voyants_disques_san_comment",
    "voyants_disques_nas", "voyants_disques_nas_comment",
    "ventilation", "ventilation_comment",
    "infrastructure_reseau", "infrastructure_reseau_comment",
    "fortigate_silver_peak", "fortigate_silver_peak_comment",
    "etat_sauvegardes", "etat_sauvegardes_comment",
    "alertes_systeme", "alertes_systeme_comment",
    "ordinateurs_machines_virtuelles", "ordinateurs_machines_virtuelles_comment",
    "ordre", "ordre_comment",
    "raw_json"
  ];

  const values = [
    valueFrom(body, "date", "Date"),
    valueFrom(body, "heure", "Heure"),
    valueFrom(body, "nom", "Nom"),

    valueFrom(body, "temperature_status", "Temperature_status"),
    valueFrom(body, "temperature_comment", "Temperature_comment"),

    valueFrom(body, "humidity_status", "Humidity_status"),
    valueFrom(body, "humidity_comment", "Humidity_comment"),

    valueFrom(body, "hvac_status", "HVAC_status"),
    valueFrom(body, "hvac_comment", "HVAC_comment"),

    valueFrom(body, "airflow_status", "Airflow", "Airflow_status"),
    valueFrom(body, "airflow_comment", "Airflow_comment"),

    valueFrom(body, "proprete_status", "Proprete_status"),
    valueFrom(body, "proprete_comment", "Proprete_comment"),

    valueFrom(body, "onduleurs_ups", "Onduleurs_UPS"),
    valueFrom(body, "onduleurs_ups_comment", "Onduleurs_UPS_comment"),

    valueFrom(body, "alarme_ups", "Alarme_UPS"),
    valueFrom(body, "alarme_ups_comment", "Alarme_UPS_comment"),

    valueFrom(body, "cables_dalimentation", "Cables_dalimentation"),
    valueFrom(body, "cables_dalimentation_comment", "Cables_dalimentation_comment"),

    valueFrom(body, "acces", "Acces"),
    valueFrom(body, "acces_comment", "Acces_comment"),

    valueFrom(body, "cameras_cctv", "Cameras_de_surveillance_CCTV"),
    valueFrom(body, "cameras_cctv_comment", "Cameras_de_surveillance_comment"),

    valueFrom(body, "zones_sensibles", "Zones_sensibles"),
    valueFrom(body, "zones_sensibles_comment", "Zones_sensibles_comment"),

    valueFrom(body, "voyants_serveurs", "Voyants_des_serveurs"),
    valueFrom(body, "voyants_serveurs_comment", "Voyants_des_serveurs_comment"),

    valueFrom(body, "voyants_disques_san", "Voyants_des_disques_SAN"),
    valueFrom(body, "voyants_disques_san_comment", "Voyants_des_disques_SAN_comment"),

    valueFrom(body, "voyants_disques_nas", "Voyants_des_disques_NAS"),
    valueFrom(body, "voyants_disques_nas_comment", "Voyants_des_disques_NAS_comment"),

    valueFrom(body, "ventilation", "Ventilation"),
    valueFrom(body, "ventilation_comment", "Ventilation_comment"),

    valueFrom(body, "infrastructure_reseau", "Infrastructure_reseau"),
    valueFrom(body, "infrastructure_reseau_comment", "Infrastructure_reseau_comment"),

    valueFrom(body, "fortigate_silver_peak", "Fortigate__Silver_Peak", "Fortigate_Silver_Peak"),
    valueFrom(body, "fortigate_silver_peak_comment", "Fortigate__Silver_Peak_comment", "Fortigate_Silver_Peak_comment"),

    valueFrom(body, "etat_sauvegardes", "Etat_des_sauvegardes"),
    valueFrom(body, "etat_sauvegardes_comment", "Etat_des_sauvegardes_comment"),

    valueFrom(body, "alertes_systeme", "Alertes_systeme"),
    valueFrom(body, "alertes_systeme_comment", "Alertes_systeme_comment"),

    valueFrom(body, "ordinateurs_machines_virtuelles", "OrdinateursMachines_virtuelles"),
    valueFrom(body, "ordinateurs_machines_virtuelles_comment", "OrdinateursMachines_virtuelles_comment"),

    valueFrom(body, "ordre", "Ordre"),
    valueFrom(body, "ordre_comment", "Ordre_comment"),

    JSON.stringify(cleanedBody)
  ];

  const placeholders = columns.map(() => "?").join(", ");

  await env.DB.prepare(`
    INSERT INTO checklist (${columns.join(", ")})
    VALUES (${placeholders})
  `).bind(...values).run();
}

async function sendToDirectus(body, env) {
  if (!env.DIRECTUS_URL || !env.DIRECTUS_TOKEN) {
    return;
  }

  const cleanedBody = { ...body };
  delete cleanedBody.telegram_init_data;

  const response = await fetch(`${env.DIRECTUS_URL}/items/server_room_checklist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${env.DIRECTUS_TOKEN}`
    },
    body: JSON.stringify(cleanedBody)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }
}

function calendarHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Server Room Checklist Calendar</title>
  <style>
    body{font-family:Arial;padding:30px;background:#f4f6f8;}
    h1{margin-bottom:10px;}
    .legend{margin-bottom:20px;}
    .legend span{margin-right:20px;}
    .nav{
  display:flex;
  justify-content:center;
  align-items:center;
  gap:30px;
  margin-bottom:20px;
}

.nav h2{
  margin:0;
  min-width:180px;
  text-align:center;
}

.nav button{
  width:auto;
  padding:8px 16px;
  border:none;
  border-radius:6px;
  background:#1f2937;
  color:white;
  cursor:pointer;
}

.nav button:hover{
  background:#374151;
}
    .calendar{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;max-width:1100px;}
    .header{font-weight:bold;text-align:center;background:#1f2937;color:white;padding:10px;border-radius:6px;}
    .day{background:white;min-height:110px;padding:10px;border-radius:8px;border:1px solid #ddd;cursor:pointer;}
    .empty{background:#e5e7eb;cursor:default;}
    .ok{background:#dcfce7;border-color:#22c55e;}
    .ko{background:#fee2e2;border-color:#ef4444;}
    .missing{background:#f3f4f6;color:#999;}
    .date-number{font-weight:bold;font-size:18px;}
    .status{margin-top:10px;font-size:14px;}
  </style>
</head>
<body>
  <h1>Server Room Checklist Calendar</h1>

  <div class="legend">
    <span><b style="color:#22c55e;">Green</b> = Done / OK</span>
    <span><b style="color:#ef4444;">Red</b> = Done with KO</span>
    <span><b style="color:#9ca3af;">Gray</b> = No checklist</span>
  </div>

  <div class="nav">
    <button id="prevMonth">&larr; Previous</button>
    <h2 id="monthTitle"></h2>
    <button id="nextMonth">Next &rarr; </button>
  </div>

  <div class="calendar" id="calendar">
    <div class="header">Sun</div>
    <div class="header">Mon</div>
    <div class="header">Tue</div>
    <div class="header">Wed</div>
    <div class="header">Thu</div>
    <div class="header">Fri</div>
    <div class="header">Sat</div>
  </div>

  <script>
    fetch('/api/calendar-data')
      .then(r => r.json())
      .then(data => {
        const calendar = document.getElementById('calendar');
        const records = {};

        data.forEach(item => {
          records[item.date] = item;
        });

        const params = new URLSearchParams(window.location.search);

        let year = Number(params.get('year')) || new Date().getFullYear();
        let month = Number(params.get('month'));

        if (Number.isNaN(month)) {
          month = new Date().getMonth();
        }

        document.getElementById('monthTitle').textContent =
          new Date(year, month, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const startDay = firstDay.getDay();
        const totalDays = lastDay.getDate();

        for (let i = 0; i < startDay; i++) {
          const empty = document.createElement('div');
          empty.className = 'day empty';
          calendar.appendChild(empty);
        }

        for (let day = 1; day <= totalDays; day++) {
          const dateString =
            year + '-' +
            String(month + 1).padStart(2, '0') + '-' +
            String(day).padStart(2, '0');

          const div = document.createElement('div');
          const record = records[dateString];

          if (!record) {
            div.className = 'day missing';
            div.innerHTML =
              '<div class="date-number">' + day + '</div>' +
              '<div class="status">No checklist</div>';
          } else if (record.ko_count > 0) {
            div.className = 'day ko';
            div.innerHTML =
              '<div class="date-number">' + day + '</div>' +
              '<div class="status">Checklists: ' + record.total + '</div>' +
              '<div class="status">KO: ' + record.ko_count + '</div>';
            div.onclick = () => {
              window.location = '/day-details?date=' + dateString;
            };
          } else {
            div.className = 'day ok';
            div.innerHTML =
              '<div class="date-number">' + day + '</div>' +
              '<div class="status">Checklists: ' + record.total + '</div>' +
              '<div class="status">All OK</div>';
            div.onclick = () => {
              window.location = '/day-details?date=' + dateString;
            };
          }

          calendar.appendChild(div);
        }

        document.getElementById('prevMonth').onclick = () => {
          let newMonth = month - 1;
          let newYear = year;

          if (newMonth < 0) {
            newMonth = 11;
            newYear--;
          }

          window.location = '/calendar?year=' + newYear + '&month=' + newMonth;
        };

        document.getElementById('nextMonth').onclick = () => {
          let newMonth = month + 1;
          let newYear = year;

          if (newMonth > 11) {
            newMonth = 0;
            newYear++;
          }

          window.location = '/calendar?year=' + newYear + '&month=' + newMonth;
        };
      });
  </script>
</body>
</html>`;
}

function dayDetailsHtml(date, rows) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Checklist Details</title>
  <style>
    body{font-family:Arial;padding:20px;background:#f4f6f8;}
    table{border-collapse:collapse;width:100%;background:white;}
    th,td{border:1px solid #ccc;padding:8px;text-align:left;}
    th{background:#e5e7eb;}
  </style>
</head>
<body>
  <h1>Checklist Details</h1>
  <h2>${date}</h2>

  <table>
    <tr>
      <th>ID</th>
      <th>Heure</th>
      <th>Nom</th>
      <th>Temperature</th>
      <th>Humidity</th>
      <th>HVAC</th>
    </tr>
    ${rows.map(r => `
      <tr>
        <td>${r.id ?? ""}</td>
        <td>${r.heure ?? ""}</td>
        <td>${r.nom ?? ""}</td>
        <td>${r.temperature_status ?? ""}</td>
        <td>${r.humidity_status ?? ""}</td>
        <td>${r.hvac_status ?? ""}</td>
      </tr>
    `).join("")}
  </table>

  <br>
  <a href="/calendar">&larr; Back to Calendar</a>
</body>
</html>`;
}

function dashboardHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Server Room Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body{font-family:Arial;padding:30px;background:#f4f6f8;}
    table{border-collapse:collapse;background:white;}
    th,td{border:1px solid #ccc;padding:8px;}
    th{background:#e5e7eb;}
    .charts{display:flex;gap:40px;flex-wrap:wrap;margin-top:25px;}
    .chart-box{width:280px;}
  </style>
</head>
<body>
  <h1>Server Room Checklist Dashboard</h1>
  <h2>Total Inspections: <span id="total">Loading...</span></h2>

  <h3>HVAC Status</h3>
  <ul id="hvac"></ul>

  <h3>Temperature Status</h3>
  <ul id="temperature"></ul>

  <h3>Humidity Status</h3>
  <ul id="humidity"></ul>

  <h3>Latest Inspections</h3>
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Date</th>
        <th>Heure</th>
        <th>Nom</th>
        <th>Temperature</th>
        <th>Humidity</th>
        <th>HVAC</th>
      </tr>
    </thead>
    <tbody id="recent"></tbody>
  </table>

  <h3>Charts</h3>
  <div class="charts">
    <div class="chart-box">
      <h4>HVAC</h4>
      <canvas id="hvacChart"></canvas>
    </div>

    <div class="chart-box">
      <h4>Temperature</h4>
      <canvas id="temperatureChart"></canvas>
    </div>

    <div class="chart-box">
      <h4>Humidity</h4>
      <canvas id="humidityChart"></canvas>
    </div>
  </div>

  <p><a href="/calendar">Open Calendar</a></p>

  <script>
    fetch('/api/dashboard-data')
      .then(res => res.json())
      .then(data => {
        document.getElementById('total').textContent = data.total;

        function fillList(id, rows) {
          const list = document.getElementById(id);
          list.innerHTML = '';
          rows.forEach(row => {
            const li = document.createElement('li');
            li.textContent = (row.status || 'Missing') + ': ' + row.count;
            list.appendChild(li);
          });
        }

        fillList('hvac', data.hvac);
        fillList('temperature', data.temperature);
        fillList('humidity', data.humidity);

        const recentTable = document.getElementById('recent');
        recentTable.innerHTML = '';

        data.recent.forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + (row.id ?? '') + '</td>' +
            '<td>' + (row.date ?? '') + '</td>' +
            '<td>' + (row.heure ?? '') + '</td>' +
            '<td>' + (row.nom ?? '') + '</td>' +
            '<td>' + (row.temperature_status ?? '') + '</td>' +
            '<td>' + (row.humidity_status ?? '') + '</td>' +
            '<td>' + (row.hvac_status ?? '') + '</td>';
          recentTable.appendChild(tr);
        });

        function createPieChart(canvasId, rows, title) {
          const total = rows.reduce((sum, row) => sum + row.count, 0);

          new Chart(document.getElementById(canvasId), {
            type: 'pie',
            data: {
              labels: rows.map(row => {
                const percent = total ? Math.round((row.count / total) * 100) : 0;
                return (row.status || 'Missing') + ' (' + percent + '%)';
              }),
              datasets: [{
                label: title,
                data: rows.map(row => row.count),
                backgroundColor: rows.map(row => {
                  if (row.status === 'OK') return '#22c55e';
                  if (row.status === 'KO') return '#ef4444';
                  return '#f59e0b';
                })
              }]
            },
            options: {
              plugins: {
                title: { display: true, text: title },
                legend: { position: 'bottom' }
              }
            }
          });
        }

        createPieChart('hvacChart', data.hvac, 'HVAC Status');
        createPieChart('temperatureChart', data.temperature, 'Temperature Status');
        createPieChart('humidityChart', data.humidity, 'Humidity Status');
      });
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/calendar-data") {
      try {
        const rows = await env.DB.prepare(`
          SELECT
            date,
            COUNT(*) AS total,
            SUM(
              CASE
                WHEN temperature_status = 'KO'
                  OR humidity_status = 'KO'
                  OR hvac_status = 'KO'
                THEN 1
                ELSE 0
              END
            ) AS ko_count
          FROM checklist
          WHERE date IS NOT NULL
          GROUP BY date
          ORDER BY date
        `).all();

        return jsonResponse(rows.results);
      } catch (error) {
        return jsonResponse({ error: error.message }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/calendar") {
      return new Response(calendarHtml(), {
        headers: { "Content-Type": "text/html" }
      });
    }

    if (request.method === "GET" && url.pathname === "/day-details") {
      try {
        const date = url.searchParams.get("date");

        if (!date) {
          return new Response("Missing date parameter", { status: 400 });
        }

        const rows = await env.DB.prepare(`
          SELECT id, heure, nom, temperature_status, humidity_status, hvac_status
          FROM checklist
          WHERE date = ?
          ORDER BY heure DESC
        `).bind(date).all();

        return new Response(dayDetailsHtml(date, rows.results), {
          headers: { "Content-Type": "text/html" }
        });
      } catch (error) {
        return jsonResponse({ error: error.message }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/api/dashboard-data") {
      try {
        const total = await env.DB.prepare(`
          SELECT COUNT(*) AS total FROM checklist
        `).first();

        const hvac = await env.DB.prepare(`
          SELECT hvac_status AS status, COUNT(*) AS count
          FROM checklist
          GROUP BY hvac_status
        `).all();

        const temperature = await env.DB.prepare(`
          SELECT temperature_status AS status, COUNT(*) AS count
          FROM checklist
          GROUP BY temperature_status
        `).all();

        const humidity = await env.DB.prepare(`
          SELECT humidity_status AS status, COUNT(*) AS count
          FROM checklist
          GROUP BY humidity_status
        `).all();

        const recent = await env.DB.prepare(`
          SELECT id, date, heure, nom, temperature_status, humidity_status, hvac_status
          FROM checklist
          ORDER BY id DESC
          LIMIT 10
        `).all();

        return jsonResponse({
          total: total.total,
          hvac: hvac.results,
          temperature: temperature.results,
          humidity: humidity.results,
          recent: recent.results
        });
      } catch (error) {
        return jsonResponse({ error: error.message }, 500);
      }
    }

    if (request.method === "GET" && url.pathname === "/dashboard") {
      return new Response(dashboardHtml(), {
        headers: { "Content-Type": "text/html" }
      });
    }

    if (request.method === "POST" && url.pathname === "/submit-checklist") {
      try {
        const body = await request.json();

        const verification = await verifyTelegramUser(body, env);

        if (!verification.ok) {
          return jsonResponse(
            { success: false, error: verification.message },
            403
          );
        }

        await sendToDirectus(body, env);

        if (env.DB) {
          await insertIntoD1(body, env);
        }

        return jsonResponse({ success: true });
      } catch (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
