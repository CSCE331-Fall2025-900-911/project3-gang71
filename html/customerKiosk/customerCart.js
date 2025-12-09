let ttsEnabled = JSON.parse(sessionStorage.getItem("ttsEnabled") || "false");
let preTaxAmount = 0;
let selectedPaymentMethod = null;

// Global variables to track customer points
let customerPoints = 0;
let pointsToEarn = 0;
let orderCostInPoints = 0;

// Variables for drink modifications
let currentDrink = null;
let currentBasePrice = 0;
let currentModifications = {
  size: 'small',
  sweetness: '100%',
  ice: '100%',
  toppings: []
};
let availableToppings = [];
let editingItemIndex = null;

//-------------------- EDIT FEATURE: TOPPING HELPER FUNCTIONS --------------------//
// Load toppings from database
async function loadToppings() {
  try {
    const response = await fetch('/api/menu/Topping');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    availableToppings = await response.json();
  } catch (err) {
    console.error("Error loading toppings:", err);
  }
}

// Populate topping dropdowns
function populateToppingDropdowns() {
  const topping1Select = document.querySelector('select[name="topping1"]');
  const topping2Select = document.querySelector('select[name="topping2"]');
  
  if (!topping1Select || !topping2Select) return;
  
  // Clear existing options except first one
  [topping1Select, topping2Select].forEach(select => {
    while (select.options.length > 1) {
      select.remove(1);
    }
  });
  
  // Sort alphabetically
  availableToppings.sort((a, b) => a.itemname.localeCompare(b.itemname, undefined, { sensitivity: 'base' }));

  // Populate dropdowns
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

//-------------------- EDIT FEATURE: MODIFICATION POPUP --------------------//
// Open popup for editing cart item
function openModificationsPopup(drink, existingModifications = null, itemIndex = null) {
  currentDrink = drink;
  // FIXED: Handle both new drinks (with itemprice) and cart items (with basePrice)
  currentBasePrice = Number(drink.basePrice || drink.itemprice || 0);
  editingItemIndex = itemIndex;
  
  console.log("Opening popup with:", { drink, currentBasePrice, existingModifications });

  const popup = document.getElementById("modificationsPopup");
  if (!popup) return alert("Modifications popup not found.");

  // Load existing modifications or defaults
  currentModifications = existingModifications ? {
    size: existingModifications.size,
    sweetness: existingModifications.sweetness,
    ice: existingModifications.ice,
    // FIXED: Ensure toppings array is properly cloned with all required properties
    toppings: existingModifications.toppings ? existingModifications.toppings.map(t => ({
      id: t.id,
      name: t.name,
      price: parseFloat(t.price) || 0  // Ensure price is a number
    })) : []
  } : {
    size: "small",
    sweetness: "100%",
    ice: "100%",
    toppings: []
  };

  // Fill drink info
  document.getElementById("itemImage").src = drink.itemphoto;
  document.getElementById("itemName").textContent = drink.itemname;
  document.getElementById("itemDescription").textContent = drink.itemdescrip;

  // Populate dropdowns FIRST before trying to set values
  populateToppingDropdowns();

  // Reset all button selections
  document.querySelectorAll(".threeModificationChoices button, .fourModificationChoices button")
    .forEach(btn => btn.classList.remove("selected"));

  // --- SIZE ---
  if (currentModifications.size === "small") document.getElementById("smallDrinkButton").classList.add("selected");
  if (currentModifications.size === "medium") document.getElementById("mediumDrinkButton").classList.add("selected");
  if (currentModifications.size === "large") document.getElementById("largeDrinkButton").classList.add("selected");

  // Pull modification sections (sweetness is #2, ice is #3)
  const modificationDivs = document.querySelectorAll(".modification");

  // --- SWEETNESS ---
  const sweetnessButtons = modificationDivs[1].querySelectorAll(".fourModificationChoices button");
  sweetnessButtons.forEach(btn => {
    if (btn.textContent.trim() === currentModifications.sweetness) {
      btn.classList.add("selected");
    }
  });

  // --- ICE ---
  const iceButtons = modificationDivs[2].querySelectorAll(".fourModificationChoices button");
  iceButtons.forEach(btn => {
    if (btn.textContent.trim() === currentModifications.ice) {
      btn.classList.add("selected");
    }
  });

  // --- TOPPINGS ---
  const toppingSelects = [
    document.querySelector('select[name="topping1"]'),
    document.querySelector('select[name="topping2"]')
  ];

  // Reset selects to default "No Topping" option
  toppingSelects.forEach(sel => sel.selectedIndex = 0);

  // FIXED: Apply existing toppings AFTER dropdowns are populated
  // Use setTimeout to ensure DOM has updated with all options
  if (currentModifications.toppings && currentModifications.toppings.length > 0) {
    setTimeout(() => {
      currentModifications.toppings.forEach((topping, i) => {
        if (toppingSelects[i] && topping.id) {
          // Set the dropdown value to match the topping's menuid
          toppingSelects[i].value = topping.id;
          
          // Log for debugging
          console.log(`Setting topping ${i + 1}: ${topping.name} (ID: ${topping.id})`);
        }
      });
      
      // FIXED: Recalculate price AFTER toppings are set
      calculateModifiedPrice();
    }, 100); // Increased timeout to ensure dropdowns are fully populated
  } else {
    // If no toppings, just calculate base price
    calculateModifiedPrice();
  }

  // --- EVENT HANDLERS ---
  // Size
  document.querySelectorAll(".size-button").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".size-button").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      currentModifications.size = btn.dataset.size;
      calculateModifiedPrice();
    };
  });

  // Sweetness
  sweetnessButtons.forEach(btn => {
    btn.onclick = () => {
      sweetnessButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      currentModifications.sweetness = btn.textContent.trim();
      calculateModifiedPrice();
    };
  });

  // Ice
  iceButtons.forEach(btn => {
    btn.onclick = () => {
      iceButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      currentModifications.ice = btn.textContent.trim();
      calculateModifiedPrice();
    };
  });

  // Toppings - Update currentModifications when user changes selection
  toppingSelects.forEach(select => {
    select.onchange = () => {
      // Get all selected topping IDs (filter out empty values)
      const ids = toppingSelects.map(sel => sel.value).filter(v => v);

      // FIXED: Build toppings array with proper structure
      currentModifications.toppings = ids.map(id => {
        const top = availableToppings.find(t => String(t.menuid) === String(id));
        if (!top) return null;
        
        return {
          id: top.menuid,
          name: top.itemname,
          price: parseFloat(top.itemprice) || 0  // Ensure price is a number
        };
      }).filter(Boolean);  // Remove any null entries

      // Recalculate price whenever toppings change
      calculateModifiedPrice();
    };
  });

  // Update button text based on whether we're editing or adding
  const addButton = document.getElementById("addItemToCart");
  addButton.textContent = editingItemIndex !== null ? "Update Item" : "Add to Cart";
  addButton.onclick = updateCartItem;

  // Show popup
  popup.style.display = "grid";

  // Reset scroll to top
  popup.scrollTop = 0;
}

