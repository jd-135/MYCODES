// Supabase Edge Function: redirect
// Deploy with:  supabase functions deploy redirect --no-verify-jwt
//
// This is what a scanned QR actually hits. It looks up the destination by
// short_slug, logs a real scan event, then 302-redirects the phone to the
// real destination. This is what makes "Analytics" and "short links" real
// instead of decorative.
//
// URL shape once deployed:
//   https://<your-project-ref>.functions.supabase.co/redirect?slug=spring

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // service role: bypasses RLS, insert-only use
);

function detectDevice(ua: string): string {
  if (/iphone/i.test(ua)) return "iPhone";
  if (/ipad/i.test(ua)) return "iPad";
  if (/android/i.test(ua)) return "Android";
  if (/macintosh/i.test(ua)) return "Mac";
  if (/windows/i.test(ua)) return "Windows";
  return "Other";
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new Response("Missing slug", { status: 400 });
  }

  const { data: qr, error } = await supabase
    .from("qr_codes")
    .select("id, content, password, status")
    .eq("short_slug", slug)
    .single();

  if (error || !qr || qr.status !== "active") {
    return new Response("QR not found or inactive", { status: 404 });
  }

  // Password-protected QR: show a simple gate page instead of redirecting.
  if (qr.password) {
    const submitted = url.searchParams.get("pw");
    if (submitted !== qr.password) {
      const html = `<!doctype html><html><body style="font-family:Arial;max-width:360px;margin:80px auto;text-align:center">
        <h2>Password protected</h2>
        <form method="GET">
          <input type="hidden" name="slug" value="${slug}">
          <input type="password" name="pw" placeholder="Enter password" style="padding:10px;width:100%;box-sizing:border-box;margin-bottom:12px">
          <button type="submit" style="padding:10px 20px;width:100%">Unlock</button>
        </form>
      </body></html>`;
      return new Response(html, { headers: { "content-type": "text/html" } });
    }
  }

  const userAgent = req.headers.get("user-agent") ?? "";
  await supabase.from("scans").insert({
    qr_id: qr.id,
    referrer: req.headers.get("referer") ?? "",
    user_agent: userAgent,
    device: detectDevice(userAgent),
  });

  return new Response(null, {
    status: 302,
    headers: { Location: qr.content },
  });
});
