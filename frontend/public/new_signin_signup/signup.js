document.getElementById("submitSignUp").addEventListener("click", async (e) => {
  e.preventDefault();

  // const fullName = e.target.fullName.value;
  // const email = e.target.email.value;
  // const password = e.target.password.value;
  // const confirmPassword = e.target.confirmPassword.value;

  const fullName = document.getElementById("fullName").value;
  const email = document.getElementById("signUpEmail").value;
  const password = document.getElementById("signUpPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;


  // console.log("Form data:", { fullName, email, password, confirmPassword });

  if (password !== confirmPassword) {
    alert("Passwords do not match!");
    return;
  }

  try {
    const response = await axios.post("http://localhost:3000/api/v1/user/signup", {
      fullName,
      email,
      password,
    });

    alert("Signup successful!");
    // window.location.href = "../sign_in_page/sign_in_page.html";
  } catch (error) {
    console.error("Error during signup:", error);
    if (error.response) {
      // Server responded with a status outside the 2xx range
      alert(error.response.data.message || "Signup failed");
    } else if (error.request) {
      // Request was made but no response received
      alert("No response from server. Please try again later.");
    } else {
      // Something else happened
      alert("Error: " + error.message);
    }
  }
});
