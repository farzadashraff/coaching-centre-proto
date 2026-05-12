const supabaseClient = window.supabase.createClient(
  "https://xsdalnxweznnjzogyqaa.supabase.co",
  "sb_publishable_8YsECibGGtbRwxqf0HhH6w_lBUmW_nt"
);

let BUSINESS_ID = null;

async function init() {

  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  const { data: userRow } = await supabaseClient
    .from("Users")
    .select("*")
    .eq("id", user.id)
    .single();

  BUSINESS_ID = userRow.business_id;

  loadEmployees();
}

async function loadEmployees() {

  const { data, error } = await supabaseClient
    .from("Users")
    .select("*")
    .eq("business_id", BUSINESS_ID);

  if (error) {
    console.error(error);
    return;
  }

  const table = document.getElementById("employeeTable");
  table.innerHTML = "";

  data.forEach(u => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${u.name || ""}</td>
      <td>${u.email || ""}</td>
      <td>${u.role || ""}</td>
    `;

    table.appendChild(row);

  });
}

async function createEmployee() {

  const name = document.getElementById("empName").value;
  const email = document.getElementById("empEmail").value;
  const password = document.getElementById("empPassword").value;

  const { data, error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: "employee"
      }
    }
  });

  if (error) {
    alert(error.message);
    return;
  }

  const user = data.user;

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

  loadEmployees();
}

init();