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



const openAddBtn = document.getElementById("openAddBtn");
const popup = document.querySelector(".popup");
const closeRemoveBtn = document.getElementById("closeRemoveBtn");

openAddBtn.addEventListener("click", () => {
  popup.style.display = "block";
});

closeRemoveBtn.addEventListener("click", () => {
  popup.style.display = "none";
});


document.getElementById("addItemBtn").addEventListener("click", async () => {
  const name = document.getElementById("item-name").value;
  const unit = document.getElementById("item-unit").value;
  const quantity = parseInt(document.getElementById("item-quantity").value);

  if (!name || !unit || isNaN(quantity)) {
    alert("Please fill out all fields correctly.");
    return;
  }

  // Send data to the server
  const response = await fetch("/api/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, unit, quantity }),
  });

  if (response.ok) {
    alert("Item added successfully!");
    popup.style.display = "none";
  } else {
    alert("Failed to add item.");
  }
});


