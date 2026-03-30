exports.handler = async (event) => {
  try {
    // ✅ FIX: handle base64 encoded body (CRITICAL)
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
        body: `<Response><Message>OK</Message></Response>`
      };
    }

    const params = new URLSearchParams(bodyString);

    const incomingMsg = (params.get("Body") || "").trim();
    const phone = params.get("From") || "";

    console.log("Incoming:", incomingMsg, "Phone:", phone);

    let reply = "";

    const SUPABASE_URL = "https://xsdalnxweznnjzogyqaa.supabase.co";
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (["1", "2", "3"].includes(incomingMsg)) {

      try {
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
            selection: incomingMsg
          })
        });

      } catch (err) {
        console.log("DB ERROR:", err);
      }

      if (incomingMsg === "1") {
        reply = `You selected 3 month crash course.`;
      } 
      else if (incomingMsg === "2") {
        reply = `You selected 6 month crash course with weekly tests.`;
      } 
      else if (incomingMsg === "3") {
        reply = `You selected 1 year full training program.`;
      }

    } else {
      reply = `Hi, welcome 👋

1️⃣ 3 month crash course  
2️⃣ 6 month crash course  
3️⃣ 1 year program  

Reply 1 / 2 / 3`;
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
      body: `<Response><Message>Error</Message></Response>`
    };
  }
};