// Close modification popup
function closeModificationsPopup() {
  const modificationsPopupDiv = document.getElementById("modificationsPopup");
  if (!modificationsPopupDiv) {
    console.error("Modifications popup container not found!");
    return;
  }
  modificationsPopupDiv.style.display = "none";
  editingItemIndex = null;
}

// Calculate modified price
function calculateModifiedPrice() {
  let newPrice = Number(currentBasePrice);

  if (isNaN(newPrice)) {
    console.error("Base price is invalid:", currentBasePrice);
    newPrice = 0;
  }

  // Size upcharge
  if (currentModifications.size === "medium") newPrice += 0.50;
  if (currentModifications.size === "large") newPrice += 1.00;

  // Toppings
  if (Array.isArray(currentModifications.toppings)) {
    currentModifications.toppings.forEach(topping => {
      const toppingPrice = parseFloat(topping.price);
      if (!isNaN(toppingPrice)) newPrice += toppingPrice;
    });
  }

  // Update display
  const priceElement = document.getElementById("modifiedDrinkPrice");
  if (priceElement) {
    priceElement.textContent = `$${newPrice.toFixed(2)}`;
  }

  return newPrice;
}

// NO RELOAD: Update cart item and re-render without page reload
function updateCartItem() {
  let cartItems = JSON.parse(sessionStorage.getItem("cartItems")) || [];
  
  if (!currentDrink) return;

  const finalPrice = calculateModifiedPrice();

  // Preserve quantity if editing an existing item
  const preservedQuantity = (editingItemIndex !== null && cartItems[editingItemIndex]) 
    ? cartItems[editingItemIndex].quantity 
    : 1;

  // FIXED: Ensure toppings are properly structured when saving to cart
  const cartItem = {
    name: currentDrink.itemname,
    basePrice: Number(currentDrink.itemprice ?? currentDrink.basePrice ?? currentBasePrice),
    price: Number(currentDrink.itemprice),
    url: currentDrink.itemphoto,
    quantity: preservedQuantity,
    modifications: {
      size: currentModifications.size,
      sweetness: currentModifications.sweetness,
      ice: currentModifications.ice,
      // FIXED: Ensure each topping has id, name, and price as a number
      toppings: currentModifications.toppings ? currentModifications.toppings.map(t => ({
        id: t.id,
        name: t.name,
        price: parseFloat(t.price) || 0  // Ensure price is stored as a number
      })) : []
    }
  };

  // Update or add the item to cart
  if (editingItemIndex !== null) {
    cartItems[editingItemIndex] = cartItem;
    editingItemIndex = null;  // Reset editing index
  } else {
    cartItems.push(cartItem);
  }

  // Save updated cart to sessionStorage
  sessionStorage.setItem('cartItems', JSON.stringify(cartItems));
  
  // Close the popup
  closeModificationsPopup();
  
  // Re-render the cart to show changes immediately
  renderCartItems();
}

