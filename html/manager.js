//loading inventory table from the database
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("inventoryBody");

  fetch("/api/inventory")
    .then((response) => response.json())
    .then((data) => {
      tableBody.innerHTML = ""; // clear any old data

      data.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.supplyid}</td>
          <td>${item.supplyname}</td>
          <td>${item.unit}</td>
          <td>${item.quantityonhand}</td>
        `;
        tableBody.appendChild(row);
      });
    })
    .catch((err) => {
      console.error("Error loading inventory:", err);
      tableBody.innerHTML =
        "<tr><td colspan='4'>Failed to load inventory data</td></tr>";
    });
});

//searching the inventory table
// function filterContent() {
// const filter = document.getElementById("search-bar").value.toLowerCase().trim();
//      const rows = document.querySelectorAll("#inventoryBody tr");

//    rows.forEach(row => {
//  const text = row.textContent.toLowerCase();
//     row.style.display = text.includes(filter) ? "" : "none";
//   });
// }
function filterContent() {
  const filter = document.getElementById("search-bar").value.toLowerCase().trim();
  const tableBody = document.getElementById("inventoryBody");
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

