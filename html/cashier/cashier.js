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
let cartItems = []; // Store cart items in memory
let editingItemIndex = null; // Track if we're editing an existing item

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

  // put in drink info
  const itemImage = document.getElementById("itemImage");
  const itemName = document.getElementById("itemName");
  const itemDescription = document.getElementById("itemDescription");
  
  if (itemImage) itemImage.src = drink.itemphoto;
  if (itemName) itemName.textContent = drink.itemname;
  if (itemDescription) itemDescription.textContent = drink.itemdescrip;
  
  // populate drop menus FIRST before setting topping values
  populateToppingDropdowns();

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
  
  // Get topping selects - DECLARE ONCE HERE
  const toppingSelectElements = document.querySelectorAll('select[name="topping1"], select[name="topping2"]');
  
  // Set toppings AFTER dropdowns are populated
  toppingSelectElements.forEach(sel => sel.selectedIndex = 0); // Reset first
  
  if (existingModifications && existingModifications.toppings && existingModifications.toppings.length > 0) {
    existingModifications.toppings.forEach((topping, index) => {
      if (toppingSelectElements[index]) {
        // Set by menuid/id
        toppingSelectElements[index].value = topping.id;
      }
    });
  }

  // Calculate and display price
  calculateModifiedPrice();

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
  toppingSelectElements.forEach(select => {
    select.onchange = () => {
      // Get topping IDs from selects and convert to full details
      const toppingIds = Array.from(toppingSelectElements)
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

  // Update the Add to Cart button text if editing
  const addButton = document.getElementById("addItemToCart");
  if (addButton) {
    addButton.textContent = editingItemIndex !== null ? "Update Item" : "Add to Cart";
  }

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
    editingItemIndex = null; // Reset editing index
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
// Add item to cart (or update existing item)
document.getElementById("addItemToCart").addEventListener("click", () => {
  if (!currentDrink) return;

  // compute final price
  const finalPrice = calculateModifiedPrice();

  // Preserve quantity if editing, otherwise start at 1
  const preservedQuantity = (editingItemIndex !== null && cartItems[editingItemIndex]) 
    ? cartItems[editingItemIndex].quantity 
    : 1;

  // Create cart item with proper structure
  const cartItem = {
    name: currentDrink.itemname,
    basePrice: currentBasePrice,
    price: finalPrice,
    url: currentDrink.itemphoto,
    quantity: preservedQuantity,
    modifications: {
      size: currentModifications.size,
      sweetness: currentModifications.sweetness,
      ice: currentModifications.ice,
      toppings: currentModifications.toppings ? [...currentModifications.toppings] : []
    }
  };

  // If editing existing item, update it
  if (editingItemIndex !== null) {
    cartItems[editingItemIndex] = cartItem;
    editingItemIndex = null;
  } else {
    // Add new item
    cartItems.push(cartItem);
  }

  // Update cart display
  renderCart();

  // close popup after adding to cart
  closeModificationsPopup();
});

// Render the cart in the sidebar
function renderCart() {
  const basket = document.querySelector(".basket");
  if (!basket) return;

  // Clear existing items
  basket.innerHTML = "";

  // If cart is empty, show a message
  if (cartItems.length === 0) {
    basket.innerHTML = "<p style='text-align: center; color: #666; padding: 20px;'>Cart is empty</p>";
    updateCartTotals();
    return;
  }

  // Render each cart item
  cartItems.forEach((item, index) => {
    const basketItem = document.createElement("div");
    basketItem.classList.add("basketItem");

    // Build toppings display
    let toppingsText = "";
    if (item.modifications.toppings && item.modifications.toppings.length > 0) {
      toppingsText = "<p style='margin: 2px 0;'>Toppings: " + item.modifications.toppings.map(t => t.name).join(", ") + "</p>";
    }

    basketItem.innerHTML = `
      <button class="edit-btn"><span class="material-icons-sharp">edit</span></button>
      <div style="display: flex; gap: 15px; align-items: flex-start; margin: 10px 0;">
        <img src="${item.url}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; flex-shrink: 0;">
        <div style="flex: 1;">
          <h2 style="margin: 0 0 5px 0;">${item.name}</h2>
          <p style="margin: 2px 0;">Size: ${item.modifications.size.charAt(0).toUpperCase() + item.modifications.size.slice(1)}</p>
          <p style="margin: 2px 0;">Ice Level: ${item.modifications.ice}</p>
          <p style="margin: 2px 0;">Sugar Level: ${item.modifications.sweetness}</p>
          ${toppingsText}
        </div>
      </div>
      <div class="quantity-controls" style="display: flex; align-items: center; gap: 5px; justify-content: center; margin: 10px 0;">
        <button class="qty-btn minus-btn" style="width: 35px; height: 35px; font-size: 20px; cursor: pointer; background-color: #FFB6C1; border: none; border-radius: 5px; color: white; font-weight: bold; transition: background-color 0.2s;">-</button>
        <span style="font-size: 18px; font-weight: bold; min-width: 40px; text-align: center; background-color: #FFF0F5; padding: 5px 10px; border-radius: 5px;">${item.quantity}</span>
        <button class="qty-btn plus-btn" style="width: 35px; height: 35px; font-size: 20px; cursor: pointer; background-color: #FFB6C1; border: none; border-radius: 5px; color: white; font-weight: bold; transition: background-color 0.2s;">+</button>
      </div>
      <h3>$${(item.price * item.quantity).toFixed(2)}</h3>
    `;

    basket.appendChild(basketItem);

    // Add event listener for edit button
    const editBtn = basketItem.querySelector(".edit-btn");
    editBtn.addEventListener("click", () => {
      openModificationsPopup(
        { 
          itemname: item.name, 
          itemprice: item.basePrice, 
          itemphoto: item.url,
          itemdescrip: "" 
        },
        item.modifications,
        index
      );
    });

    // Add event listeners for quantity buttons
    const minusBtn = basketItem.querySelector(".minus-btn");
    const plusBtn = basketItem.querySelector(".plus-btn");
    const qtyDisplay = basketItem.querySelector(".quantity-controls span");

    minusBtn.addEventListener("click", () => {
      // Add visual feedback
      minusBtn.style.backgroundColor = "#FF69B4";
      setTimeout(() => minusBtn.style.backgroundColor = "#FFB6C1", 150);
      
      if (item.quantity > 1) {
        item.quantity--;
        qtyDisplay.textContent = item.quantity;
        basketItem.querySelector("h3").textContent = `$${(item.price * item.quantity).toFixed(2)}`;
        updateCartTotals();
      } else {
        // Remove item if quantity would be 0
        if (confirm("Remove this item from cart?")) {
          cartItems.splice(index, 1);
          renderCart();
        }
      }
    });

    plusBtn.addEventListener("click", () => {
      // Add visual feedback
      plusBtn.style.backgroundColor = "#FF69B4";
      setTimeout(() => plusBtn.style.backgroundColor = "#FFB6C1", 150);
      
      item.quantity++;
      qtyDisplay.textContent = item.quantity;
      basketItem.querySelector("h3").textContent = `$${(item.price * item.quantity).toFixed(2)}`;
      updateCartTotals();
    });
  });

  // Update totals
  updateCartTotals();
}

// Update cart totals (subtotal, tax, total)
function updateCartTotals() {
  const priceDiv = document.querySelector(".price");
  if (!priceDiv) return;

  // Calculate subtotal
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Calculate tax (assuming 8.25% - adjust as needed)
  const taxRate = 0.0825;
  const tax = subtotal * taxRate;
  
  // Calculate total
  const total = subtotal + tax;

  // Update the display
  const pTags = priceDiv.querySelectorAll("p");
  if (pTags.length >= 3) {
    pTags[0].textContent = `$${subtotal.toFixed(2)}`;
    pTags[1].textContent = `$${tax.toFixed(2)}`;
    pTags[2].textContent = `$${total.toFixed(2)}`;
  }
}

// Initialize cart on page load
document.addEventListener("DOMContentLoaded", () => {
  renderCart();
});