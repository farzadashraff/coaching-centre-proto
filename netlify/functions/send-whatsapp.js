exports.handler = async (event) => {
  try {
    // ===== 1. Parse body safely =====
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

    // ===== 2. Clean incoming message properly =====
    const rawMsg = params.get("Body") || "";

    const incomingMsg = rawMsg
      .toString()
      .trim()
      .replace(/\s+/g, "")   // removes spaces/newlines
      .toLowerCase();

    const phone = (params.get("From") || "").replace("whatsapp:", "");

    console.log("RAW:", rawMsg);
    console.log("CLEAN:", incomingMsg);
    console.log("Phone:", phone);

    // ===== 3. Supabase config =====
    const SUPABASE_URL = "https://xsdalnxweznnjzogyqaa.supabase.co";
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    // ===== 4. Fetch latest lead =====
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

    // ===== 5. Handle duration selection =====
    if (incomingMsg === "1" || incomingMsg === "2" || incomingMsg === "3") {

      let selectionText = "";

      if (incomingMsg === "1") {
        selectionText = "3 months";
        reply = `Great choice 👍

Our 3-month crash course is built for focused revision and maximum score improvement in a short time.

⚡ Rapid syllabus coverage  
🎯 Exam-focused strategies  
🧪 High-impact mock tests  

A mentor will contact you within 10–15 minutes to get you started immediately.`;
      }

      else if (incomingMsg === "2") {
        selectionText = "6 months";
        reply = `Excellent choice 👍

Our 6-month program is designed for serious preparation with structure and consistent improvement.

📊 Personalized study plan  
🧪 Weekly mock tests  
📈 Performance tracking & strategy  

A mentor will contact you within 10–15 minutes to guide you personally.`;
      }

      else if (incomingMsg === "3") {
        selectionText = "1 year";
        reply = `Perfect choice 👍

Our 1-year program is a complete end-to-end system designed for top results.

📚 Full syllabus coverage  
🧠 Concept mastery + doubt solving  
📊 Continuous testing & analysis  

A mentor will contact you within 10–15 minutes to plan your preparation journey.`;
      }

      // ===== 6. Store in Supabase =====
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
    
    // ===== 7. First message =====
    else {
      reply = `Hi ${name}, thanks for your interest in ${interest} 👋

To recommend the best plan, choose your preferred duration:

1️⃣ 3 months (Crash course)  
2️⃣ 6 months (Guided prep + tests)  
3️⃣ 1 year (Full training program)  

Reply with 1 / 2 / 3`;
    }

    // ===== 8. Return Twilio response =====
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