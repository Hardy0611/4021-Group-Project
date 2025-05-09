const Registration = (function () {
  const register = function (username, password, onSuccess, onError) {
    //
    // A. Preparing the user data
    //
    let user = {
      username: username,
      password: password,
    };

    fetch("http://localhost:3000/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(user),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.status == "error") {
          if (onError) onError(json.error);
        } else if (json.status == "ok") {
          if (onSuccess) onSuccess(json.user);
        }
      });
  };

  return { register };
})();

export default Registration;
