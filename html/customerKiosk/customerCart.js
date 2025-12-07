let ttsEnabled = JSON.parse(sessionStorage.getItem("ttsEnabled") || "false"); // get tts setting from storage or use default setting
let preTaxAmount = 0;
let selectedPaymentMethod = null;

// Global variables to track customer points
let customerPoints = 0;
let pointsToEarn = 0;
let orderCostInPoints = 0;

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

// Function to calculate points earned from order (5 point per $1 spent)
function calculatePointsToEarn(totalAmount) {
  pointsToEarn = Math.floor(totalAmount) * 25; // nvm 25 points per dollar, rounded down -- 5 is too low
  return pointsToEarn;
}

// Function to convert dollars to points (100 points = $1)
function convertDollarsToPoints(dollarAmount) {
  return Math.ceil(dollarAmount * 100); // 100 points = $1
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
      
      <button class="ttsButton bannerButtons" data-text="Pay with card" id="cardPaymentBtn" style="margin-left: 2%; margin-top: 1%; margin-right: 10px;">Card</button>
      <button class="ttsButton bannerButtons" data-text="Pay with cash" id="cashPaymentBtn" style="margin-right: 10px;">Cash</button>
      <button class="ttsButton bannerButtons" data-text="Pay with points" id="pointsPaymentBtn" ${pointsButtonDisabled} style="${pointsButtonStyle}">
        Points (${orderCostInPoints} pts)
      </button>
      
      <h3 style="margin-left: 2%; margin-top: 2%; color: #de0aa9ff;">Your Points Balance: ${customerPoints} points</h3>
      ${!hasEnoughPoints ? `<p style="margin-left: 2%; color: #f689dbff;">You need ${orderCostInPoints - customerPoints} more points to pay with points.</p>` : ''}
      
      <div style="margin-left: 2%; margin-top: 2%;">
        <input id="tipInputAmount" type="text" placeholder="Enter tip amount" class="ttsButton" data-text="Enter tip amount">
        <button onclick="addTip()" class="ttsButton bannerButtons" data-text="Add tip" style="margin-left: 10px;">Add Tip</button>
      </div>
      
      <h2 id="totalPriceH2" style="margin-left: 2%; margin-top: 2%;">Total price: $${totalPrice}</h2>
      
      <button class="ttsButton bannerButtons" data-text="Pay" onclick="handlePlaceOrder()" style="margin-left: 2%; margin-top: 2%; margin-right: 10px;">Pay</button>
      <a href="customerCart.html" style="text-decoration: none; color: black;">
          <button class="ttsButton bannerButtons" data-text="Back to cart">Back to cart</button>
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
    console.log("made it here");
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
  document.getElementById("paymentScreen").innerHTML = "<h1 style='margin-left: 2%; margin-top: 2%;'>Your order is placed. Thank you for visiting!</h1>";
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
  let total = cartItems.reduce((sum, item) => sum + Number(item.price), 0);
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

window.addEventListener("DOMContentLoaded", async () => {
    // Fetch customer points when page loads
    await fetchCustomerPoints();
    
    const cartDiv = document.getElementById("cartPage");

    let items = JSON.parse(sessionStorage.getItem("cartItems")) || [];

    if (items.length === 0) {
        cartDiv.innerHTML = "<p data-translate style='margin: 2% 0% 2% 2%; font-size:1.5rem;'>Your cart is empty.</p>";
        const checkoutButton = document.getElementById("checkoutButton");
        checkoutButton.style.display = "none";
        return;
    }

    items.forEach((item, index) => {
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("cartItem");

        // Format modifications properly
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

        // USE modsText here, not the old code!
        itemDiv.innerHTML = `
          <div class="cartItemDiv">
            <img src="${item.url}" alt="${item.name}" class="cartItemImg">
            <div class="cartItemInfoDiv">
              <h3 data-translate>${item.name}</h3>
              <p><span data-translate>Price</span>: $${Number(item.price).toFixed(2)}</p>
              <p class="itemMods">${modsText || "<span data-translate>No modifications</span>"}</p>
            </div>
            
            <span class="material-symbols-outlined removeBtn" data-index="${index}" data-text="Delete ${item.name} with ${plainModsText || "no modifications"}" data-translate>delete</span>
          <div>
        `;
        console.log(item.url);

        cartDiv.appendChild(itemDiv);
    });
    
    const subtotal = document.createElement("h3");
    let subtotalAmount = calculateSubtotal();
    subtotal.textContent = "Subtotal: $" + subtotalAmount;
    subtotal.style.marginLeft = "2%";
    subtotal.style.fontSize = "1.5rem";
    subtotal.style.marginBottom = "0";
    cartDiv.appendChild(subtotal);

    const tax = document.createElement("h3");
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
    price.textContent = "Total price: $" + preTaxAmount;
    price.style.marginLeft = "2%";
    price.style.marginTop = "1%";
    price.style.fontSize= "1.8rem";
    price.innerHTML = '<span data-translate>Total price</span>: $' + preTaxAmount;
    cartDiv.appendChild(price);
    
    // Display order cost in points (100 points = $1)
    orderCostInPoints = convertDollarsToPoints(Number(preTaxAmount));
    const pointsPrice = document.createElement("h3");
    pointsPrice.textContent = `Order cost in points: ${orderCostInPoints} points`;
    pointsPrice.style.marginLeft = "2%";
    pointsPrice.style.marginTop = "1%";
    pointsPrice.style.fontSize = "1.3rem";
    pointsPrice.style.color = "#000000ff";
    cartDiv.appendChild(pointsPrice);
    
    // Display points that will be earned from this order (5 points per $1)
    pointsToEarn = calculatePointsToEarn(Number(preTaxAmount));
    const earnedPoints = document.createElement("h3");
    earnedPoints.textContent = `Points you'll earn: ${pointsToEarn} points`;
    earnedPoints.style.marginLeft = "2%";
    earnedPoints.style.marginTop = "0.5%";
    earnedPoints.style.fontSize = "1.3rem";
    earnedPoints.style.color = "#ee81efff";
    earnedPoints.style.marginBottom = "1%";
    cartDiv.appendChild(earnedPoints);
    
    // Re-translate cart after rendering
    if (pageTranslator.currentLanguage === 'ES') {
      setTimeout(() => pageTranslator.translatePage('ES'), 100);
    }

    document.querySelectorAll(".removeBtn").forEach(btn => {
        btn.addEventListener("click", async e => {
          const index = e.currentTarget.dataset.index;
          const item = items[index];

          // Play TTS if enabled
          if (ttsEnabled) {
            const drinkMods = e.currentTarget.dataset.text;
            await speak(`Removing ${item.name} with ${drinkMods}`);
          }

          items.splice(index, 1);
          sessionStorage.setItem("cartItems", JSON.stringify(items));
          location.reload(); // re-render cart
        });
    });

  document.querySelectorAll(".ttsButton").forEach(btn => {
    btn.addEventListener("click", async e => {
      if (!ttsEnabled) {
        return;
      }

      e.preventDefault();

      const textToSpeak = btn.dataset.text;
      if (textToSpeak == null) {
        return;
      }
      await speak(textToSpeak);

      const link = e.target.closest("a");
      const url = link ? link.getAttribute("href") : null;
      if (url) {
        console.log("here");
        window.location.href = url;
      }
    });
  });
});

// load employee name
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

    cartItems.forEach(item => {
      console.log(item.modifications);
    });

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
        quantity: 1,
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

// Handle logout
function handleLogout() {
  // Clear session storage
  sessionStorage.removeItem("currentEmployee");
  sessionStorage.removeItem("cartItems");
  // Redirect to logout endpoint which will clear server session
  window.location.href = '/api/logout';
}