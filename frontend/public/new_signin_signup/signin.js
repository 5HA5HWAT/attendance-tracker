document.getElementById("submitSignIn").addEventListener("click", async (e) => {
  
      e.preventDefault();
  
      const email = document.getElementById("signInEmail").value;
      const password = document.getElementById("signInPassword").value;
  
      try {
        const response = await axios.post("http://localhost:3000/api/v1/user/signin", {
          email,
          password,
        });
  
        const token = response.data.token;
        if (!token) {
          alert("Signin failed: Token not received");
          return;
        }
  
        localStorage.setItem("token", token);
        alert("Signin successful");
        window.location.href = "/dashboard/dashboard.html";
  
      } catch (error) {
        console.error("Signin error:", error);
        
        if (error.response) {
          const errData = error.response.data;
          
          if (errData.errors) {
            // Zod validation errors
            alert("Validation error: " + errData.errors[0]?.message);
          } else if (errData.error) {
            // Custom server-side error
            alert("Signin failed: " + errData.error);
          } else {
            alert("Signin failed: Unknown error");
          }
  
        } else {
          alert("Network or server error: " + error.message);
        }
      }
    });
  