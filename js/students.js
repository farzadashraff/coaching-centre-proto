let ALL_STUDENTS = [];

let BUSINESS_ID = null;

let CURRENT_USER = null;

let CURRENT_ROLE = null;

function closeStudentModal() {

    document
    .getElementById("studentModal")
    .classList.add("hidden");
}

function saveStudentNotes() {

    alert("Notes saved");
}

// ================= INIT =================

async function init() {

    const {
        data: { user }
    } =
    await supabaseClient.auth.getUser();

    if (!user) {

        window.location.href =
        "/login.html";

        return;
    }

    CURRENT_USER = user;

    // GET USER

    const {
        data: userRow,
        error
    } =
    await supabaseClient
    .from("Users")
    .select("*")
    .eq("id", user.id)
    .single();

    if (error || !userRow) {

        console.error(error);

        return;
    }

    BUSINESS_ID =
    userRow.business_id;

    CURRENT_ROLE =
    userRow.role;

    await loadStudents();

    // REALTIME SYNC

    supabaseClient
    .channel("students-channel")
    .on(
        "postgres_changes",
        {
            event: "*",
            schema: "public",
            table: "Students",
            filter:
            `business_id=eq.${BUSINESS_ID}`
        },

        async () => {

            await loadStudents();
        }
    )
    .subscribe();

    // FILTERS

    document
    .getElementById("studentSearch")
    ?.addEventListener(
        "input",
        applyFilters
    );

    document
    .getElementById("courseFilter")
    ?.addEventListener(
        "change",
        applyFilters
    );

    document
    .getElementById("feesFilter")
    ?.addEventListener(
        "change",
        applyFilters
    );
    document
.getElementById("statusFilter")
.addEventListener("change", applyFilters);

document
.getElementById("attendanceFilter")
.addEventListener("change", applyFilters);
}



// ================= LOAD STUDENTS =================

async function loadStudents() {

    const {
        data,
        error
    } =
    await supabaseClient
    .from("Students")
    .select("*")
    .eq(
        "business_id",
        BUSINESS_ID
    )
    .order(
        "created_at",
        {
            ascending: false
        }
    );

    if (error) {

        console.error(error);

        return;
    }

    ALL_STUDENTS =
    data || [];

    updateAnalytics(
        ALL_STUDENTS
    );

    renderAlerts(
        ALL_STUDENTS
    );

    renderStudents(
        ALL_STUDENTS
    );
}



// ================= ANALYTICS =================

function updateAnalytics(students) {

    const total =
    students.length;

    const active =
    students.filter(
        s => s.status === "Active"
    ).length;

    const inactive =
    students.filter(
        s => s.status === "Inactive"
    ).length;

    const pendingFees =
    students.filter(
        s =>
        (s.due_fee || 0) > 0
    ).length;

    const lowAttendance =
    students.filter(
        s =>
        (s.attendance_percentage || 0) < 75
    ).length;

    // NEW ADMISSIONS

    const now = new Date();

    const currentMonth =
    now.getMonth();

    const currentYear =
    now.getFullYear();

    const newAdmissions =
    students.filter(s => {

        if (!s.admission_date)
            return false;

        const d =
        new Date(
            s.admission_date
        );

        return (
            d.getMonth() ===
            currentMonth
            &&
            d.getFullYear() ===
            currentYear
        );
    }).length;

    safeSet(
        "totalStudents",
        total
    );

    safeSet(
        "activeStudents",
        active
    );

    safeSet(
        "inactiveStudents",
        inactive
    );

    safeSet(
        "feesPending",
        pendingFees
    );

    safeSet(
        "lowAttendance",
        lowAttendance
    );

    safeSet(
        "newAdmissions",
        newAdmissions
    );
}



// ================= ALERT CENTER =================

function renderAlerts(students) {

    renderPendingFees(students);

    renderLowAttendance(students);

    renderMissingBatch(students);
}



// ================= PENDING FEES =================

