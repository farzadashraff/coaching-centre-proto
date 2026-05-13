let BUSINESS_ID = null;



async function init() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {

        window.location.href = "/login.html";
        return;
    }

    const { data: userRow } =
    await supabaseClient
    .from("Users")
    .select("*")
    .eq("id", user.id)
    .single();

    BUSINESS_ID = userRow.business_id;

    await loadAnalytics();
}



async function loadAnalytics() {

    const { data, error } =
    await supabaseClient
    .from("Leads")
    .select("*")
    .eq("business_id", BUSINESS_ID);

    if (error) {

        console.error(error);
        return;
    }

    updateCards(data || []);

    renderCourseStats(data || []);
}



function updateCards(leads) {

    const total =
    leads.length;

    const converted =
    leads.filter(
        l => l.status === "Converted"
    ).length;

    const conversionRate =
    total > 0
    ? ((converted / total) * 100).toFixed(1)
    : 0;

    const pending =
    leads.filter(l => {

        if (!l.next_followup_date) return false;

        const today =
        new Date().toISOString().split("T")[0];

        return l.next_followup_date <= today;

    }).length;

    document.getElementById("totalLeads")
    .innerText =
    total;

    document.getElementById("convertedStudents")
    .innerText =
    converted;

    document.getElementById("conversionRate")
    .innerText =
    conversionRate + "%";

    document.getElementById("pendingFollowups")
    .innerText =
    pending;
}



function renderCourseStats(leads) {

    const container =
    document.getElementById("courseStats");

    container.innerHTML = "";

    const courses = {};

    leads.forEach(lead => {

        const course =
        lead.exam || "Other";

        if (!courses[course]) {

            courses[course] = 0;
        }

        courses[course]++;
    });

    Object.keys(courses).forEach(course => {

        const row =
        document.createElement("div");

        row.className = "chart-row";

        row.innerHTML = `
        
        <span>${course}</span>

        <strong>${courses[course]}</strong>
        
        `;

        container.appendChild(row);
    });
}



init();