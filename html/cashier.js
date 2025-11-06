function renderDrinks(drinks, menuRow) {
  drinks.forEach(drink => {
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("menuItem");

    itemDiv.innerHTML = `
      <img src="${drink.itemphoto}" alt="${drink.itemname}" class="menuItemImg">
      <h2 class="menuItemH2">${drink.itemname}</h2>
      <p class="menuItemP">${drink.itemdescrip}</p>
      <div style="display: flex; align-items: center;">
        <h1 class="menuItemH1">$${Number(drink.itemprice).toFixed(2)}</h1>
        <button class="menuItemButton" data-id="${drink.menuid}">Add to Order</button>
      </div>
    `;
    menuRow.appendChild(itemDiv);

    // event listeners
    const addDrinkToOrderButton = itemDiv.querySelector(".menuItemButton");
    addDrinkToOrderButton.addEventListener("click", () => {
      openModificationsPopup(drink);
    });

    
  }); 
}

function openModificationsPopup(drink) {
  currentDrink = drink;
  currentBasePrice = Number(drink.itemprice);

  // put in drink info
  document.getElementById("itemImage").src = drink.itemphoto;
  document.getElementById("itemName").textContent = drink.itemname;
  document.getElementById("itemDescription").textContent = drink.itemdescrip;
  document.getElementById("modifiedDrinkPrice").textContent = `$${currentBasePrice.toFixed(2)}`;

  // TODO: pull in toppings info (remove hardcoded version)

  // reset modifications UI (size, sweetness, ice, toppings)
  document.getElementById("smallDrinkButton").dataset.selected = "false";
  document.getElementById("mediumDrinkButton").dataset.selected = "false";
  document.getElementById("largeDrinkButton").dataset.selected = "false";
  document.querySelectorAll(".threeModificationChoices button, .fourModificationChoices button").forEach(btn => btn.classList.remove("selected"));
  document.querySelectorAll("select").forEach(sel => sel.selectedIndex = 0);

  // show popup
  document.getElementById("modificationsPopup").style.display = "block";
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
function openSidebar(itemName, price, url, modifications = []) {
    items.push({name: itemName, price: price, url: url });

    const sidebar = document.getElementById("drinksInCartSidebar");
    if (!sidebar) {
        console.error("Sidebar container not found!");
        return;
    }

    // TODO: handle modifications

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
      let startingIndex = 0;
      menuRows.forEach(menuRow => {
        // clear old content
        menuRow.innerHTML = "";

        const chunk = drinks.slice(startingIndex, startingIndex + 4); // 4 drinks per row
        startingIndex += 4;
        renderDrinks(chunk, menuRow);
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
