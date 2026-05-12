let BUSINESS_ID = null;

async function init() {

  console.log("EMPLOYEE PAGE LOADED");

  const {
    data: { user },
    error: authError
  } = await supabaseClient.auth.getUser();

  console.log("AUTH USER:", user);

  if (authError || !user) {
    console.error(authError);
    window.location.href = "/login.html";
    return;
  }

  const { data: userRows, error } = await supabaseClient
    .from("Users")
    .select("*")
    .eq("id", user.id);

  console.log("USER ROWS:", userRows);

  if (error || !userRows || userRows.length === 0) {
    console.error("USER FETCH FAILED", error);
    alert("User row missing in Users table");
    return;
  }

  const userRow = userRows[0];

  BUSINESS_ID = userRow.business_id;

  console.log("BUSINESS_ID:", BUSINESS_ID);

  await loadEmployees();
}

async function loadEmployees() {

  console.log("LOADING EMPLOYEES...");

  const { data, error } = await supabaseClient
    .from("Users")
    .select("*")
    .eq("business_id", BUSINESS_ID);

  console.log("EMPLOYEE DATA:", data);

  if (error) {
    console.error(error);
    return;
  }

  const table = document.getElementById("employeeTable");

  table.innerHTML = "";

  if (!data || data.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="3">No employees found</td>
      </tr>
    `;
    return;
  }

  data.forEach(u => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${u.name || "No Name"}</td>
      <td>${u.email || "No Email"}</td>
      <td>${u.role || "employee"}</td>
    `;

    table.appendChild(row);
  });
}

async function createEmployee() {

  const name = document.getElementById("empName").value;
  const email = document.getElementById("empEmail").value;
  const password = document.getElementById("empPassword").value;

  if (!name || !email || !password) {
    alert("Fill all fields");
    return;
  }

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password
  });

  if (error) {
    console.error(error);
    alert(error.message);
    return;
  }

  const user = data.user;

  console.log("CREATED AUTH USER:", user);

  const { error: insertError } = await supabaseClient
    .from("Users")
    .insert([{
      id: user.id,
      email,
      name,
      role: "employee",
      business_id: BUSINESS_ID
    }]);

  if (insertError) {
    console.error(insertError);
    alert("DB insert failed");
    return;
  }

  alert("Employee created");

  document.getElementById("empName").value = "";
  document.getElementById("empEmail").value = "";
  document.getElementById("empPassword").value = "";

  await loadEmployees();
}

init();