function renderPendingFees(students) {

    const box =
    document.getElementById(
        "pendingFeesBox"
    );

    if (!box) return;

    box.innerHTML = "";

    const pending =
    students.filter(
        s =>
        (s.due_fee || 0) > 0
    );

    safeSet(
        "pendingFeesCount",
        pending.length
    );

    if (!pending.length) {

        box.innerHTML =
        `
        <div class="empty-alert">
            No pending fees
        </div>
        `;

        return;
    }

    pending.forEach(student => {

        const div =
        document.createElement("div");

        div.className =
        "alert-item";

        div.innerHTML =
        `
        <strong>
            ${student.full_name || "-"}
        </strong>

        <span>
            ₹${student.due_fee || 0} due
        </span>
        `;

        box.appendChild(div);
    });
}



// ================= LOW ATTENDANCE =================

function renderLowAttendance(students) {

    const box =
    document.getElementById(
        "lowAttendanceBox"
    );

    if (!box) return;

    box.innerHTML = "";

    const low =
    students.filter(
        s =>
        (s.attendance_percentage || 0) < 75
    );

    safeSet(
        "lowAttendanceCount",
        low.length
    );

    if (!low.length) {

        box.innerHTML =
        `
        <div class="empty-alert">
            No attendance risks
        </div>
        `;

        return;
    }

    low.forEach(student => {

        const div =
        document.createElement("div");

        div.className =
        "alert-item";

        div.innerHTML =
        `
        <strong>
            ${student.full_name || "-"}
        </strong>

        <span>
            ${student.attendance_percentage || 0}%
        </span>
        `;

        box.appendChild(div);
    });
}



// ================= MISSING BATCH =================

function renderMissingBatch(students) {

    const box =
    document.getElementById(
        "missingBatchBox"
    );

    if (!box) return;

    box.innerHTML = "";

    const missing =
    students.filter(
        s => !s.batch_name
    );

    safeSet(
        "missingBatchCount",
        missing.length
    );

    if (!missing.length) {

        box.innerHTML =
        `
        <div class="empty-alert">
            All students assigned
        </div>
        `;

        return;
    }

    missing.forEach(student => {

        const div =
        document.createElement("div");

        div.className =
        "alert-item";

        div.innerHTML =
        `
        <strong>
            ${student.full_name || "-"}
        </strong>

        <span>
            No batch assigned
        </span>
        `;

        box.appendChild(div);
    });
}



// ================= RENDER STUDENTS =================

function renderStudents(students) {

    const table =
    document.getElementById(
        "studentsTableBody"
    );

    if (!table) return;

    table.innerHTML = "";

    students.forEach(student => {

        const row =
        document.createElement("tr");

        row.innerHTML =
        `
        <td>
            ${student.full_name || "-"}
        </td>

        <td>
            ${student.course || "-"}
        </td>

        <td>
            ${student.qualification || "-"}
        </td>

        <td>
            ${student.batch_name || "-"}
        </td>

        <td>
            ${student.attendance_percentage || 0}%
        </td>

        <td>
            ₹${student.total_fee || 0}
        </td>

        <td>
            ₹${student.due_fee || 0}
        </td>

        <td>
            ${student.status || "-"}
        </td>

        <td>

            <button
    class="table-btn"
    onclick="openStudentProfile('${student.id}')">
    View
    </button>

        </td>
        `;

        table.appendChild(row);
    });
}



// ================= FILTERS =================

