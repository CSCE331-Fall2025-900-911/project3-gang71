let ttsEnabled = JSON.parse(sessionStorage.getItem("ttsEnabled") || "false"); // get tts setting from storage or use default setting

// TODO: add tts for cancel button
// TODO: add tts for add to cart button

function checkout() {
  // clear page
  document.getElementById("cartPage").innerHTML = "";

  // total price before tip
  const totalPrice = calculateTotalPrice();
  showPaymentScreen(totalPrice);
  if (ttsEnabled) {
    speak("The current price is $" + totalPrice);
  }
}

function showPaymentScreen(totalPrice) {
  const checkoutButton = document.getElementById("checkoutButton");
  checkoutButton.style.display = "none";

  document.getElementById("paymentScreen").innerHTML = `
      <button class="ttsButton" data-text="Pay with card">Card</button>
      <button class="ttsButton" data-text="Pay with cash">Cash</button>
      <input id="tipInputAmount" type="text" placeholder="Enter tip amount" class="ttsButton" data-text="Enter tip amount">
      <button onclick="addTip()" class="ttsButton" data-text="Add tip">Add Tip</button>
      <h2 id="totalPriceH2">Total price: $${totalPrice}</h2>
      <a href="cashierCart.html" style="text-decoration: none; color: black;">
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

  const totalPrice = calculateTotalPrice(tipAmount);
  if ((!(isNaN(tipAmount) || tipAmount == 0)) && ttsEnabled) {
    speak("A $" + tipAmount + " is added to the total. The new total is $" + totalPrice);
  }

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
      console.log(link);
      const url = link ? link.getAttribute("href") : null;
      console.log(url);
      if (url) {
        console.log("here");
        window.location.href = url;
      }
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