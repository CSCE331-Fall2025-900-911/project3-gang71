function loginUser() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    fetch(`/api/login?user=${username}&userPassword=${password}`)
        .then(async (response) => {
            if (!response.ok) {
                // if server sent 401 Unauthorized
                throw new Error("Unauthorized");
            }

            // try parsing JSON
            const data = await response.json();

            // ensure it's an array
            if (!Array.isArray(data) || data.length === 0) {
                document.getElementById("failedLogin").hidden = false;
                return;
            }

            // handle user
            const item = data[0];

            sessionStorage.setItem(
                'currentEmployee',
                `${item.firstname} ${item.lastname}`
            );

            if (item.employeerole === "Cashier") {
                window.location.href = "cashier/cashier.html";
            } else if (item.employeerole === "Manager") {
                window.location.href = "manager/manager.html";
            }
        })
        .catch((err) => {
            console.error("Error logging in:", err);
            document.getElementById("failedLogin").hidden = false;
        });
}
