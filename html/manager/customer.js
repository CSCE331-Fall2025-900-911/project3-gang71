//loading customer table from the database
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("customerBody");

  fetch("/api/customer")
    .then((response) => response.json())
    .then((data) => {
      tableBody.innerHTML = ""; // clear any old data
      data.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.customerid}</td>
          <td>${item.firstname}</td>
          <td>${item.lastname}</td>
          <td>${item.phonenumber}</td>
          <td>${item.loyaltypoints}</td>
        `;
        tableBody.appendChild(row);
      });
    })
    .catch((err) => {
      console.error("Error loading customer:", err);
      tableBody.innerHTML =
        "<tr><td colspan='4'>Failed to load customer data</td></tr>";
    });
});

function filterContent() {
  const filter = document.getElementById("search-bar").value.toLowerCase().trim();
  const tableBody = document.getElementById("customerBody");
  const rows = tableBody.querySelectorAll("tr");

  let matchFound = false;

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    if (text.includes(filter) || filter === "") {
      row.style.display = "";
      matchFound = true;
    } else {
      row.style.display = "none";
    }
  });

  // If no match found, add a new message row
  if (!matchFound && filter !== "") {
    const noItemRow = document.createElement("tr");
    noItemRow.id = "no-items-row";
    noItemRow.innerHTML = `
      <td colspan="4" style="text-align:center; color:gray; font-style:italic;">
        No items found
      </td>
    `;
    tableBody.appendChild(noItemRow);
  }
}

// load employee name
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("empName").innerHTML = sessionStorage.getItem('currentEmployee');
});