// NO RELOAD: Render cart items without page reload
function renderCartItems() {
  const cartDiv = document.getElementById("cartPage");
  
  let items = JSON.parse(sessionStorage.getItem("cartItems")) || [];

  // Clear cart display
  cartDiv.innerHTML = "";

  if (items.length === 0) {
    cartDiv.innerHTML = "<p data-translate style='margin: 2% 0% 2% 2%; font-size:1.5rem;'>Your cart is empty.</p>";
    const checkoutButton = document.getElementById("checkoutButton");
    checkoutButton.style.display = "none";
    
    // Update totals
    updateCartTotals();
    return;
  }

  // Show checkout button
  const checkoutButton = document.getElementById("checkoutButton");
  if (checkoutButton) checkoutButton.style.display = "block";

  items.forEach((item, index) => {
    // Ensure item has quantity
    if (!item.quantity || isNaN(item.quantity)) {
      item.quantity = 1;
    }

    const itemDiv = document.createElement("div");
    itemDiv.classList.add("cartItem");

    const mods = item.modifications || {};
    let modsText = '';
    
    if (mods.size) {
      modsText += `<span data-translate>Size</span>: ${mods.size}<br>`;
    }
    if (mods.sweetness) {
      modsText += `<span data-translate>Sweetness</span>: ${mods.sweetness}<br>`;
    }
    if (mods.ice) {
      modsText += `<span data-translate>Ice</span>: ${mods.ice}<br>`;
    }
    if (mods.toppings && mods.toppings.length > 0) {
      const toppingNames = mods.toppings.map(t => t.name).join(", ");
      modsText += `<span data-translate>Toppings</span>: ${toppingNames}`;
    }

    let plainModsText = modsText.replace(/<br>/g, ", ").replace(/&nbsp;/g, " ").trim();

    // EDIT & QUANTITY FEATURES: Added edit button and quantity controls
    itemDiv.innerHTML = `
      <div class="cartItemDiv">
        </button>
        <img src="${item.url}" alt="${item.name}" class="cartItemImg">
        <div class="cartItemInfoDiv">
          <h3 data-translate>${item.name}</h3>
          <p><span data-translate>Price</span>: $${Number(item.price).toFixed(2)} each</p>
          <p class="itemMods">${modsText || "<span data-translate>No modifications</span>"}</p>
          
          <div class="quantity-controls" style="display: flex; align-items: center; gap: 5px; margin-top: 10px;">
            <button class="qty-btn minus-btn" style="width: 30px; height: 30px; font-size: 18px; cursor: pointer; background-color: #FFB6C1; border: none; border-radius: 5px; color: white; font-weight: bold;">-</button>
            <span style="font-size: 16px; font-weight: bold; min-width: 30px; text-align: center; background-color: #ffccd3ff; padding: 5px 10px; border-radius: 5px;">${item.quantity}</span>
            <button class="qty-btn plus-btn" style="width: 30px; height: 30px; font-size: 18px; cursor: pointer; background-color: #FFB6C1; border: none; border-radius: 5px; color: white; font-weight: bold;">+</button>
          </div>
          
          <p style="margin-top: 10px; font-weight: bold;"><span data-translate>Total</span>: $${(item.price * item.quantity).toFixed(2)}</p>
        </div>
        
        <span class="material-symbols-outlined removeBtn" data-index="${index}" data-text="Delete ${item.name} with ${plainModsText || "no modifications"}" data-translate style="position: absolute; bottom: 10px; right: 10px; border-radius: 50%; background-color: white; padding: 10px; cursor: pointer; border: 2px solid #f6bbd2;">delete</span>
      </div>
    `;

    cartDiv.appendChild(itemDiv);

    // EDIT FEATURE: Add edit button listener
    /**
    const editBtn = itemDiv.querySelector(".edit-btn");
    editBtn.addEventListener("click", () => {
      openModificationsPopup(
        { 
          itemname: item.name,
          basePrice: Number(item.basePrice),   // <-- use the correct key
          itemphoto: item.url,
          itemdescrip: "" 
        },
        item.modifications,
        index
      );
    });
    **/

    // QUANTITY FEATURE: Add quantity button listeners
    const minusBtn = itemDiv.querySelector(".minus-btn");
    const plusBtn = itemDiv.querySelector(".plus-btn");

    minusBtn.addEventListener("click", () => {
      minusBtn.style.backgroundColor = "#FF69B4";
      setTimeout(() => minusBtn.style.backgroundColor = "#FFB6C1", 150);
      
      if (item.quantity > 1) {
        item.quantity--;
        sessionStorage.setItem('cartItems', JSON.stringify(items));
        renderCartItems(); // NO RELOAD: Re-render instead of reload
      } else {
        if (confirm("Remove this item from cart?")) {
          items.splice(index, 1);
          sessionStorage.setItem('cartItems', JSON.stringify(items));
          renderCartItems(); // NO RELOAD: Re-render instead of reload
        }
      }
    });

    plusBtn.addEventListener("click", () => {
      plusBtn.style.backgroundColor = "#FF69B4";
      setTimeout(() => plusBtn.style.backgroundColor = "#FFB6C1", 150);
      
      item.quantity++;
      sessionStorage.setItem('cartItems', JSON.stringify(items));
      renderCartItems(); // NO RELOAD: Re-render instead of reload
    });

    // Keep remove button functionality
    const removeBtn = itemDiv.querySelector(".removeBtn");
    removeBtn.addEventListener("click", async () => {
      if (ttsEnabled) {
        const drinkMods = plainModsText;
        await speak(`Removing ${item.name} with ${drinkMods}`);
      }

      items.splice(index, 1);
      sessionStorage.setItem("cartItems", JSON.stringify(items));
      renderCartItems(); // NO RELOAD: Re-render instead of reload
    });
  });

  // Update totals
  updateCartTotals();
  
  // Re-translate if in Spanish
  if (typeof pageTranslator !== 'undefined' && pageTranslator.currentLanguage === 'ES') {
    setTimeout(() => pageTranslator.translatePage('ES'), 100);
  }
}

