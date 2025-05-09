import Authentication from "./authentication.js";
import Registration from "./registration.js";
import Socket from "./socket.js";

let socket = null;

const SignInForm = (function () {
  // This function will be called after successful login (both direct and session)
  const onLoginSuccess = function (user) {
    // Store user data
    window.currentUser = user;
    console.log("User authenticated:", user);

    // Hide login form
    hide();

    // Show logout button
    $("#logout-button").show();

    // Connect to socket and load game
    Socket.connect("http://localhost:3000", () => {
      socket = Socket.getSocket();
      pageHandler(user);
    });
  };

  const pageHandler = function (user) {
    // Handle waiting room
    $("#waiting-room").fadeIn(500);
    console.log("User loggin:", user.username);

    if (!socket) {
      console.error("Socket not available!");
      return; // Exit the function if no socket
    }

    // Emit an event to let the server know this user is in waiting room
    socket.emit("enterWaitingRoom", user.username);

    // Listen for waiting room status updates
    socket.on("waitingRoomStatus", (data) => {
      const status = JSON.parse(data);

      // If all users are in waiting room, enable ready button
      if (status.allInWaitingRoom) {
        $("#ready-button").prop("disabled", false);
        $("#ready-button").text("READY");
      } else {
        // Some users aren't in waiting room yet
        $("#ready-button").prop("disabled", true);
        $("#ready-button").text(
          `Waiting for all players (${status.inWaitingRoom}/${status.total})`
        );
      }
    });

    $("#ready-button").on("click", function () {
      socket.emit("playerReady", user.username);
      $(this).text("Waiting for others...").prop("disabled", true);

      // Add a ready state to track this user's status
      $(this).data("isReady", true);
    });

    socket.on("waitingStatus", (data) => {
      const status = JSON.parse(data);

      // Only update the text if this user has clicked the ready button
      if ($("#ready-button").data("isReady")) {
        if (status.inGame > 0) {
          $("#ready-button").text("Wait for next game").prop("disabled", true);
        } else {
          $("#ready-button").text(
            `Waiting for ${status.ready} / ${status.total}`
          );
        }
      }
    });

    socket.on("allReady", () => {
      $("#waiting-room").fadeOut(100);
      import("./main.js").then(() => {
        console.log("Game module loaded");
      });
    });

    // Handle Game-over page when game ended
    socket.on("gameOver", (playerRank) => {
      //playerRank is a list of player object with all data you need, which sorted with dead time already
      $("#game-over").fadeIn(500);
      const leaderboard = $("#leaderboard-result");
      leaderboard.empty();
      playerRank.forEach((player, idx) => {
        if (player.isdead) {
          leaderboard.append(
            "<div class='flex w-full'><div class='w-1/3 flex justify-center items-center text-center'>" +
              (idx + 1) +
              "</div><div class='w-1/3 flex justify-center items-center text-center'>" +
              player.username +
              "</div><div class='w-1/3 flex justify-center items-center text-center'>" +
              new Date(player.isdead).toTimeString().split(" ")[0] +
              "</div></div>"
          );
        } else {
          leaderboard.append(
            "<div class='flex w-full'><div class='w-1/3 flex justify-center items-center text-center'>" +
              (idx + 1) +
              "</div><div class='w-1/3 flex justify-center items-center text-center'>" +
              player.username +
              "</div><div class='w-1/3 flex justify-center items-center text-center'>-</div></div>"
          );
        }
      });
    });

    // Handle Game-over page when game not yet ended
    socket.on("someoneDead", (data) => {
      //playerRank is a list of player object with all data you need, which sorted with dead time already
      const playerRank = data.playerRank;
      const currentUsername = data.currentUsername;
      if (
        window.currentUser &&
        window.currentUser.username === currentUsername
      ) {
        $("#game-over").fadeIn(500);
        const leaderboard = $("#leaderboard-result");
        var knownRank = false;
        playerRank.forEach((player, idx) => {
          console.log(player);
          if (!knownRank && player.username !== currentUsername) {
            leaderboard.append(
              "<div class='flex w-full'><div class='w-1/3 flex justify-center items-center text-center'>-</div><div class='w-1/3 flex justify-center items-center text-center'>" +
                player.username +
                "</div><div class='w-1/3 flex justify-center items-center text-center'>-</div></div>"
            );
          } else {
            knownRank = true;
            leaderboard.append(
              "<div class='flex w-full'><div class='w-1/3 flex justify-center items-center text-center'>" +
                (idx + 1) +
                "</div><div class='w-1/3 flex justify-center items-center text-center'>" +
                player.username +
                "</div><div class='w-1/3 flex justify-center items-center text-center'>" +
                new Date(player.isdead).toTimeString().split(" ")[0] +
                "</div></div>"
            );
          }
        });
      }
      console.log("someoneDead debug:", { playerRank, currentUsername });
    });

    //handle play again button
    $("#playAgain")
      .off()
      .on("click", function () {
        $("#game-over").fadeOut(500);
        $("#waiting-room").fadeIn(500);

        // Let server know we're back in the waiting room
        socket.emit("enterWaitingRoom", user.username);

        // Reset ready button
        $("#ready-button").data("isReady", false);

        // Reload the page to ensure clean game state
        location.reload();
      });
  };

  // This function initializes the UI
  const initialize = function () {
    // Hide signin overlay initially
    $("#signin-overlay").hide();

    //Hide waiting room
    $("#waiting-room").hide();

    //Hide leaderbroad
    $("#game-over").hide();

    // Hide logout button initially
    $("#logout-button").hide();

    // Submit event for the signin form
    $("#signin-form").on("submit", (e) => {
      // Do not submit the form
      e.preventDefault();

      // Get the input fields
      const username = $("#signin-username").val().trim();
      const password = $("#signin-password").val().trim();

      // Send a signin request
      Authentication.signin(username, password, onLoginSuccess, (error) => {
        $("#signin-message").text(error);
      });
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
    $("#quitGame").on("click", handleLogout);

    // Check for existing session on page load
    Authentication.validate(onLoginSuccess, () => {
      // Show login form if no valid session
      show();
    });
  };

  // Function to handle logout
  const handleLogout = function () {
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
        setTimeout(() => {
          location.reload();
        }, 300);
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

  return { initialize, show, hide, handleLogout, onLoginSuccess };
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
