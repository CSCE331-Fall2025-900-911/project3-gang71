const sideMenu = document.querySelector("aside");
const menuBtn = document.querySelector("#menu-btn");
const closeBtn = document.querySelector("#close-btn");

menuBtn.addEventListener('click', () => {
    sideMenu.style.display = 'block';
});
closeBtn.addEventListener('click', () =>{
    sideMenu.style.display ='none';
});

// html/manager.js
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