// NO RELOAD: Update cart totals without full re-render
function updateCartTotals() {
  const cartDiv = document.getElementById("cartPage");
  
  // Remove old totals if they exist
  const oldSubtotal = cartDiv.querySelector('#cartSubtotal');
  const oldTax = cartDiv.querySelector('#cartTax');
  const oldPrice = cartDiv.querySelector('#preTipPrice');
  const oldPointsPrice = cartDiv.querySelector('#cartPointsPrice');
  const oldEarnedPoints = cartDiv.querySelector('#cartEarnedPoints');
  
  if (oldSubtotal) oldSubtotal.remove();
  if (oldTax) oldTax.remove();
  if (oldPrice) oldPrice.remove();
  if (oldPointsPrice) oldPointsPrice.remove();
  if (oldEarnedPoints) oldEarnedPoints.remove();
  
  const subtotal = document.createElement("h3");
  subtotal.id = "cartSubtotal";
  let subtotalAmount = calculateSubtotal();
  subtotal.textContent = "Subtotal: $" + subtotalAmount;
  subtotal.style.marginLeft = "2%";
  subtotal.style.fontSize = "1.5rem";
  subtotal.style.marginBottom = "0";
  cartDiv.appendChild(subtotal);

  const tax = document.createElement("h3");
  tax.id = "cartTax";
  let taxAmount = calculateTax(subtotalAmount);
  tax.textContent = "Tax: $" + taxAmount;
  tax.style.marginLeft = "2%";
  tax.style.fontSize = "1.5rem";
  tax.style.marginTop = "1%";
  tax.style.marginBottom = "0";
  cartDiv.appendChild(tax);

  const price = document.createElement("h2");
  price.id = "preTipPrice";
  preTaxAmount = calculateTotalPriceBeforeTip(subtotalAmount, taxAmount);
  price.innerHTML = '<span data-translate>Total price</span>: $' + preTaxAmount;
  price.style.marginLeft = "2%";
  price.style.marginTop = "1%";
  price.style.fontSize= "1.8rem";
  cartDiv.appendChild(price);
  
  orderCostInPoints = convertDollarsToPoints(Number(preTaxAmount));
  const pointsPrice = document.createElement("h3");
  pointsPrice.id = "cartPointsPrice";
  pointsPrice.textContent = `Order cost in points: ${orderCostInPoints} points`;
  pointsPrice.style.marginLeft = "2%";
  pointsPrice.style.marginTop = "1%";
  pointsPrice.style.fontSize = "1.3rem";
  pointsPrice.style.color = "#000000ff";
  cartDiv.appendChild(pointsPrice);
  
  pointsToEarn = calculatePointsToEarn(Number(preTaxAmount));
  const earnedPoints = document.createElement("h3");
  earnedPoints.id = "cartEarnedPoints";
  earnedPoints.textContent = `Points you'll earn: ${pointsToEarn} points`;
  earnedPoints.style.marginLeft = "2%";
  earnedPoints.style.marginTop = "0.5%";
  earnedPoints.style.fontSize = "1.3rem";
  earnedPoints.style.color = "#FFB6C1";
  earnedPoints.style.marginBottom = "1%";
  cartDiv.appendChild(earnedPoints);
}

