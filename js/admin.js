let ALL_LEADS = [];
let BUSINESS_ID = null;
let SHOWN = new Set();
let USERS = {};

const TAB_ID = Math.random().toString(36).substring(2);

let CURRENT_USER = null;
let CURRENT_ROLE = null;
let CURRENT_USER_DB_ID = null;



async function init() {

    console.log("ADMIN JS LOADED");

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    CURRENT_USER = user;

    if (document.getElementById("userInfo")) {

        document.getElementById("userInfo").innerText =
        "Logged in as: " + user.email;
    }

    const { data: userRow, error } =
    await supabaseClient
    .from("Users")
    .select("*")
    .eq("id", user.id)
    .single();

    if (error || !userRow) {

        console.error("User fetch failed", error);
        return;
    }

    CURRENT_USER_DB_ID = userRow.id;
    CURRENT_ROLE = userRow.role;
    BUSINESS_ID = userRow.business_id;

    await loadUsers();
    await loadLeads();

    supabaseClient
    .channel("leads-channel")
    .on(
        "postgres_changes",
        {
            event: "*",
            schema: "public",
            table: "Leads",
            filter: `business_id=eq.${BUSINESS_ID}`
        },

        async () => {

            await loadUsers();
            await loadLeads();
        }
    )
    .subscribe();

    if (typeof setFormLink === "function") {
        setFormLink();
    }

    setInterval(() => {

        checkOverdueAndNotify();

    }, 60000);
}



async function loadUsers() {

    if (!BUSINESS_ID) return;

    const { data, error } =
    await supabaseClient
    .from("Users")
    .select("*")
    .eq("business_id", BUSINESS_ID);

    if (error) {

        console.error(error);
        return;
    }

    USERS = {};

    (data || []).forEach(u => {

        USERS[u.id] = u;
    });
}



async function loadLeads() {

    if (!BUSINESS_ID) return;

    let query =
    supabaseClient
    .from("Leads")
    .select("*")
    .eq("business_id", BUSINESS_ID);

    if (CURRENT_ROLE !== "admin") {

        query =
        query.eq(
            "assigned_to_user_id",
            CURRENT_USER_DB_ID
        );
    }

    const { data, error } =
    await query.order(
        "created_at",
        {
            ascending: false
        }
    );

    if (error) {

        console.error(error);
        return;
    }

   ALL_LEADS = data || [];

ALL_LEADS = ALL_LEADS.map(lead => {

    const aging =
    calculateLeadAging(lead);

    const enrichedLead = {

        ...lead,

        aging
    };

    return {

        ...enrichedLead,

        score:
        calculateLeadScore(enrichedLead)
    };
});

ALL_LEADS.sort((a, b) => b.score - a.score);

    updateAnalytics(ALL_LEADS);



    if (typeof render === "function") {
        render(ALL_LEADS);
    }

    if (typeof renderPipeline === "function") {
        renderPipeline(ALL_LEADS);
    }

    if (typeof renderOverdue === "function") {
        renderOverdue(ALL_LEADS);
    }

    if (typeof renderToday === "function") {
        renderToday(ALL_LEADS);
    }

    if (typeof renderStuck === "function") {
        renderStuck(ALL_LEADS);
    }

    if (typeof checkStuckLeads === "function") {
        checkStuckLeads(ALL_LEADS);
    }

    if (typeof checkOverdueAndNotify === "function") {
        checkOverdueAndNotify();
    }
}

function calculateLeadAging(lead) {

    const now = new Date();

    // LEAD AGE
    let leadAgeDays = 0;

    if (lead.created_at) {

        const created = new Date(lead.created_at);

        leadAgeDays =
        Math.floor(
            (now - created) /
            (1000 * 60 * 60 * 24)
        );
    }

    // STAGE AGE
let stageAgeDays = 0;

const stageReferenceDate =
    lead.status_updated_at ||
    lead.created_at;

if (stageReferenceDate) {

    const stageUpdated =
    new Date(stageReferenceDate);

    stageAgeDays =
    Math.floor(
        (now - stageUpdated) /
        (1000 * 60 * 60 * 24)
    );
}

  
    

    // INACTIVITY
    let inactivityDays = 0;

    if (lead.last_contacted_at) {

        const lastContact =
        new Date(lead.last_contacted_at);

        inactivityDays =
        Math.floor(
            (now - lastContact) /
            (1000 * 60 * 60 * 24)
        );
    }

    // FOLLOWUP DELAY
    let followupDelay = 0;

    if (lead.next_followup_date) {

        const followup =
        new Date(lead.next_followup_date);

        followupDelay =
        Math.floor(
            (now - followup) /
            (1000 * 60 * 60 * 24)
        );

        // ONLY OVERDUE COUNTS
        if (followupDelay < 0) {
            followupDelay = 0;
        }
    }

    return {

        leadAgeDays,
        stageAgeDays,
        inactivityDays,
        followupDelay
    };
}

