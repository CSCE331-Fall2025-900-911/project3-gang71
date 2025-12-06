let ttsEnabled = JSON.parse(sessionStorage.getItem("ttsEnabled") || "false"); // get tts setting from storage or use default setting
let preTaxAmount = 0;
let selectedPaymentMethod = null;

async function checkout() {
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
  checkoutButton.style.marginLeft = "1.212rem";

  document.getElementById("paymentScreen").innerHTML = `
      <button class="ttsButton bannerButtons" data-text="Pay with card" id="cardPaymentBtn">Card</button>
      <button class="ttsButton bannerButtons" data-text="Pay with cash" id="cashPaymentBtn">Cash</button>
      <input id="tipInputAmount" type="text" placeholder="Enter tip amount" class="ttsButton" data-text="Enter tip amount">
      <button onclick="addTip()" class="ttsButton bannerButtons" data-text="Add tip">Add Tip</button>
      <h2 id="totalPriceH2">Total price: $${totalPrice}</h2>
      <a href="customerCart.html" style="text-decoration: none; color: black;">
          <button class="ttsButton bannerButtons" data-text="Back to cart">Back to cart</button>
      </a>
      <button onclick="handlePlaceOrder()" class="ttsButton bannerButtons" data-text="Pay">Pay</button>
  `;

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
  document.getElementById("paymentScreen").innerHTML = "<h1>Your order is placed. Thank you for visiting!</h1>";
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

window.addEventListener("DOMContentLoaded", () => {
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
    //const currentOrderText = orderNumElement ? orderNumElement.textContent : "Order #1";
    //const currentOrderNum = parseInt(currentOrderText.replace("Order #", "")) || 1;

    // Calculate totals
    const subtotal = calculateSubtotal();
    //const taxRate = 0.0825;
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

    // Success!
    //alert(`Thank you! Order #${currentOrderNum} placed successfully!\n\nPayment Method: ${selectedPaymentMethod.toUpperCase()}\nTotal: ${total.toFixed(2)}`);
    showThankYouScreen();

    // Clear the cart
    sessionStorage.removeItem("cartItems");

    // Reset payment buttons
    selectedPaymentMethod = null;
    //updatePaymentButtonStyles();
  })

  } catch (error) {
    console.error("Error placing order:", error);
    alert("Error placing order. Please try again.");
  }
}

function updatePaymentButtonStyles() {
    const cardBtn = document.getElementById("cardPaymentBtn");
    const cashBtn = document.getElementById("cashPaymentBtn");

    cardBtn.classList.toggle("selected", selectedPaymentMethod === "card");
    cashBtn.classList.toggle("selected", selectedPaymentMethod === "cash");
}

// Handle logout
function handleLogout() {
  // Clear session storage
  sessionStorage.removeItem("currentEmployee");
  sessionStorage.removeItem("cartItems");
  // Redirect to logout endpoint which will clear server session
  window.location.href = '/api/logout';
}