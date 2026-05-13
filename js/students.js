let ALL_STUDENTS = [];
let BUSINESS_ID = null;



async function init() {

    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {

        window.location.href = "/login.html";
        return;
    }

    const { data: userRow, error } =
    await supabaseClient
    .from("Users")
    .select("*")
    .eq("id", user.id)
    .single();

    if (error || !userRow) {

        console.error(error);
        return;
    }

    BUSINESS_ID = userRow.business_id;

    await loadStudents();

    document
    .getElementById("studentSearch")
    .addEventListener("input", applyFilters);

    document
    .getElementById("courseFilter")
    .addEventListener("change", applyFilters);

    document
    .getElementById("feesFilter")
    .addEventListener("change", applyFilters);
}



async function loadStudents() {

    const { data, error } =
    await supabaseClient
    .from("Leads")
    .select("*")
    .eq("business_id", BUSINESS_ID)
    .order("created_at", {
        ascending: false
    });

    if (error) {

        console.error(error);
        return;
    }

    ALL_STUDENTS = data || [];

    updateOverviewCards(ALL_STUDENTS);

    renderStudents(ALL_STUDENTS);
}



function updateOverviewCards(students) {

    document.getElementById("totalStudents").innerText =
    students.length;

    const active =
    students.filter(
        s => s.status !== "Dropped"
    ).length;

    document.getElementById("activeStudents").innerText =
    active;

    document.getElementById("feesPending").innerText =
    "0";

    document.getElementById("lowAttendance").innerText =
    "0";
}



function renderStudents(students) {

    const table =
    document.getElementById("studentsTableBody");

    table.innerHTML = "";

    students.forEach(student => {

        const row = document.createElement("tr");

        row.innerHTML = `
        
        <td>
            <div class="student-name">
                ${student.name || "-"}
            </div>
        </td>

        <td>
            ${student.phone || "-"}
        </td>

        <td>
            ${student.exam || "-"}
        </td>

        <td>
            Batch A
        </td>

        <td>
            92%
        </td>

        <td>
            <span class="fee-paid">
                Paid
            </span>
        </td>

        <td>
            ${student.status || "-"}
        </td>

        <td>

            <button class="table-btn">
                View
            </button>

        </td>
        `;

        table.appendChild(row);
    });
}



function applyFilters() {

    const search =
    document.getElementById("studentSearch")
    .value
    .toLowerCase();

    const course =
    document.getElementById("courseFilter")
    .value;

    let filtered = ALL_STUDENTS;



    if (search) {

        filtered = filtered.filter(student =>

            (student.name || "")
            .toLowerCase()
            .includes(search)

            ||

            (student.phone || "")
            .includes(search)
        );
    }



    if (course !== "All") {

        filtered = filtered.filter(
            student => student.exam === course
        );
    }

    renderStudents(filtered);
}



init();