//----------------------------------- REWARDS SYSTEM -----------------------------------------//
// Function to fetch customer's current points from database
async function fetchCustomerPoints() {
  try {
    const customerName = sessionStorage.getItem('currentCustomer');
    if (!customerName) {
      console.error("No customer name found in session");
      return 0;
    }
    
    const response = await fetch(`/api/customer/points?name=${encodeURIComponent(customerName)}`);
    if (!response.ok) {
      throw new Error("Failed to fetch customer points");
    }
    
    const data = await response.json();
    customerPoints = data.points || 0;
    return customerPoints;
    
  } catch (err) {
    console.error("Error fetching customer points:", err);
    return 0;
  }
}

// Function to calculate points earned from order (25 points per $1 spent)
function calculatePointsToEarn(totalAmount) {
  pointsToEarn = Math.floor(totalAmount) * 25;
  return pointsToEarn;
}

// Function to convert dollars to points (100 points = $1)
function convertDollarsToPoints(dollarAmount) {
  return Math.ceil(dollarAmount * 100);
}

// Function to update customer points in database
async function updateCustomerPoints(pointsChange, action) {
  try {
    const customerName = sessionStorage.getItem('currentCustomer');
    if (!customerName) {
      throw new Error("No customer name found");
    }
    
    const response = await fetch('/api/customer/points', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerName: customerName,
        pointsChange: pointsChange,
        action: action // 'add' or 'subtract'
      })
    });
    
    if (!response.ok) {
      throw new Error("Failed to update points");
    }
    
    const data = await response.json();
    customerPoints = data.newPoints;
    return data.newPoints;
    
  } catch (err) {
    console.error("Error updating points:", err);
    throw err;
  }
}

//------------------------------- PLACE ORDER ----------------------------------------//
async function checkout() {
  // Fetch customer's current points before showing payment screen
  await fetchCustomerPoints();
  
  // clear page
  document.getElementById("cartPage").innerHTML = "";

  // total price before tip
  const totalPrice = Number(preTaxAmount);
  showPaymentScreen(totalPrice);
  if (ttsEnabled) {
    await speak("The current price is $" + totalPrice);

    // TTS for the full order
    const cartItems = JSON.parse(sessionStorage.getItem("cartItems")) || [];
    if (cartItems) {
      speak("The items in your order are: ")

      for (const item of cartItems) { // for of loop because for each loops do not wait for promises
        let toppingString;

        if (item.modifications.toppings[0] == undefined && item.modifications.toppings[1] == undefined) {
          toppingString = "no toppings";
        }
        else if (item.modifications.toppings[0] == undefined && item.modifications.toppings[1]) {
          toppingString = item.modifications.toppings[1].name;
        }
        else if (item.modifications.toppings[0] && item.modifications.toppings[1] == undefined) {
          toppingString = item.modifications.toppings[0].name;
        }
        else {
          toppingString = `${item.modifications.toppings[0].name} and ${item.modifications.toppings[1].name}`;
        }

        orderString = `A $${item.price.toFixed(2)} ${item.modifications.size} ${item.name} 
          with ${item.modifications.sweetness} sweetness, 
          ${item.modifications.ice} ice, 
          and ${toppingString}`;

        await speak(orderString);
      };
    }
    else {
      await speak("Your order is currently empty.")
    }
  }
}

