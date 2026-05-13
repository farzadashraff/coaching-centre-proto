let ALL_LEADS = [];
let BUSINESS_ID = null;
let SHOWN = new Set();
let USERS = {};

const TAB_ID = Math.random().toString(36).substring(2);

let CURRENT_USER = null;
let CURRENT_ROLE = null;
let CURRENT_USER_DB_ID = null;



async function init() {

    console.log("NEW VERSION LOADED");

    const { data: { user } } =
    await supabaseClient.auth.getUser();

    if (!user) {
        window.location.href = "/login.html";
        return;
    }

    console.log("AUTHENTICATED USER:", user.email);

    CURRENT_USER = user;

    const userInfo =
document.getElementById("userInfo");

if (userInfo) {

    userInfo.innerText =
    "Logged in as: " + user.email;
}


    const { data: userRow, error } =
    await supabaseClient
    .from("Users")
    .select("*")
    .eq("id", user.id)
    .single();

    if (error || !userRow) {

        console.log("AUTH USER ID:", user.id);
        console.log("USER ROW:", userRow);

        console.error("User not found", error);

        return;
    }

    CURRENT_USER_DB_ID = userRow.id;
    CURRENT_ROLE = userRow.role;
    BUSINESS_ID = userRow.business_id;


    await loadLeads();

    supabaseClient
    .channel('leads-channel')
    .on(
        'postgres_changes',
        {
            event: '*',
            schema: 'public',
            table: 'Leads',
            filter: `business_id=eq.${BUSINESS_ID}`
        },

        async () => {
            await loadUsers();
            await loadLeads();
        }
    )
    .subscribe();

}



async function loadLeads() {

    if (!BUSINESS_ID) {

        console.error("BUSINESS_ID missing");

        return;
    }

    let query = supabaseClient
    .from("Leads")
    .select("*")
    .eq("business_id", BUSINESS_ID);

    if (CURRENT_ROLE !== "admin") {

        query = query.eq(
            "assigned_to_user_id",
            CURRENT_USER_DB_ID
        );
    }

    const { data: leads, error } =
    await query.order(
        "created_at",
        { ascending: false }
    );

    if (error) {

        console.error(error);

        return;
    }

    
    ALL_LEADS = leads || [];

updateAnalytics(ALL_LEADS);
}

function updateAnalytics(leads) {

    const total = leads.length;

    const converted =
    leads.filter(
        l => l.status === "Converted"
    ).length;

    const pending =
    leads.filter(l => {

        if (!l.next_followup_date) return false;

        const today =
        new Date().toISOString().split("T")[0];

        return l.next_followup_date <= today;

    }).length;

    document.getElementById("totalLeads").innerText =
    total;

    document.getElementById("convertedLeads").innerText =
    converted;

    document.getElementById("pendingFollowups").innerText =
    pending;
}

init();
