let ttsEnabled = JSON.parse(sessionStorage.getItem("ttsEnabled") || "false"); // get tts setting from storage or use default setting

// TODO: add tts for cancel button
// TODO: add tts for add to cart button
// TODO: have the checkout part say the full order
// TODO: add tts to checkout buttons

function checkout() {
  // clear page
  document.getElementById("cartPage").innerHTML = "";

  // total price before tip
  const totalPrice = calculateTotalPrice();
  showPaymentScreen(totalPrice);
  speak("The price is $" + totalPrice);
}

function showPaymentScreen(totalPrice) {
  const checkoutButton = document.getElementById("checkoutButton");
  checkoutButton.style.display = "none";

  document.getElementById("paymentScreen").innerHTML = `
      <button>Card</button>
      <button>Cash</button>
      <input id="tipInputAmount" type="text" placeholder="Enter tip amount">
      <button onclick="addTip()">Add Tip</button>
      <h2 id="totalPriceH2">Total price: $${totalPrice}</h2>
      <a href="cashierCart.html" style="text-decoration: none; color: black;">
          <button>Cancel</button>
      </a>
      <button onclick="showThankYouScreen()">Pay</button>
  `;
}

function showThankYouScreen() {
  // clear sessionStorage 
  sessionStorage.clear();

  document.getElementById("paymentScreen").innerHTML = "";
  document.getElementById("paymentScreen").innerHTML = "<h1>Thank you for visiting!</h1>";
  speak("Thank you for visiting!");
}

function addTip() {
  const tipAmount = Number(document.getElementById("tipInputAmount").value);

  if (isNaN(tipAmount) || tipAmount < 0) {
      alert("Please enter a valid tip amount");
      return;
  }

  const totalPrice = calculateTotalPrice(tipAmount);
  const priceH2 = document.getElementById("totalPriceH2");
  priceH2.textContent = "Total price: $" + totalPrice;
}

function calculateTotalPrice(tipAmount = 0) {
  const cartItems = JSON.parse(sessionStorage.getItem("cartItems")) || [];

  let total = cartItems.reduce((sum, item) => sum + Number(item.price), 0);
  if (tipAmount != 0) {
      total += tipAmount;
  }

  return total.toFixed(2);
}

// tts function
function speak(text) {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch("http://localhost:3000/tts", {
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
        cartDiv.innerHTML = "<p>Your cart is empty.</p>";
        return;
    }

    items.forEach((item, index) => {
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("cartItem");

        // Format modifications properly
        const mods = item.modifications || {};
        let modsText = '';
        
        if (mods.size) {
            modsText += `Size: ${mods.size}<br>`;
        }
        if (mods.sweetness) {
            modsText += `Sweetness: ${mods.sweetness}<br>`;
        }
        if (mods.ice) {
            modsText += `Ice: ${mods.ice}<br>`;
        }
        if (mods.toppings && mods.toppings.length > 0) {
            const toppingNames = mods.toppings.map(t => t.name).join(", ");
            modsText += `Toppings: ${toppingNames}`;
        }

        let plainModsText = modsText.replace(/<br>/g, ", ").replace(/&nbsp;/g, " ").trim();

        // USE modsText here, not the old code!
        itemDiv.innerHTML = `
            <img src="${item.url}" alt="${item.name}" class="cartItemImg">
            <div>
                <h3>${item.name}</h3>
                <p>Price: $${Number(item.price).toFixed(2)}</p>
                <p>${modsText || "No modifications"}</p>
                <button class="removeBtn" data-index="${index}" data-text="Remove ${item.name} with ${plainModsText || "no modifications"}">Remove</button>
            </div>
        `;

        cartDiv.appendChild(itemDiv);
    });
    
    const price = document.createElement("h2");
    price.textContent = "Total price: $" + calculateTotalPrice();
    cartDiv.appendChild(price);

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
});

// load employee name
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("empName").innerHTML = sessionStorage.getItem('currentEmployee');

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
  e.preventDefault(); // stop navigation
  console.log("Raw clicked element:", e.target);
  console.log("Closest .tts-button:", button);
  const text = button.dataset.text;
  console.log("TTS enabled?", ttsEnabled, "Text:", text);

  const url = button.getAttribute("href");

  if (ttsEnabled && text) {
    // e.preventDefault();
    await speak(text);
    if (url) window.location.href = url;
  }
  else if (text) {
    speak(text);
  }
});

// document.getElementById("cartPage").addEventListener("click", async (e) => {
//   e.preventDefault(); // stop navigation
//   console.log("Raw clicked element:", e.target);
//   console.log("Closest .tts-button:", button);
//   const text = button.dataset.text;
//   console.log("TTS enabled?", ttsEnabled, "Text:", text);

//   const url = button.getAttribute("href");

//   if (ttsEnabled && text) {
//     // e.preventDefault();
//     await speak(text);
//     if (url) window.location.href = url;
//   }
//   else if (text) {
//     speak(text);
//   } 
// });




document.querySelectorAll(".tts-button").forEach(button => {
  button.addEventListener("click", async (e) => {
    e.preventDefault(); // stop navigation
    console.log("Raw clicked element:", e.target);
    console.log("Closest .tts-button:", button);
    const text = button.dataset.text;
    console.log("TTS enabled?", ttsEnabled, "Text:", text);

    const url = button.getAttribute("href");

    if (ttsEnabled && text) {
      await speak(text);
      if (url) window.location.href = url;
    }
    else if (text) {
      await speak(text);
    }
  });
});