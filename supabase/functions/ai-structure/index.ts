import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const adminKey = req.headers.get("x-admin-key");
    if (adminKey !== Deno.env.get("ADMIN_SECRET")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { meta, answers } = await req.json();

    const prompt = `Du bist ein MVP-Stratege bei einer Digitalagentur. Strukturiere die folgenden Discovery-Antworten in ein JSON-Blueprint-Objekt für ein MVP-Projekt.

Projektname: ${meta.name}
Kunde: ${meta.client}

Discovery-Antworten:
Problem: ${answers.problem}
Ist-Zustand: ${answers.heute}
Zielgruppe: ${answers.zielgruppe}
Nutzerziel: ${answers.nutzerziel}
Hypothese: ${answers.hypothese}
Minimal Scope: ${answers.scope}
Nicht-Scope: ${answers.nicht_scope}
KPIs: ${answers.kpis}
Offene Fragen: ${answers.offen}

Gib NUR gültiges JSON zurück (kein Markdown, kein Kommentar), exakt in diesem Format:
{
  "problem": "1-2 Sätze, präzise Problembeschreibung",
  "zielgruppe": "1-2 Sätze, wer nutzt das MVP",
  "hypothese": "Wenn wir X bauen, dann Y — messbar und konkret",
  "scope": ["Funktion 1 mit kurzer Erklärung", "Funktion 2", "Funktion 3"],
  "nicht_scope": ["Was explizit nicht gebaut wird 1", "2", "3"],
  "heute": ["Problem 1 (Ist-Zustand)", "Problem 2", "Problem 3", "Problem 4", "Problem 5"],
  "mit_mvp": ["Lösung 1 (Was Go 2 Flow baut)", "Lösung 2", "Lösung 3", "Lösung 4", "Lösung 5"],
  "kpis": [
    {"metrik": "Name", "messung": "Wie gemessen", "ziel": "Zielwert"},
    {"metrik": "Name 2", "messung": "Wie gemessen", "ziel": "Zielwert"}
  ],
  "features": [
    {
      "name": "Feature Name",
      "icon": "🔧",
      "requirements": ["Anforderung 1", "Anforderung 2", "Anforderung 3"]
    }
  ]
}

Halte Texte kurz und präzise (max. 1-2 Sätze pro Feld, Listen-Items max. 1 Zeile).`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const aiData = await aiRes.json();
    const rawText = aiData.content[0].text.trim();

    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    const structured = JSON.parse(jsonText);

    return new Response(JSON.stringify(structured), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
