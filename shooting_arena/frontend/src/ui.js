import Authentication from "./authentication.js";
import Registration from "./registration.js";
import Socket from "./socket.js";

const SignInForm = (function () {
  // This function initializes the UI
  const initialize = function () {
    // Hide it
    $("#signin-overlay").hide();

    // Submit event for the signin form
    $("#signin-form").on("submit", (e) => {
      // Do not submit the form
      e.preventDefault();

      // Get the input fields
      const username = $("#signin-username").val().trim();
      const password = $("#signin-password").val().trim();

      // Send a signin request
      Authentication.signin(
        username,
        password,
        (user) => {
          window.currentUser = user;
          hide();
          
          // Show the logout button once signed in
          $("#logout-button").show();

          Socket.connect("http://localhost:3000/", () => {
            import("./main.js").then(() => {
              console.log("Game module loaded");
            });
          });
        },
        (error) => {
          $("#signin-message").text(error);
        }
      );
    });

    // Submit event for the register form
    $("#register-form").on("submit", (e) => {
      // Do not submit the form
      e.preventDefault();
      // Get the input fields
      const username = $("#register-username").val().trim();
      const password = $("#register-password").val().trim();
      const confirmPassword = $("#register-confirm").val().trim();

      // Password and confirmation does not match
      if (password != confirmPassword) {
        $("#register-message").text("Passwords do not match.");
        return;
      }

      // Send a register request
      Registration.register(
        username,
        password,
        () => {
          $("#register-form").get(0).reset();
          $("#register-message").text("You can sign in now.");
        },
        (error) => {
          $("#register-message").text(error);
        }
      );
    });
    
    // Setup logout button functionality
    $("#logout-button").on("click", handleLogout);
  };

  // Function to handle logout
  const handleLogout = function() {
    // Store username before logout for cleanup
    const username = window.currentUser?.username;
    
    Authentication.signout(
      () => {
        // Hide logout button
        $("#logout-button").hide();
        
        // Disconnect socket (will trigger userLogout event)
        Socket.disconnect();
        
        // Manually clean up the current player if needed
        if (username && window.cleanupPlayer) {
          window.cleanupPlayer(username);
        }
        
        // Reset current user
        window.currentUser = null;
        
        // Show login form
        show();
        
        // Reload the page to reset game state
        location.reload();
      },
      (error) => {
        console.error("Logout failed:", error);
      }
    );
  };

  // This function shows the form
  const show = function () {
    $("#signin-overlay").fadeIn(500);
  };

  // This function hides the form
  const hide = function () {
    $("#signin-form").get(0).reset();
    $("#signin-message").text("");
    $("#register-message").text("");
    $("#signin-overlay").fadeOut(500);
  };

  return { initialize, show, hide, handleLogout };
})();

const UI = (function () {
  // The components of the UI are put here
  const components = [SignInForm];

  // This function initializes the UI
  const initialize = function () {
    // Initialize the components
    for (const component of components) {
      component.initialize();
    }
  };

  return { initialize };
})();

// Export the modules
export default UI;
export { SignInForm };