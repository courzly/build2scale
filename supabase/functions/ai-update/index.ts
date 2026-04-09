import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { project_slug, update_text } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Load current project data from DB
    const { data: project, error: projErr } = await supabase
      .from("projects")
      .select(`
        slug, name, color, icon,
        domains (
          name, icon,
          features (
            name, sort_order,
            requirements ( text, is_tbd )
          )
        )
      `)
      .eq("slug", project_slug)
      .single();

    if (projErr || !project) throw new Error(`Projekt nicht gefunden: ${project_slug}`);

    const currentJson = JSON.stringify(project, null, 2);

    const prompt = `Du bist ein MVP-Stratege. Hier sind die aktuellen Blueprint-Daten eines Projekts und neue Informationen vom Kunden. Analysiere was sich ändern sollte.

AKTUELLE DATEN:
${currentJson}

NEUE INFORMATIONEN:
${update_text}

Gib NUR gültiges JSON zurück (kein Markdown), mit den Änderungen die du empfiehlst:
{
  "summary": "1 Satz: Was ändert sich und warum",
  "changes": [
    {"field": "problem", "old": "alter Text", "new": "neuer Text"},
    {"field": "hypothese", "old": "alt", "new": "neu"}
  ],
  "new_requirements": [
    {"feature_name": "Feature Name aus bestehendem Projekt", "requirements": ["Neue Anforderung 1"]}
  ],
  "new_features": [
    {"name": "Neues Feature", "icon": "🔧", "requirements": ["Anforderung 1"]}
  ],
  "removed_requirements": ["Text der zu entfernenden Anforderung"],
  "kpi_updates": [
    {"metrik": "KPI Name", "action": "add|update|remove", "messung": "...", "ziel": "..."}
  ]
}

Schlage nur Änderungen vor, die durch die neuen Informationen wirklich begründet sind.`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) throw new Error(`Anthropic API error: ${await aiRes.text()}`);

    const aiData = await aiRes.json();
    const rawText = aiData.content[0].text.trim();
    const jsonText = rawText.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    const diff = JSON.parse(jsonText);

    // Return diff + current project data for UI preview
    return new Response(JSON.stringify({ diff, current: project }), {
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
