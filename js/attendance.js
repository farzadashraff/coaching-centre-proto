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

    await loadAttendance();
}



async function loadAttendance() {

    const { data, error } =
    await supabaseClient
    .from("Leads")
    .select("*")
    .eq("business_id", BUSINESS_ID);

    if (error) {

        console.error(error);
        return;
    }

    renderAttendance(data || []);
}



function renderAttendance(students) {

    const table =
    document.getElementById("attendanceTableBody");

    table.innerHTML = "";

    students.forEach(student => {

        const row = document.createElement("tr");

        row.innerHTML = `
        
        <td>${student.name || "-"}</td>

        <td>${student.exam || "-"}</td>

        <td>Present</td>

        <td>${new Date().toLocaleDateString()}</td>
        
        `;

        table.appendChild(row);
    });
}



init();