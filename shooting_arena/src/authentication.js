const Authentication = (function() {
    // This stores the current signed-in user
    let user = null;

    // This function gets the signed-in user
    const getUser = function() {
        return user;
    }

    const signin = function(username, password, onSuccess, onError) {

        //
        // A. Preparing the user data
        //
        let userData = JSON.stringify({
            "username": username,
            "password": password
        });
 
        //
        // B. Sending the AJAX request to the server
        //
        fetch("/signin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: userData
        })
        .then((res) => res.json())
        .then((json) => {
            if (json.status == "error") {
                if (onError) onError(json.error);
            }
            else if (json.status == "success") {
                user = json.user;
                if (onSuccess) onSuccess(user);
            }
        });
    };

    const validate = function(onSuccess, onError) {
        fetch("/validate", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then((res) => res.json())
        .then((json) => {
            if (json.status == "error") {
                if (onError) onError(json.error);
            }
            else if (json.status == "success") {
                user = json.user;
                if (onSuccess) onSuccess(user);
            }
        });
    };

    const signout = function(onSuccess, onError) {

        fetch("/signout", {
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        })
        .then((res) => res.json())
        .then((json) => {
            if (json.status == "error") {
                if (onError) onError(json.error);
            }
            else if (json.status == "success") {
                user = null;
                if (onSuccess) onSuccess();
            }
        });
    };

    return { getUser, signin, validate, signout };
})();
