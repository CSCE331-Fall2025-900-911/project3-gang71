//loading employee table from the database
function fetchEmployees () {
  const tableBody = document.getElementById("employeesBody");

  fetch("/api/employee")
    .then((response) => response.json())
    .then((data) => {
      tableBody.innerHTML = ""; // clear any old data

      data.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.employeeid}</td>
          <td>${item.firstname}</td>
          <td>${item.lastname}</td>
          <td>${item.employeerole}</td>
          <td>${item.payrate}</td>
          <td>${item.hoursworked}</td>
        `;
        tableBody.appendChild(row);
      });
    })
    .catch((err) => {
      console.error("Error loading employees:", err);
      tableBody.innerHTML =
        "<tr><td colspan='4'>Failed to load employees data</td></tr>";
    });
}

// run function on page load and show employee name
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("empName").innerHTML = sessionStorage.getItem('currentEmployee');
  fetchEmployees();
});
