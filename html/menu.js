//loading menu table from the database
function fetchMenu () {
  const tableBody = document.getElementById("menuBody");

  fetch("/api/menu")
    .then((response) => response.json())
    .then((data) => {
      tableBody.innerHTML = ""; // clear any old data

      data.forEach((item) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.menuid}</td>
          <td>${item.itemname}</td>
          <td>$${parseFloat(item.itemprice).toFixed(2)}</td>
          <td>${item.itemcategory}</td>
          <td>${item.itemdescrip || ''}</td>
        `;
        tableBody.appendChild(row);
      });
    })
    .catch((err) => {
      console.error("Error loading menu:", err);
      tableBody.innerHTML =
        "<tr><td colspan='4'>Failed to load menu data</td></tr>";
    });
}

// Run function on page load
document.addEventListener("DOMContentLoaded", fetchMenu);



const openMenuBtn = document.getElementById("openMenuBtn");
const addMenuPopup = document.querySelector(".addMenuPopup");
openMenuBtn.addEventListener("click", () => {
  addMenuPopup.style.display = "block";
});


const openMenuRemoveBtn = document.getElementById("openMenuRemoveBtn");
const removeMenuPopup = document.querySelector(".removeMenuPopup");
openMenuRemoveBtn.addEventListener("click", () => {
  removeMenuPopup.style.display = "block";
});

const closeMenuAddPopup = document.getElementById("closeMenuAddPopup");
closeMenuAddPopup.addEventListener("click", () => {
  addMenuPopup.style.display = "none";
});
const closeMenuRemovePopup = document.getElementById("closeMenuRemovePopup");
closeMenuRemovePopup.addEventListener("click", () => {
  removeMenuPopup.style.display = "none";
});

// Function to add an item to the menu database
document.getElementById("addMenuBtn").addEventListener("click", async () => {
  const name = document.getElementById("menu-name").value.trim();
  const price = parseFloat(document.getElementById("menu-price").value);
  const category = document.getElementById("menu-category").value.trim();
  const description = document.getElementById("menu-descrip").value.trim();

  if (!name || isNaN(price) || !category) {
    alert("Please fill out all fields correctly.");
    return;
  }

  // Send data to the server
  const response = await fetch("/api/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, price, category, description }),
  });
  
  
  if (response.ok) {
    alert("Menu item added successfully!");
    //refresh table and close pop up
    fetchMenu();
    addMenuPopup.style.display = "none";

    // clear inputs, ie, reset them back to blank 
    document.getElementById("menu-name").value = "";
    document.getElementById("menu-price").value = "";
    document.getElementById("menu-category").value = "";
    document.getElementById("menu-descrip").value = "";
  } else {
    const text = await response.text();
    console.error("Failed to add item to menu:", text);
    alert("Failed to add item to menu.");
  }
});

// Function to delete an item from the menu database
document.getElementById("removeMenuBtn").addEventListener("click", async () => {
  const name = document.getElementById("remove-menu-item-name").value.trim();

  if (!name) {
    alert("Please fill out the field correctly.");
    return;
  }

  try {
    // Send delete request to the server
    const response = await fetch(`/api/menu/${encodeURIComponent(name)}`, {
      method: "DELETE"
    });
    
    if (response.ok) {
      alert("Item removed successfully from menu database!");
      // refresh table and close popup
      fetchMenu();
      removeMenuPopup.style.display = "none";

      // clear input
      document.getElementById("remove-menu-item-name").value = "";
    } else {
      const error = await response.json();
      console.error("Failed to remove menu item:", error);
      alert(error.error || "Failed to remove menu item.");
    }
  } catch (err) {
    console.error("Error removing menu item:", err);
    alert("Failed to remove menu item.");
  }
});