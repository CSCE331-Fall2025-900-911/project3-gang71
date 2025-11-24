// processes employee login with username and password
function employeeLogin() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch(`/api/employeeLogin?user=${username}&userPassword=${password}`)
        .then(async (response) => {
            if (!response.ok) {
                // if server sent 401 Unauthorized
                throw new Error("Unauthorized");
            }

            // try parsing JSON
            const data = await response.json();

            // ensure it's an array
            if (!Array.isArray(data) || data.length === 0) {
                document.getElementById("failedEmployeeLogin").hidden = false;
                return;
            }

            // handle user
            const item = data[0];

            sessionStorage.setItem("currentEmployee", `${item.firstname} ${item.lastname}`);

            if (item.employeerole === "Cashier") {
                window.location.href = "cashier/cashier.html";
            } else if (item.employeerole === "Manager") {
                window.location.href = "manager/manager.html";
            }
        })
        .catch((err) => {
            console.error("Error logging in:", err);
            document.getElementById("failedEmployeeLogin").hidden = false;
        });
}

// processes customer login with phone number
function customerLogin() {
    var phoneNumber = document.getElementById("phoneNumber").value;
    var number = "";
    var curIndex = 0;
    // parse inputted phone number to extract only digits
    while(number.length < 9) {
        curNum = parseInt(phoneNumber.substring(curIndex));
        if(!Number.isNaN(curNum)) {
            number += curNum;
            curIndex = curIndex + curNum.toString().length + 1;
        }
        else {
            ++curIndex;
        }
    }

    // reformat phone number and send to be checked for matching customer
    var formattedPhoneNumber = number.substring(0,3) + "-" + number.substring(3,6) + "-" + number.substring(6);
    fetch(`/api/customerlogin?phone=${formattedPhoneNumber}`)
        .then(async (response) => {
            if (!response.ok) {
                throw new Error("Unauthorized");
            }

            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                document.getElementById("failedCustomerLogin").hidden = false;
                return;
            }

            const item = data[0];
            sessionStorage.setItem('currentCustomer', `${item.firstname} ${item.lastname}`);
            window.location.href = "customerKiosk/coldBrews.html";
        })
        .catch((err) => {
            console.error("Error logging in:", err);
            document.getElementById("failedCustomerLogin").hidden = false;
        });
}

function employeeOAuthButton() {
    sessionStorage.setItem("oauthType", "Employee");
    oauthLogin();
}

function customerOAuthButton() {
    sessionStorage.setItem("oauthType", "Customer");
    oauthLogin();
}

// uses Google OAuth to login
function oauthLogin() {
    try {
        const oauthForm = document.createElement('form');
        oauthForm.setAttribute("method", "GET");
        oauthForm.setAttribute("action", "https://accounts.google.com/o/oauth2/v2/auth");

        // obtain client id from .env file and use to call API
        fetch("/api/clientid")
            .then(response => response.json())
            .then((data) => {
                const clientID = Object.assign(document.createElement('input'), {
                    hidden: true,
                    name: "client_id",
                    value: data
                });
                oauthForm.appendChild(clientID);

                const redirectURI = Object.assign(document.createElement('input'), {
                    hidden: true,
                    name: "redirect_uri",
                    value: "https://new-project3-gang71.onrender.com"
                });
                oauthForm.appendChild(redirectURI);

                var responseType = Object.assign(document.createElement('input'), {
                    hidden: true,
                    name: "response_type",
                    value: "token"
                });
                oauthForm.appendChild(responseType);

                var scope = Object.assign(document.createElement('input'), {
                    hidden: true,
                    name: "scope",
                    value: "https://www.googleapis.com/auth/userinfo.email"
                });
                oauthForm.appendChild(scope);

                document.body.appendChild(oauthForm);
                oauthForm.submit();
            })
    } catch (err) {
        console.error("Error logging in using OAuth:", err);
    }
}

// extracts access token from OAuth
document.addEventListener("DOMContentLoaded", () => {
    if(window.location.href.indexOf('#') > -1) {
        accessToken = window.location.href.substring(window.location.href.indexOf('=') + 1, window.location.href.indexOf('&'));
        fetch(`/api/email?token=${accessToken}`)
            .then(response => response.json())
            .then(data => {
                if(sessionStorage.getItem("oauthType") === "Customer") {
                    customerOAuth(data.email);
                } else if (sessionStorage.getItem("oauthType") === "Employee") {
                    employeeOAuth(data.email);
                }
            })
            .catch((err) => {
                console.error("Error acquiring OAuth access token: ", err);
            });
    }
});

// employee login using OAuth
function employeeOAuth(email) {
    fetch(`/api/employeeoauth?email=${email}`)
        .then(async (response) => {
            if (!response.ok) {
                throw new Error("Unauthorized");
            }

            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                document.getElementById("failedEmployeeLogin").hidden = false;
                return;
            }

            const item = data[0];
            sessionStorage.setItem("currentEmployee", `${item.firstname} ${item.lastname}`);

            if (item.employeerole === "Cashier") {
                window.location.href = "cashier/cashier.html";
            } else if (item.employeerole === "Manager") {
                window.location.href = "manager/manager.html";
            }
        })
        .catch((err) => {
            console.error("Error logging in:", err);
            document.getElementById("failedEmployeeLogin").hidden = false;
        });
}

// customer login using OAuth
function customerOAuth(email) {
    fetch(`/api/customeroauth?email=${email}`)
        .then(async (response) => {
            if (!response.ok) {
                throw new Error("Unauthorized");
            }

            const data = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                document.getElementById("failedCustomerLogin").hidden = false;
                return;
            }
            
            const item = data[0];
            sessionStorage.setItem('currentCustomer', `${item.firstname} ${item.lastname}`);
            window.location.href = "customerKiosk/coldBrews.html";
        })
        .catch((err) => {
            console.error("Error logging in:", err);
            document.getElementById("failedCustomerLogin").hidden = false;
        });
}