function showPaymentScreen(totalPrice) {
  const checkoutButton = document.getElementById("checkoutButton");
  checkoutButton.style.display = "none";

  // Calculate if customer has enough points to pay
  const hasEnoughPoints = customerPoints >= orderCostInPoints;
  const pointsButtonDisabled = hasEnoughPoints ? '' : 'disabled';
  const pointsButtonStyle = hasEnoughPoints ? '' : 'opacity: 0.5; cursor: not-allowed;';

  // ALIGNMENT FIX: Removed the wrapper divs around buttons to align them with text
  document.getElementById("paymentScreen").innerHTML = `
      <h2 style="margin-left: 2%; margin-top: 2%;">Select Payment Method:</h2>
      
      <button class="ttsButton bannerButtons" data-text="Pay with card" id="cardPaymentBtn" style="margin-left: 2%; margin-top: 1%; margin-right: 10px;" data-translate>Card</button>
      <button class="ttsButton bannerButtons" data-text="Pay with cash" id="cashPaymentBtn" style="margin-right: 10px;" data-translate>Cash</button>
      <button class="ttsButton bannerButtons" data-text="Pay with points" id="pointsPaymentBtn" data-translate ${pointsButtonDisabled} style="${pointsButtonStyle}">
        Points (${orderCostInPoints} pts)
      </button>
      
      <h3 style="margin-left: 2%; margin-top: 2%; color: #f04e66ff;">Your Points Balance: ${customerPoints} points</h3>
      ${!hasEnoughPoints ? `<p style="margin-left: 2%; color: #FFB6C1;">You need ${orderCostInPoints - customerPoints} more points to pay with points.</p>` : ''}
      
      <div style="margin-left: 2%; margin-top: 2%;">
        <input id="tipInputAmount" type="text" placeholder="Enter tip amount" class="ttsButton" data-text="Enter tip amount" data-translate>
        <button onclick="addTip()" class="ttsButton bannerButtons" data-text="Add tip" style="margin-left: 10px;" data-translate>Add Tip</button>
      </div>
      
      <h2 id="totalPriceH2" style="margin-left: 2%; margin-top: 2%;" data-translate>Total price: $${totalPrice}</h2>
      
      <button class="ttsButton bannerButtons" data-text="Pay" onclick="handlePlaceOrder()" style="margin-left: 2%; margin-top: 2%; margin-right: 10px;" data-translate>Pay</button>
      <a href="customerCart.html" style="text-decoration: none; color: black;">
          <button class="ttsButton bannerButtons" data-text="Back to cart" data-translate>Back to cart</button>
      </a>
  `;

  // Add event listener for points payment button
  document.getElementById("pointsPaymentBtn").addEventListener("click", () => {
    if (customerPoints >= orderCostInPoints) {
      selectedPaymentMethod = "points";
      updatePaymentButtonStyles();
    }
  });

  document.getElementById("cardPaymentBtn").addEventListener("click", () => {
    selectedPaymentMethod = "card";
    updatePaymentButtonStyles();
  });

  document.getElementById("cashPaymentBtn").addEventListener("click", () => {
    selectedPaymentMethod = "cash";
    updatePaymentButtonStyles();
  });
}

function showThankYouScreen() {
  // clear sessionStorage 
  sessionStorage.removeItem("cartItems");

  document.getElementById("paymentScreen").innerHTML = "";
  document.getElementById("paymentScreen").innerHTML = "<h1 style='margin-left: 2%; margin-top: 2%;' data-translate>Your order is placed. Thank you for visiting!</h1>";
  if (ttsEnabled) {
    speak("Your order is placed. Thank you for visiting!");
  }
}

function addTip() {
  const tipAmount = Number(document.getElementById("tipInputAmount").value);

  if (isNaN(tipAmount) || tipAmount < 0) {
    alert("Please enter a valid tip amount");
    if (ttsEnabled) {
      speak("Please enter a valid tip amount");
    }
    return;
  }

  const totalPrice = calculateTotalPriceWithTip(preTaxAmount, tipAmount);
  if ((!(isNaN(tipAmount) || tipAmount == 0)) && ttsEnabled) {
    speak("A $" + tipAmount + " is added to the total. The new total is $" + totalPrice);
  }

  const priceH2 = document.getElementById("totalPriceH2");
  priceH2.textContent = "Total price: $" + totalPrice;
}

