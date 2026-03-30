exports.handler = async (event) => {
  try {
    // ✅ Handle body (Twilio sends x-www-form-urlencoded)
    let bodyString = "";

    if (event.isBase64Encoded) {
      bodyString = Buffer.from(event.body, "base64").toString("utf-8");
    } else {
      bodyString = event.body || "";
    }

    if (!bodyString) {
      console.log("No body received");
      return {
        statusCode: 200,
        headers: { "Content-Type": "text/xml" },
        body: `<Response></Response>`
      };
    }

    const params = new URLSearchParams(bodyString);

    const incomingMsg = (params.get("Body") || "").trim();
    const phone = (params.get("From") || "").replace("whatsapp:", "");

    console.log("Incoming:", incomingMsg, "Phone:", phone);

    // ✅ Supabase config
    const SUPABASE_URL = "https://xsdalnxweznnjzogyqaa.supabase.co";
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    // ✅ Fetch latest lead
    let lead = {};
    try {
      const leadRes = await fetch(
        `${SUPABASE_URL}/rest/v1/Leads?phone=eq.${encodeURIComponent(phone)}&order=created_at.desc&limit=1`,
        {
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`
          }
        }
      );

      const leadData = await leadRes.json();
      lead = leadData?.[0] || {};
    } catch (err) {
      console.log("Lead fetch error:", err);
    }

    const name = lead.name || "";
    const interest = lead.interest || "our coaching";

    let reply = "";

    // ✅ USER SELECTED DURATION
    if (["1", "2", "3"].includes(incomingMsg)) {

      let selectionText = "";

      if (incomingMsg === "1") {
        selectionText = "3 months";
        reply = `Great choice 👍

Our 3-month crash course is designed for quick revision and high-impact results.

Our team will contact you shortly.`;
      } 
      else if (incomingMsg === "2") {
        selectionText = "6 months";
        reply = `Excellent 👍

The 6-month program includes structured learning + weekly tests.

Our team will reach out to guide you further.`;
      } 
      else if (incomingMsg === "3") {
        selectionText = "1 year";
        reply = `Perfect 👍

The 1-year program is a complete end-to-end preparation system.

Our team will contact you with full details shortly.`;
      }

      // ✅ Store interaction
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/interactions`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_SERVICE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            phone: phone,
            name: name,
            interest: interest,
            selection: selectionText
          })
        });
      } catch (err) {
        console.log("DB ERROR:", err);
      }

    } 
    
    // ✅ FIRST MESSAGE (MAIN ENTRY)
    else {
      reply = `Hi ${name}, thanks for your interest in ${interest} 👋

To recommend the best plan, choose your preferred duration:

1️⃣ 3 months (Crash course)  
2️⃣ 6 months (Guided prep + tests)  
3️⃣ 1 year (Full training program)  

Reply with 1 / 2 / 3`;
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/xml" },
      body: `<Response><Message>${reply}</Message></Response>`
    };

  } catch (err) {
    console.error("ERROR:", err);

    return {
      statusCode: 200,
      headers: { "Content-Type": "text/xml" },
      body: `<Response><Message>Something went wrong</Message></Response>`
    };
  }
};