export default async function handler(req, res) {
  try {
    const rawMsg = req.body?.Body || "";
    const incomingMsg = rawMsg.toString().trim().replace(/\s+/g, "");
    const phone = (req.body?.From || "").replace("whatsapp:", "");

    console.log("MSG:", incomingMsg);

    const SUPABASE_URL = "https://xsdalnxweznnjzogyqaa.supabase.co";
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    // ✅ ADDED
    const BUSINESS_ID = "coaching_1";

    let lead = {};
    try {
      const dbRes = await fetch(
        `${SUPABASE_URL}/rest/v1/Leads?phone=eq.${encodeURIComponent(phone)}&order=created_at.desc&limit=1`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`
          }
        }
      );
      const data = await dbRes.json();
      lead = data?.[0] || {};
    } catch (e) {
      console.log("Lead fetch error");
    }

    const name = lead.name || "";
    const interest = lead.interest || "our coaching";

    let reply = "";

    if (incomingMsg === "1") {
      reply = `Great choice 👍
Our 3-month crash course is built for focused revision and maximum score improvement.
A mentor will contact you within 10–15 minutes.`;

      saveInteraction("3 months");
    }

    else if (incomingMsg === "2") {
      reply = `Excellent choice 👍
Our 6-month program includes structured learning and weekly tests.
A mentor will contact you within 10–15 minutes.`;

      saveInteraction("6 months");
    }

    else if (incomingMsg === "3") {
      reply = `Perfect choice 👍
Our 1-year program is a complete preparation system.
A mentor will contact you within 10–15 minutes.`;

      saveInteraction("1 year");
    }

    else {
      reply = `Hi ${name}, thanks for your interest in ${interest} 👋
Choose your course duration:
1️⃣ 3 months  
2️⃣ 6 months  
3️⃣ 1 year  
Reply 1 / 2 / 3`;
    }

    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(`<Response><Message>${reply}</Message></Response>`);

    async function saveInteraction(selectionText) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/interactions`, {
          method: "POST",
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phone,
            name,
            interest,
            selection: selectionText,
            // ✅ ADDED
            business_id: BUSINESS_ID
          })
        });
      } catch (err) {
        console.log("DB FAILED BUT BOT SAFE");
      }
    }

  } catch (err) {
    console.error("ERROR:", err);

    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(`<Response><Message>Error</Message></Response>`);
  }
}