let ttsEnabled = JSON.parse(sessionStorage.getItem("ttsEnabled") || "false"); // get tts setting from storage or use default setting
let preTaxAmount = 0;

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
      <button class="ttsButton" data-text="Pay with card">Card</button>
      <button class="ttsButton" data-text="Pay with cash">Cash</button>
      <input id="tipInputAmount" type="text" placeholder="Enter tip amount" class="ttsButton" data-text="Enter tip amount">
      <button onclick="addTip()" class="ttsButton" data-text="Add tip">Add Tip</button>
      <h2 id="totalPriceH2">Total price: $${totalPrice}</h2>
      <a href="customerCart.html" style="text-decoration: none; color: black;">
          <button class="ttsButton" data-text="Back to cart">Back to cart</button>
      </a>
      <button onclick="showThankYouScreen()" class="ttsButton" data-text="Pay">Pay</button>
  `;
}

function showThankYouScreen() {
  // clear sessionStorage 
  sessionStorage.clear();

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
        cartDiv.innerHTML = "<p data-translate>Your cart is empty.</p>";
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
    cartDiv.appendChild(subtotal);

    const tax = document.createElement("h3");
    let taxAmount = calculateTax(subtotalAmount);
    tax.textContent = "Tax: $" + taxAmount;
    tax.style.marginLeft = "2%";
    tax.style.fontSize = "1.5rem";
    cartDiv.appendChild(tax);

    const price = document.createElement("h2");
    price.id = "preTipPrice";
    preTaxAmount = calculateTotalPriceBeforeTip(subtotalAmount, taxAmount);
    price.textContent = "Total price: $" + preTaxAmount;
    price.style.marginLeft = "2%";
    price.innerHTML = '<span data-translate>Total price</span>: $' + calculateTotalPrice();
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

    ttsToggle.addEventListener("change", async (e) => {
      if (ttsToggle.checked) {
        await speak("TSS enabled");
      }
      else {
        await speak("TSS disabled");
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