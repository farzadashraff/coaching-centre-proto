const supabaseClient = window.supabase.createClient(
  "https://xsdalnxweznnjzogyqaa.supabase.co",
  "sb_publishable_8YsECibGGtbRwxqf0HhH6w_lBUmW_nt"
);

// GET CURRENT USER
async function getCurrentUser() {
  const {
    data: { user },
    error
  } = await supabaseClient.auth.getUser();

  if (error) {
    console.error(error.message);
    return null;
  }

  return user;
}

// PROTECT PAGE
async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    window.location.href = "/login.html";
    return;
  }

  console.log("AUTHENTICATED USER:", user.email);
}

// REDIRECT LOGGED-IN USERS
async function redirectIfLoggedIn() {
  const user = await getCurrentUser();

  if (user) {
    window.location.href = "/admin.html";
  }
}

// LOGOUT
async function logout() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    alert(error.message);
    return;
  }

  window.location.href = "/login.html";
}