function calculateSubtotal() {
  const cartItems = JSON.parse(sessionStorage.getItem("cartItems")) || [];
  // QUANTITY FIX: Multiply price by quantity
  let total = cartItems.reduce((sum, item) => {
    const qty = item.quantity || 1;
    return sum + (Number(item.price) * qty);
  }, 0);
  return total.toFixed(2);
}

function calculateTax(subtotal) {
  const taxPercentage = 0.0625;
  let temp = subtotal * taxPercentage
  return temp.toFixed(2);
}

function calculateTotalPriceBeforeTip(subtotal, tax) {
  priceBeforeTip = Number(subtotal) + Number(tax); 
  return priceBeforeTip.toFixed(2);
}

function calculateTotalPriceWithTip(currentTotal, tipAmount = 0) {
  let temp = Number(currentTotal);
  if (tipAmount != 0) {
    temp += Number(tipAmount);
  }

  return temp.toFixed(2);
}

// Handle placing the order
async function handlePlaceOrder() {
  let cartItems = JSON.parse(sessionStorage.getItem("cartItems")) || [];
  
  // Check if cart is empty
  if (cartItems.length === 0) {
    alert("Your cart is empty! Please add items before placing an order.");
    return;
  }

  // Check if payment method is selected
  if (!selectedPaymentMethod) {
    alert("Please select a payment method before placing the order.");
    return;
  }
  
  // If paying with points, check if customer has enough
  if (selectedPaymentMethod === "points") {
    if (customerPoints < orderCostInPoints) {
      alert(`You don't have enough points. You need ${orderCostInPoints} points but only have ${customerPoints}.`);
      return;
    }
  }

  try {
    // Get current order number
    let orderNumber = 0;
    fetch('/api/orders')
    .then((response) => response.json())
    .then(async orders => {
        orders.forEach(orderNum => {
          orderNumber = orderNum.max + 1;
        });
        console.log(orderNumber);

    // Calculate totals
    const subtotal = calculateSubtotal();
    const tax = calculateTax(subtotal);
    const tipAmount = Number(document.getElementById("tipInputAmount").value);
    if (isNaN(tipAmount) || tipAmount < 0) {
      alert("Please enter a valid tip amount");
      if (ttsEnabled) {
        speak("Please enter a valid tip amount");
      }
      return;
    }
    const total = calculateTotalPriceWithTip(calculateTotalPriceBeforeTip(subtotal, tax), tipAmount);

    // Prepare order data for database
    const orderData = {
      orderNumber: orderNumber,
      paymentMethod: selectedPaymentMethod,
      subtotal: subtotal,
      tax: tax,
      tip: tipAmount,
      total: total,
      items: cartItems.map(item => ({
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price,
        modifications: item.modifications
      })),
      timestamp: new Date().toISOString()
    };

    // Send order to database
    const response = await fetch('/api/orders/placeOrder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    if (!response.ok) {
      throw new Error(`Failed to place order: ${response.status}`);
    }

    // Handle points after successful order
    if (selectedPaymentMethod === "points") {
      // Subtract points used for payment
      await updateCustomerPoints(orderCostInPoints, 'subtract');
      alert(`Order placed successfully! You paid with ${orderCostInPoints} points.\nRemaining points: ${customerPoints}`);
    } else {
      // Add points earned from purchase (1 point per dollar spent)
      await updateCustomerPoints(pointsToEarn, 'add');
      alert(`Order placed successfully! You earned ${pointsToEarn} points.\nTotal points: ${customerPoints}`);
    }

    // Success!
    showThankYouScreen();

    // Clear the cart
    sessionStorage.removeItem("cartItems");

    // Reset payment buttons
    selectedPaymentMethod = null;
  })

  } catch (error) {
    console.error("Error placing order:", error);
    alert("Error placing order. Please try again.");
  }
}

function updatePaymentButtonStyles() {
    const cardBtn = document.getElementById("cardPaymentBtn");
    const cashBtn = document.getElementById("cashPaymentBtn");
    const pointsBtn = document.getElementById("pointsPaymentBtn");

    cardBtn.classList.toggle("selected", selectedPaymentMethod === "card");
    cashBtn.classList.toggle("selected", selectedPaymentMethod === "cash");
    pointsBtn.classList.toggle("selected", selectedPaymentMethod === "points");
}

