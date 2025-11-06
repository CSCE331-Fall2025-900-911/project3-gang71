function renderDrinks(drinks) {
  const menuRow = document.getElementById("menuRow");
  menuRow.innerHTML = ""; // clear previous items

  drinks.forEach(drink => {
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("menuItem");

    // build your drink structure using template literals
    itemDiv.innerHTML = `
      <img src="${drink.image_url}" alt="${drink.name}">
      <h2>${drink.name}</h2>
      <p>${drink.description}</p>
      <h1>$${drink.price.toFixed(2)}</h1>
      <button class="openModifications" data-id="${drink.id}">Add to Order</button>
    `;

    menuRow.appendChild(itemDiv);
  });

  // now attach click listeners for each button
  document.querySelectorAll(".openModifications").forEach(btn => {
    btn.addEventListener("click", e => {
      const drinkId = e.target.dataset.id;
      const drink = drinks.find(d => d.id == drinkId);
      openModificationsPopup(drink);
    });
  });
}


function closeModificationsPopup() {
    const modificationsPopupDiv = document.getElementById("modificationsPopup");
    if (!modificationsPopupDiv) {
        console.error("Modifications popup container not found!");
        return;
    }

    // TODO: clear button color changes

    modificationsPopupDiv.style.display = "none";
}

// calculate order price
function calculateModifiedPrice(fee) {
    const price = document.getElementById("modifiedDrinkPrice");
    // remove existing dollar sign
    extractedCurrentPrice = parseFloat(price.textContent.replace("$", ""));
    newPrice = extractedCurrentPrice + fee;
    price.textContent = "$" + newPrice.toFixed(2);
}


// add to order popup
let items = [];
function openSidebar(itemName, price, url) {
    items.push({name: itemName, price: price, url: url });

    const sidebar = document.getElementById("drinksInCartSidebar");
    if (!sidebar) {
        console.error("Sidebar container not found!");
        return;
    }

    // loop through all items
    items.forEach(item => {
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("sidebarItem");

        // clear sidebar before adding new items
        // sidebar.innerHTML = '';

        const img = document.createElement("img");
        img.src = item.url;
        img.alt = item.name;
        img.style.width = "50%";
        img.classList.add("sidebarImg");

        const name = document.createElement("span");
        name.textContent = item.name;
        name.classList.add("sidebarItemName");

        const price = document.createElement("span");
        price.textContent = `$${item.price.toFixed(2)}`;
        price.classList.add("sidebarItemPrice");

        // append img, name, price to item div
        itemDiv.appendChild(img);
        itemDiv.appendChild(name);
        itemDiv.appendChild(price);

        // append item div to sidebar
        sidebar.appendChild(itemDiv);
    });

    sidebar.style.display = "table-column";
}

// document.getElementById("addRoseBerryAndBlush").addEventListener("click", () => {
//     openModificationsPopup('Rose Berry & Blush', 5.90, 'https://d1ouk4tp1vcuss.cloudfront.net/s3.amazonaws.com/ODNUploads/68afe8eb3ea6f17a918f0599903c80ccf9587c641171317d407c2efa470743c90c7e551b0bc632dc7c0263a1843289a663743ddac41f5992f9c124b553f62620a38423f922ea8.jpeg?mode=crop&v=1&width=250&height=200')
// });

// document.getElementById("addItemToCart").addEventListener("click", () => {
//     openSidebar('Rose Berry & Blush', 5.90, 'https://d1ouk4tp1vcuss.cloudfront.net/s3.amazonaws.com/ODNUploads/68afe8eb3ea6f17a918f0599903c80ccf9587c641171317d407c2efa470743c90c7e551b0bc632dc7c0263a1843289a663743ddac41f5992f9c124b553f62620a38423f922ea8.jpeg?mode=crop&v=1&width=250&height=200')
//     closeModificationsPopup();
// });






// get menu items from database using API
document.addEventListener("DOMContentLoaded", () => {
  const menuRows = document.querySelectorAll(".menuRow");
  const category = document.body.dataset.category;

  if (menuRows.length === 0) {
    console.error("No elements with class 'menuRow' found in the DOM.");
    // stop execution
    return;
  }

  fetch(`/api/menu/${encodeURIComponent(category)}`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(drinks => {
      // const drinks = drinks.filter(drink => drink.itemcategory === category);
      let startingIndex = 0;
      menuRows.forEach(menuRow => {
        // clear old content
        menuRow.innerHTML = "";

        const chunk = drinks.slice(startingIndex, startingIndex + 4); // 4 drinks per row
        startingIndex += 4;

        chunk.forEach(drink => {
          const itemDiv = document.createElement("div");
          itemDiv.classList.add("menuItem");

          itemDiv.innerHTML = `
            <img src="${drink.itemphoto}" alt="${drink.itemname}" class="menuItemImg">
            <h2 class="menuItemH2">${drink.itemname}</h2>
            <p class="menuItemP">${drink.itemdescrip}</p>
            <h1 class="menuItemH1">$${Number(drink.itemprice).toFixed(2)}</h1>
            <button class="menuItemButton" data-id="${drink.menuid}">Add to Order</button>
          `;
          menuRow.appendChild(itemDiv);
        });
      });

      // TODO: modification menu
      
    })
    .catch(err => {
      console.error("Error loading drinks:", err);
      menuRows.forEach(menuRow => {
        menuRow.innerHTML = "<p>Failed to load menu items</p>";
      });
    });
});
