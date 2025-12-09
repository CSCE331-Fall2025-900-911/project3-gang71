//loading inventory table from the database
function fetchInventory () {
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
          <td>${item.supplyprice}</td>
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
}

//searching the inventory table based on name in search bar
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


// Open "Add an Item" to inventory popup
const openAddBtn = document.getElementById("openAddBtn");
const addItemPopup = document.querySelector(".addItemPopup");
openAddBtn.addEventListener("click", () => {
  addItemPopup.style.display = "block";
});

// close button for "add an item to inventory" popup
const closeAddPopup = document.getElementById("closeAddPopup");
closeAddPopup.addEventListener("click", () => {
  addItemPopup.style.display = "none";
});

// Open "Remove an Item from Inventory" database popup
const openRemoveBtn = document.getElementById("openRemoveBtn");
const removeItemPopup = document.querySelector(".removeItemPopup");
openRemoveBtn.addEventListener("click", () => {
  removeItemPopup.style.display = "block";
});

// close "remove an item from inventory" popup
const closeRemovePopup = document.getElementById("closeRemovePopup");
closeRemovePopup.addEventListener("click", () => {
  removeItemPopup.style.display = "none";
});


// Function to add an item to the inventory database
document.getElementById("addItemBtn").addEventListener("click", async () => {
  const name = document.getElementById("item-name").value.trim();
  const price = parseFloat(document.getElementById("item-price").value);
  const unit = document.getElementById("item-unit").value.trim();
  const quantity = parseInt(document.getElementById("item-quantity").value, 10);

  if (!name || isNaN(price) || !unit || isNaN(quantity)) {
    alert("Please fill out all fields correctly.");
    return;
  }

  // Send data to the server
  const response = await fetch("/api/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, price: parseFloat(price), unit, quantity: parseInt(quantity) }),
  });
  
  
  if (response.ok) {
    alert("Item added successfully!");
    //refresh table and close pop up
    fetchInventory();
    addItemPopup.style.display = "none";

    // clear inputs, ie, reset them back to blank 
    document.getElementById("item-name").value = "";
    document.getElementById("item-price").value = "";
    document.getElementById("item-unit").value = "";
    document.getElementById("item-quantity").value = "";
  } else {
    try {
      const data = await response.json();
      console.error("Failed to add item:", data);
      alert("Failed to add item: " + (data.details || data.error));
    } catch (e) {
      const text = await response.text();
      console.error("Failed to add item:", text);
      alert("Failed to add item.");
    }
  }
});

// Function to delete an item from the inventory database
document.getElementById("removeItemBtn").addEventListener("click", async () => {
  const name = document.getElementById("remove-item-name").value.trim();

  if (!name) {
    alert("Please fill out the field correctly.");
    return;
  }

  try {
    // Send delete request to the server
    const response = await fetch(`/api/inventory/${encodeURIComponent(name)}`, {
      method: "DELETE"
    });
    
    if (response.ok) {
      alert("Item removed successfully!");
      // refresh table and close popup
      fetchInventory();
      removeItemPopup.style.display = "none";

      // clear input
      document.getElementById("remove-item-name").value = "";
    } else {
      const error = await response.json();
      console.error("Failed to remove item:", error);
      alert(error.error || "Failed to remove item.");
    }
  } catch (err) {
    console.error("Error removing item:", err);
    alert("Failed to remove item.");
  }
});

// run function on page load and show employee name
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("empName").innerHTML = sessionStorage.getItem('currentEmployee');
  fetchInventory();
});