//------------------------------------ LOAD WINDOW / PAGE --------------------------------//
// load window
window.addEventListener("DOMContentLoaded", async () => {
    // load customer name
    document.getElementById("custName").textContent =
        sessionStorage.getItem("currentCustomer");

    // Load toppings for edit popup
    await loadToppings();

    // Load customer points
    await fetchCustomerPoints();

    // Render cart with edit + quantity functionality
    renderCartItems();

    // Apply translations if needed
    if (typeof pageTranslator !== "undefined" &&
        pageTranslator.currentLanguage === "ES") {
        setTimeout(() => pageTranslator.translatePage("ES"), 100);
    }
});

// load page
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("custName").innerHTML = sessionStorage.getItem('currentCustomer');

  const ttsToggle = document.getElementById("ttsToggle");
  if (ttsToggle) {
    ttsToggle.checked = ttsEnabled;
    const ttsButtonText = document.getElementById("ttsLabel");

    if (ttsToggle.checked) {
      ttsButtonText.textContent = "Disable TTS";
    }
    else {
      ttsButtonText.textContent = "Enable TTS";
    }

    ttsToggle.addEventListener("change", async (e) => {
      if (ttsToggle.checked) {
        ttsButtonText.textContent = "Disable TTS";
        await speak("TTS enabled");
      }
      else {
        ttsButtonText.textContent = "Enable TTS";
        await speak("TTS disabled");
      }
      
      ttsEnabled = e.target.checked;
      sessionStorage.setItem("ttsEnabled", JSON.stringify(ttsEnabled));
    });
  }
});

//---------------------------- TEXT-TO-SPEECH -----------------------------------------//
// tts function
function speak(text) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch("/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      if (!response.ok) throw new Error("TTS request failed");

      const arrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([arrayBuffer], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);

      audio.onended = () => {
        resolve(); // resolve when audio finishes
      };

      audio.onerror = (err) => {
        reject(err); // reject on error
      };

      audio.play();
    } catch (err) {
      console.error("Error during TTS:", err);
      resolve(); // resolve anyway so navigation doesn't break
    }
  });
}

// Connect visible TTS button to hidden checkbox
document.addEventListener("DOMContentLoaded", () => {
    const ttsButton = document.getElementById("ttsButton");
    const ttsToggle = document.getElementById("ttsToggle");
    const ttsLabel = document.getElementById("ttsLabel") || ttsButton; 
    // If no separate label text, the button text is updated directly

    if (ttsButton && ttsToggle) {

        // Set initial state on page load
        ttsToggle.checked = ttsEnabled;
        ttsButton.textContent = ttsEnabled ? "Disable TTS" : "Enable TTS";

        // FIX: Make clicking the button toggle the checkbox manually
        ttsButton.addEventListener("click", async () => {
            ttsToggle.checked = !ttsToggle.checked;  // manually flip the switch

            ttsEnabled = ttsToggle.checked;          // update global
            sessionStorage.setItem("ttsEnabled", JSON.stringify(ttsEnabled));

            // Update visible text
            ttsButton.textContent = ttsEnabled ? "Disable TTS" : "Enable TTS";

            // Announce change
            if (ttsEnabled) {
                await speak("TTS enabled");
            } else {
                await speak("TTS disabled");
            }
        });
    }

    // Keep existing listener for internal logic (leave this as-is)
    if (ttsToggle) {
        ttsToggle.addEventListener("change", async (e) => {
            // Do nothing here. The button controls the toggle now.
        });
    }
});

document.getElementById("paymentScreen").addEventListener("click", async (e) => {
  const button = e.target.closest(".ttsButton");
  if (!ttsEnabled) {
    return;
  }

  e.preventDefault(); // stop navigation
  console.log("Raw clicked element:", e.target);
  console.log("Closest .ttsButton:", button);
  const textToSpeak = button.dataset.text;
  if (textToSpeak == null) {
    return;
  }

  await speak(textToSpeak);

  const link = e.target.closest("a");
  console.log(link);
  const url = link ? link.getAttribute("href") : null;
  console.log(url);
  if (url) {
    console.log("here");
    window.location.href = url;
  }
});

//----------------------------- LOGOUT -----------------------------------//
// Handle logout
function handleLogout() {
  // Clear session storage
  sessionStorage.removeItem("currentEmployee");
  sessionStorage.removeItem("cartItems");
  // Redirect to logout endpoint which will clear server session
  window.location.href = '/api/logout';
}