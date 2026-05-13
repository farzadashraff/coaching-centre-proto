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

    await loadFees();
}



async function loadFees() {

    const { data, error } =
    await supabaseClient
    .from("Leads")
    .select("*")
    .eq("business_id", BUSINESS_ID);

    if (error) {

        console.error(error);
        return;
    }

    renderFees(data || []);

    updateOverview(data || []);
}



function updateOverview(students) {

    const totalCollected =
    students.length * 25000;

    const pendingAmount =
    students.length * 5000;

    const paidStudents =
    students.length;

    document.getElementById("totalCollected")
    .innerText =
    `₹${totalCollected}`;

    document.getElementById("pendingAmount")
    .innerText =
    `₹${pendingAmount}`;

    document.getElementById("paidStudents")
    .innerText =
    paidStudents;
}



function renderFees(students) {

    const table =
    document.getElementById("feesTableBody");

    table.innerHTML = "";

    students.forEach(student => {

        const row = document.createElement("tr");

        row.innerHTML = `
        
        <td>${student.name || "-"}</td>

        <td>${student.exam || "-"}</td>

        <td>₹25,000</td>

        <td>

            <span class="status-paid">
                Paid
            </span>

        </td>

        <td>
            15 May 2026
        </td>
        
        `;

        table.appendChild(row);
    });
}



init();
