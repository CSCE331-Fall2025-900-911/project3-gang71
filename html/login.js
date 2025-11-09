const e = require("express");


function loginUser() {
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;

    console.log(username);
    console.log(password);

    fetch(`/api/login?user=${username}&userPassword=${password}`)
        .then((response) => response.json())
        .then((data) => {
            if(Object.keys(data).length === 0) {
                document.getElementById("failedLogin").hidden = false;
            } else {
            data.forEach((item) => {
                if(item.employeerole === "Cashier") {
                    sessionStorage.setItem('currentEmployee', item.firstname + " " + item.lastname);
                    window.location.href = "coldBrews.html";
                } else if(item.employeerole === "Manager") {
                    sessionStorage.setItem('currentEmployee', item.firstname + " " + item.lastname);
                    window.location.href = "manager.html";
                    //document.getElementById("empName").innerHTML = item.firstname + " " + item.lastname;
                }
            });}
        })
        .catch((err) => {
            console.error("Error logging in:", err);
            document.getElementById("failedLogin").hidden = false;
        });
}