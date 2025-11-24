// global variables to store / keep track of drink modifications
let currentDrink = null;
let currentBasePrice = 0;
let currentModifications = {
  size: 'small',
  sweetness: '100%',
  ice: '100%',
  toppings: []
};
let availableToppings = [];

//-------------------- TOPPING HELPER FUNCTIONS --------------------//
//----- get toppings from the databse //
async function loadToppings() {
  try {
    const response = await fetch('/api/menu/Topping');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    availableToppings = await response.json();
    populateToppingDropdowns();
  } catch (err) {
    console.error("Error loading toppings:", err);
  }
}

//----- display toppings in each of the drop down menus //
function populateToppingDropdowns() {
  const topping1Select = document.querySelector('select[name="topping1"]');
  const topping2Select = document.querySelector('select[name="topping2"]');
  
  // Only populate if selects exist (they're in the popup)
  if (!topping1Select || !topping2Select) return;
  
  // clear selected toppings
  [topping1Select, topping2Select].forEach(select => {
    while (select.options.length > 1) {
      select.remove(1);
    }
  });
  // for the user - sort them in alphabetical order before displaying in dropdowns
  availableToppings.sort((a, b) => a.itemname.localeCompare(b.itemname, undefined, { sensitivity: 'base' }));

  // populate dropdowns
  availableToppings.forEach(topping => {
    const option1 = document.createElement('option');
    option1.value = topping.menuid;
    option1.textContent = `${topping.itemname} (+$${Number(topping.itemprice).toFixed(2)})`;
    option1.dataset.price = topping.itemprice;
    option1.dataset.name = topping.itemname;
    topping1Select.appendChild(option1);
    
    const option2 = option1.cloneNode(true);
    topping2Select.appendChild(option2);
  });
}