function applyFilters() {

    const search =
    document
    .getElementById(
        "studentSearch"
    )
    ?.value
    .toLowerCase() || "";

    const course =
    document
    .getElementById(
        "courseFilter"
    )
    ?.value || "All";

    const fees =
    document
    .getElementById(
        "feesFilter"
    )
    ?.value || "All";
    const status =
document
.getElementById(
    "statusFilter"
)
?.value || "All";

const attendance =
document
.getElementById(
    "attendanceFilter"
)
?.value || "All";

    let filtered =
    ALL_STUDENTS;

    // SEARCH

    if (search) {

        filtered =
        filtered.filter(student =>

            (student.full_name || "")
            .toLowerCase()
            .includes(search)

            ||

            (student.phone || "")
            .includes(search)
        );
    }

    // COURSE

    if (course !== "All") {

        filtered =
        filtered.filter(
            student =>
            student.course === course
        );
    }

    // FEES

    if (fees === "Pending") {

        filtered =
        filtered.filter(
            student =>
            (student.due_fee || 0) > 0
        );
    }

    if (fees === "Paid") {

        filtered =
        filtered.filter(
            student =>
            (student.due_fee || 0) <= 0
        );
    }
// STATUS

if (status !== "All") {

    filtered =
    filtered.filter(
        student =>
        student.status === status
    );
}

// ATTENDANCE

if (attendance === "Low") {

    filtered =
    filtered.filter(
        student =>
        (student.attendance_percentage || 0) < 75
    );
}

if (attendance === "Healthy") {

    filtered =
    filtered.filter(
        student =>
        (student.attendance_percentage || 0) >= 75
    );
}
    renderStudents(filtered);
}



// ================= SAFE SET =================

function safeSet(id, value) {

    const el =
    document.getElementById(id);

    if (el) {

        el.innerText = value;
    }
}

let ACTIVE_STUDENT = null;


// ================= OPEN PROFILE =================

function openStudentProfile(studentId) {

    const student =
    ALL_STUDENTS.find(
        s => s.id === studentId
    );

    if (!student) return;

    ACTIVE_STUDENT = student;

    document
    .getElementById("studentModal")
    .classList
    .remove("hidden");

    // HEADER

    document
    .getElementById("modalStudentName")
    .innerText =
    student.full_name || "-";

    document
    .getElementById("modalStudentCourse")
    .innerText =
    student.course || "-";

    // BASIC INFO

    document
    .getElementById("studentInfo")
    .innerHTML =
    `
    <p><strong>Student Code:</strong> ${student.student_code || "-"}</p>

    <p><strong>Phone:</strong> ${student.phone || "-"}</p>

    <p><strong>Guardian:</strong> ${student.guardian_name || "-"}</p>

    <p><strong>Guardian Phone:</strong> ${student.guardian_phone || "-"}</p>

    <p><strong>Qualification:</strong> ${student.qualification || "-"}</p>

    <p><strong>Admission Date:</strong> ${student.admission_date || "-"}</p>
    `;

    // FINANCE

    document
    .getElementById("studentFinance")
    .innerHTML =
    `
    <p><strong>Total Fee:</strong> ₹${student.total_fee || 0}</p>

    <p><strong>Paid Fee:</strong> ₹${student.paid_fee || 0}</p>

    <p><strong>Due Fee:</strong> ₹${student.due_fee || 0}</p>

    <p><strong>Status:</strong> ${student.payment_status || "-"}</p>
    `;

    // ACADEMIC

    document
    .getElementById("studentAcademic")
    .innerHTML =
    `
    <p><strong>Batch:</strong> ${student.batch_name || "-"}</p>

    <p><strong>Attendance:</strong> ${student.attendance_percentage || 0}%</p>

    <p><strong>Last Attendance:</strong> ${student.last_attendance_date || "-"}</p>

    <p><strong>Student Status:</strong> ${student.status || "-"}</p>
    `;

    // NOTES

    document
    .getElementById("studentNotes")
    .value =
    student.notes || "";
}





// ================= SAVE NOTES =================

async function saveStudentNotes() {

    if (!ACTIVE_STUDENT) return;

    const notes =
    document
    .getElementById("studentNotes")
    .value;

    const { error } =
    await supabaseClient
    .from("Students")
    .update({
        notes
    })
    .eq(
        "id",
        ACTIVE_STUDENT.id
    );

    if (error) {

        console.error(error);

        alert("Failed to save notes");

        return;
    }

    ACTIVE_STUDENT.notes =
    notes;

    alert("Notes saved");
}




// ================= START =================

init();