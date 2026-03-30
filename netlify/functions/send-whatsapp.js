exports.handler = async (event) => {
  try {
    // ✅ SAFETY: handle empty body
    if (!event.body) {
      console.log("No body received");
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/xml" },
        body: `<Response><Message>OK</Message></Response>`
      };
    }

    const params = new URLSearchParams(event.body);

    const incomingMsg = (params.get("Body") || "").trim();
    const phone = params.get("From") || "";

    console.log("Incoming:", incomingMsg, "Phone:", phone);

    let reply = "";

    const SUPABASE_URL = "https://xsdalnxweznnjzogyqaa.supabase.co";
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_SERVICE_KEY) {
      console.log("❌ Missing SUPABASE_SERVICE_KEY");
    }

    // ✅ ONLY SAVE WHEN VALID INPUT
    if (["1", "2", "3"].includes(incomingMsg)) {

      try {
        // 🔍 STEP 1: Get name from Leads table (FIXED)
        const cleanPhone = phone.replace("whatsapp:", "");

        const leadRes = await fetch(
          `${SUPABASE_URL}/rest/v1/Leads?phone=eq.${encodeURIComponent(cleanPhone)}&order=created_at.desc&limit=1`,
          {
            headers: {
              "apikey": SUPABASE_SERVICE_KEY,
              "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`
            }
          }
        );

        const leadData = await leadRes.json();
        const name = leadData[0]?.name || "Unknown";

        console.log("Fetched name:", name);

        // 💾 STEP 2: Save interaction WITH name
        const res = await fetch(`${SUPABASE_URL}/rest/v1/interactions`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
          },
          body: JSON.stringify({
            phone: phone,
            name: name,
            selection: incomingMsg
          })
        });

        const data = await res.text();
        console.log("SUPABASE RESPONSE:", data);

      } catch (dbErr) {
        console.log("❌ DB ERROR:", dbErr);
      }

      // Replies
      if (incomingMsg === "1") {
        reply = `You selected 3 month crash course.

Thank you for choosing us. You will be receiving a call shortly. Welcome to our community.`;
      } 
      else if (incomingMsg === "2") {
        reply = `You selected 6 month crash course with weekly tests.

Thank you for choosing us. You will be receiving a call shortly. Welcome to our community.`;
      } 
      else if (incomingMsg === "3") {
        reply = `You selected 1 year full training program.

Thank you for choosing us. You will be receiving a call shortly. Welcome to our community.`;
      }

    } else {
      reply = `Hi, welcome to Fazz Coaching 👋

Here are our programs:

1️⃣ 3 month crash course  
2️⃣ 6 month crash course + weekly tests  
3️⃣ 1 year full training  

Reply 1 / 2 / 3 to continue`;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/xml" },
      body: `<Response><Message>${reply}</Message></Response>`
    };

  } catch (err) {
    console.error("🔥 FUNCTION ERROR:", err);
    return {
      statusCode: 200,
      headers: { "Content-Type": "text/xml" },
      body: `<Response><Message>Error occurred</Message></Response>`
    };
  }
};