//-------------------- MENU + DRINK FUNCTIONS --------------------//
//----- dynamically displays menu drinks, and gives each drink a add to order button that triggers a popup
document.addEventListener("DOMContentLoaded", () => {
  const menu = document.querySelector("main");
  const category = document.body.dataset.category;

  // load toppings at startup
  loadToppings();

  if (!menu) {
    console.error("No main element found in the DOM.");
    return;
  }

  fetch(`/api/menu/${encodeURIComponent(category)}`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(drinks => {
        drinks.forEach(drink => {
            const itemDiv = document.createElement("div");
            itemDiv.classList.add("menuItem");

            itemDiv.innerHTML = `
                <img src="${drink.itemphoto}" alt="${drink.itemname}" class="menuItemImg">
                <h3 class="menuItemH3">${drink.itemname}</h3>
                <p class = "menuItemP">$${Number(drink.itemprice).toFixed(2)}</p>
                <button class="menuItemButton" data-id="${drink.menuid}">Add</button>
            `;
            
            menu.appendChild(itemDiv);

            // event listeners
            const addDrinkToOrderButton = itemDiv.querySelector(".menuItemButton");
            addDrinkToOrderButton.addEventListener("click", () => {
                openModificationsPopup(drink);
            });
        }); 
    })
    .catch(err => {
      console.error("Error loading drinks:", err);
    });
    
  // Load the current order number
  fetch('/api/orders')
    .then((response) => response.json())
    .then(orders => {
      const orderNumber = document.getElementById("orderNumber");
      if (orderNumber) {
        orders.forEach(orderNum => {
          orderNumber.innerHTML = "Order #" + (orderNum.max + 1);
        });
      }
    })
    .catch(err => {
      console.error("Error loading order number:", err);
    });
});

//----- shows the pop up that allows the customer to make modifications to their drink before adding to the cart
function openModificationsPopup(drink, existingModifications = null, itemIndex = null) {
  currentDrink = drink;
  currentBasePrice = Number(drink.itemprice);
  editingItemIndex = itemIndex; // Store if we're editing an existing item

  // Check if popup exists
  const popup = document.getElementById("modificationsPopup");
  if (!popup) {
    alert("Modifications popup not found. Please add the popup HTML to your page.");
    return;
  }

  // If editing existing item, load its modifications
  if (existingModifications) {
    currentModifications = {
      size: existingModifications.size,
      sweetness: existingModifications.sweetness,
      ice: existingModifications.ice,
      toppings: existingModifications.toppings ? [...existingModifications.toppings] : []
    };
  } else {
    // reset modification values for new item
    currentModifications = {
      size: 'small',
      sweetness: '100%',
      ice: '100%',
      toppings: []
    };
  }

  // Reset all buttons first
  document.querySelectorAll(".threeModificationChoices button").forEach(btn => btn.classList.remove("selected"));
  document.querySelectorAll(".fourModificationChoices button").forEach(btn => btn.classList.remove("selected"));
  
  // Set size button based on current modifications
  const smallBtn = document.getElementById("smallDrinkButton");
  const mediumBtn = document.getElementById("mediumDrinkButton");
  const largeBtn = document.getElementById("largeDrinkButton");
  
  if (currentModifications.size === 'small' && smallBtn) smallBtn.classList.add("selected");
  else if (currentModifications.size === 'medium' && mediumBtn) mediumBtn.classList.add("selected");
  else if (currentModifications.size === 'large' && largeBtn) largeBtn.classList.add("selected");
  
  // Set sweetness button
  const sweetnessButtons = document.querySelectorAll('.modification:nth-of-type(3) .fourModificationChoices button');
  sweetnessButtons.forEach(btn => {
    if (btn.textContent.trim() === currentModifications.sweetness) {
      btn.classList.add("selected");
    }
  });
  
  // Set ice button
  const iceButtons = document.querySelectorAll('.modification:nth-of-type(4) .fourModificationChoices button');
  iceButtons.forEach(btn => {
    if (btn.textContent.trim() === currentModifications.ice) {
      btn.classList.add("selected");
    }
  });
  
  // Set toppings - reset first
  document.querySelectorAll("select").forEach(sel => sel.selectedIndex = 0);
  if (existingModifications && existingModifications.toppings && existingModifications.toppings.length > 0) {
    const toppingSelects = document.querySelectorAll('select[name="topping1"], select[name="topping2"]');
    existingModifications.toppings.forEach((topping, index) => {
      if (toppingSelects[index] && topping.id) {
        toppingSelects[index].value = topping.id;
      }
    });
  }

  // put in drink info
  const itemImage = document.getElementById("itemImage");
  const itemName = document.getElementById("itemName");
  const itemDescription = document.getElementById("itemDescription");
  
  if (itemImage) itemImage.src = drink.itemphoto;
  if (itemName) itemName.textContent = drink.itemname;
  if (itemDescription) itemDescription.textContent = drink.itemdescrip;
  
  // Calculate and display price
  calculateModifiedPrice();

  // populate drop menus
  populateToppingDropdowns();

  // add event listeners for modifications to recalc order price 
  const sizeButtons = document.querySelectorAll(".size-button");
  sizeButtons.forEach(btn => {
    btn.onclick = () => {
      sizeButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      currentModifications.size = btn.dataset.size;
      calculateModifiedPrice(); 
    };
  });

  // add topping listeners
  const toppingSelects = document.querySelectorAll('select[name="topping1"], select[name="topping2"]');
  toppingSelects.forEach(select => {
    select.onchange = () => {
      // Get topping IDs from selects and convert to full details
      const toppingIds = Array.from(toppingSelects)
        .map(sel => sel.value)
        .filter(v => v);
      
      currentModifications.toppings = toppingIds.map(toppingId => {
        const topping = availableToppings.find(t => String(t.menuid) === String(toppingId));
        return topping ? { id: toppingId, name: topping.itemname, price: topping.itemprice } : null;
      }).filter(t => t !== null);
      
      calculateModifiedPrice();
    };
  });

  // add sweetness listeners
  document.querySelectorAll('.modification:nth-of-type(3) .fourModificationChoices button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modification:nth-of-type(3) .fourModificationChoices button')
        .forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentModifications.sweetness = btn.textContent.trim();
    };
  });

  // add ice listeners 
  document.querySelectorAll('.modification:nth-of-type(4) .fourModificationChoices button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modification:nth-of-type(4) .fourModificationChoices button')
        .forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentModifications.ice = btn.textContent.trim();
    };
  });

  // show popup
  popup.style.display = "block";
}

