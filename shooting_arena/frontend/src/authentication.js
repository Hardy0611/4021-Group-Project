const Authentication = (function () {
  // This stores the current signed-in user
  let user = null;

  // This function gets the signed-in user
  const getUser = function () {
    return user;
  };

  const signin = function (username, password, onSuccess, onError) {
    let userData = JSON.stringify({
      username: username,
      password: password,
    });

    fetch("http://localhost:3000/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: userData,
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.status == "error") {
          if (onError) onError(json.error);
        } else if (json.status == "ok") {
          user = json.user;
          if (onSuccess) onSuccess(user);
        }
      });
  };

  const validate = function (onSuccess, onError) {
    fetch("http://localhost:3000/validate", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include"
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.status == "error") {
          if (onError) onError(json.error);
        } else if (json.status == "ok") {
          user = json.user;
          if (onSuccess) onSuccess(user);
        }
      });
  };

  const signout = function (onSuccess, onError) {
    fetch("http://localhost:3000/logout", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include"
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.status == "error") {
          if (onError) onError(json.error);
        } else if (json.status == "ok") {
          user = null;
          if (onSuccess) onSuccess();
        }
      })
      .catch(error => {
        console.error("Logout error:", error);
        if (onError) onError("Network error during logout");
      });
  };

  return { getUser, signin, validate, signout };
})();

export default Authentication;