function calculateLeadScore(lead) {

    let score = 50;

    // STATUS SCORING
    if (lead.status === "Interested") {
        score += 25;
    }

    if (lead.status === "Contacted") {
        score += 15;
    }

    if (lead.status === "Converted") {
        score += 40;
    }

    if (lead.status === "Dropped") {
        score -= 40;
    }

    // FOLLOW-UP DISCIPLINE
    if (lead.aging?.followupDelay > 0) {
        score -= lead.aging.followupDelay * 5;
    }

    // INACTIVITY PENALTY
    if (lead.aging?.inactivityDays > 5) {
        score -= 10;
    }

    // STAGE STUCK PENALTY
    if (lead.aging?.stageAgeDays > 7) {
        score -= 15;
    }

    // CLAMP SCORE
    if (score > 100) score = 100;
    if (score < 0) score = 0;

    return score;
}

function updateAnalytics(leads) {

    const total = leads.length;

    const converted =
    leads.filter(
        l => l.status === "Converted"
    ).length;

    const dropped =
    leads.filter(
        l => l.status === "Dropped"
    ).length;

    const rate =
    total > 0
    ? ((converted / total) * 100).toFixed(1)
    : 0;

    const newCount =
    leads.filter(
        l => l.status === "New"
    ).length;

    const interested =
    leads.filter(
        l => l.status === "Interested"
    ).length;

    const contacted =
    leads.filter(
        l => l.status === "Contacted"
    ).length;

    const todayStr =
    new Date().toISOString().split("T")[0];

    const todayLeads =
    leads.filter(l => {

        if (!l.created_at) return false;

        return l.created_at.startsWith(todayStr);

    }).length;

    const eng =
    leads.filter(
        l => l.category === "Engineering"
    ).length;

    const med =
    leads.filter(
        l => l.category === "Medical"
    ).length;

    const abroad =
    leads.filter(
        l => l.category === "Abroad"
    ).length;

    const gov =
    leads.filter(
        l => l.category === "Government"
    ).length;

    const prof =
    leads.filter(
        l => l.category === "Professional"
    ).length;

    const design =
    leads.filter(
        l => l.category === "Design"
    ).length;

    const pending =
    leads.filter(l => {

        if (!l.next_followup_date) return false;

        return l.next_followup_date <= todayStr;

    }).length;



    safeSet("totalLeads", total);

    safeSet("convertedLeads", converted);

    safeSet("droppedLeads", dropped);

    safeSet("conversionRate", rate + "%");

    safeSet("newCount", newCount);

    safeSet("interestedCount", interested);

    safeSet("contactedCount", contacted);

    safeSet("todayLeads", todayLeads);

    safeSet("engCount", eng);

    safeSet("medCount", med);

    safeSet("abroadCount", abroad);

    safeSet("govCount", gov);

    safeSet("profCount", prof);

    safeSet("designCount", design);

    safeSet("pendingFollowups", pending);
}



function safeSet(id, value) {

    const el = document.getElementById(id);

    if (el) {
        el.innerText = value;
    }
}



async function checkOverdueAndNotify() {

    if (!BUSINESS_ID) return;

    const todayStr =
    new Date().toISOString().split("T")[0];

    if (
        !window.LAST_RUN_DATE ||
        window.LAST_RUN_DATE !== todayStr
    ) {

        SHOWN.clear();
        window.LAST_RUN_DATE = todayStr;
    }

    const { data: leads, error } =
    await supabaseClient
    .from("Leads")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .lte("next_followup_date", todayStr);

    if (error) {

        console.error(error);
        return;
    }

    if (!leads) return;

    leads.forEach(l => {

        const key = "lead-" + l.id;

        if (SHOWN.has(key)) return;

        if (typeof showPopup === "function") {

            showPopup(
                `Follow-up overdue for ${l.name}`
            );
        }

        SHOWN.add(key);
    });
}



document.addEventListener("DOMContentLoaded", () => {

    const search =
    document.getElementById("searchInput");

    const filter =
    document.getElementById("statusFilter");

    if (search) {

        search.addEventListener(
            "input",
            applyFilters
        );
    }

    if (filter) {

        filter.addEventListener(
            "change",
            applyFilters
        );
    }

    const logout =
    document.getElementById("logoutBtn");

    if (logout) {

        logout.addEventListener(
            "click",
            async () => {

                await supabaseClient.auth.signOut();

                window.location.href =
                "/login.html";
            }
        );
    }
});



function applyFilters() {

    const searchInput =
    document.getElementById("searchInput");

    const statusFilter =
    document.getElementById("statusFilter");

    if (!searchInput || !statusFilter) return;

    const search =
    searchInput.value.toLowerCase();

    const status =
    statusFilter.value;

    let filtered = ALL_LEADS;



    if (search) {

        filtered =
        filtered.filter(l =>

            (l.name || "")
            .toLowerCase()
            .includes(search)

            ||

            (l.phone || "")
            .includes(search)
        );
    }



    if (status !== "All") {

        filtered =
        filtered.filter(
            l => l.status === status
        );
    }



    if (typeof render === "function") {
        render(filtered);
    }

    if (typeof renderPipeline === "function") {
        renderPipeline(filtered);
    }

    if (typeof renderOverdue === "function") {
        renderOverdue(filtered);
    }

    if (typeof renderToday === "function") {
        renderToday(filtered);
    }

    updateAnalytics(filtered);
}



init();