//----- closes popup and resets buttons 
function closeModificationsPopup() {
    const modificationsPopupDiv = document.getElementById("modificationsPopup");
    if (!modificationsPopupDiv) {
        console.error("Modifications popup container not found!");
        return;
    }
    modificationsPopupDiv.style.display = "none";
}

//----- calculate order price and update onto popup realtime as modifications are made 
function calculateModifiedPrice() {
  let newPrice = currentBasePrice;

  // add size fees
  if (currentModifications.size === "medium") newPrice += 0.50;
  else if (currentModifications.size === "large") newPrice += 1.00;

  // add topping fees
  if (currentModifications.toppings && currentModifications.toppings.length > 0) {
    currentModifications.toppings.forEach(topping => {
      if (topping && topping.price) {
        newPrice += parseFloat(topping.price);
      }
    });
  }

  // display / overwrite this new price 
  const priceElement = document.getElementById("modifiedDrinkPrice");
  if (priceElement) {
    priceElement.textContent = `$${newPrice.toFixed(2)}`;
  }
  return newPrice;
}

//-------------------- CART FUNCTIONS --------------------//
// THIS IS THE KEY CHANGE: Save to sessionStorage instead of local cart array
/*document.getElementById("addItemToCart").addEventListener("click", () => {
  if (!currentDrink) return;

  // compute final price using YOUR working calculation
  const finalPrice = calculateModifiedPrice();

  // Get topping names for display (not just IDs)
  const toppingDetails = currentModifications.toppings.map(toppingId => {
    const topping = availableToppings.find(t => String(t.menuid) === String(toppingId));
    return topping ? { id: toppingId, name: topping.itemname, price: topping.itemprice } : null;
  }).filter(t => t !== null);

  // Create cart item with proper structure
  const cartItem = {
    name: currentDrink.itemname,
    price: finalPrice,
    url: currentDrink.itemphoto,
    modifications: {
      size: currentModifications.size,
      sweetness: currentModifications.sweetness,
      ice: currentModifications.ice,
      toppings: toppingDetails // Store full topping info, not just IDs
    }
  };

  // Get existing cart from sessionStorage
  const cartItems = JSON.parse(sessionStorage.getItem("cartItems")) || [];
  
  // Add new item
  cartItems.push(cartItem);
  
  // Save back to sessionStorage
  sessionStorage.setItem("cartItems", JSON.stringify(cartItems));

  console.log("Added to cart:", cartItem);
  alert(`${currentDrink.itemname} added to cart!`);

  // close popup after adding to cart
  closeModificationsPopup();
});*/


//----- get menu items from database using API
function tempName() {
  const menuRows = document.querySelectorAll(".menuRow");
  const category = document.body.dataset.category;

  // load toppings at startup
  loadToppings();

  if (menuRows.length === 0) {
    console.error("No elements with class 'menuRow' found in the DOM.");
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
        menuRow.innerHTML = "";
        const chunk = drinks.slice(startingIndex, startingIndex + 4);
        startingIndex += 4;
        renderDrinks(chunk, menuRow);
      });
    })
    .catch(err => {
      console.error("Error loading drinks:", err);
      menuRows.forEach(menuRow => {
        menuRow.innerHTML = "<p>Failed to load menu items</p>";
      });
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const orderNumber = document.getElementById("orderNumber");

  fetch('/api/orders')
    .then((response) => response.json())
    .then(orders => {
      orders.forEach(orderNum => {
        orderNumber.innerHTML = "Order #" + orderNum.max;
      });
    })
    .catch(err => {
      console.error("Error loading drinks:", err);
    });
});
