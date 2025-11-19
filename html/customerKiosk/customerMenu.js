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
let ttsEnabled = JSON.parse(sessionStorage.getItem("ttsEnabled") || "false"); // get tts setting from storage or use default setting


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
//----- dynamically displays menu drinks, and gives each drink a add to order buttoon that triggers a popup
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
        <button class="menuItemButton" data-id="${drink.menuid}" data-text="Opened modifications popup for ${drink.itemname}.">Customize</button>
      </div>
    `;
    menuRow.appendChild(itemDiv);

    // event listeners
    const addDrinkToOrderButton = itemDiv.querySelector(".menuItemButton");
    addDrinkToOrderButton.addEventListener("click", async e => {
      openModificationsPopup(drink);

      if (ttsEnabled) {
        const drinkNameText = e.currentTarget.dataset.text;
        speak(drinkNameText);
      }
    });
  }); 
}

//----- shows the pop up that allows the customer to make modifications to their drink before adding to the cart
function openModificationsPopup(drink) {
  currentDrink = drink;
  currentBasePrice = Number(drink.itemprice);

  // reset modifications UI (size, sweetness, ice, toppings)
  document.getElementById("smallDrinkButton").dataset.selected = "false";
  document.getElementById("mediumDrinkButton").dataset.selected = "false";
  document.getElementById("largeDrinkButton").dataset.selected = "false";
  document.querySelectorAll(".threeModificationChoices button, .fourModificationChoices button").forEach(btn => btn.classList.remove("selected"));
  document.querySelectorAll("select").forEach(sel => sel.selectedIndex = 0);
  // reset modification values in code
  currentModifications = {
    size: 'small',
    sweetness: '100%',
    ice: '100%',
    toppings: []
  };

  // put in drink info
  document.getElementById("itemImage").src = drink.itemphoto;
  document.getElementById("itemName").textContent = drink.itemname;
  document.getElementById("itemDescription").textContent = drink.itemdescrip;
  document.getElementById("modifiedDrinkPrice").textContent = `$${currentBasePrice.toFixed(2)}`;

  // add tts text for drink size
  document.getElementById("smallDrinkButton").classList.add("ttsButton");
  document.getElementById("smallDrinkButton").dataset.text = "Small drink size selected.";
  document.getElementById("mediumDrinkButton").classList.add("ttsButton");
  document.getElementById("mediumDrinkButton").dataset.text = "Medium drink size selected. The extra cost is $0.50.";
  document.getElementById("largeDrinkButton").classList.add("ttsButton");
  document.getElementById("largeDrinkButton").dataset.text = "Large drink size selected. The extra cost is $1.00.";

  // populate drop menus
  populateToppingDropdowns();

  // add event listeners for modifications to recalc order price 
  const sizeButtons = document.querySelectorAll(".size-button");
  sizeButtons.forEach(btn => {
    btn.onclick = () => {
      // clear selection visuals
      sizeButtons.forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      currentModifications.size = btn.dataset.size;
      calculateModifiedPrice(); 

      if (ttsEnabled) {
        const cupSizeText = btn.dataset.text;
        speak(cupSizeText);
      }
    };
  });

  // add topping listeners
  const toppingSelects = document.querySelectorAll('select[name="topping1"], select[name="topping2"]');
  toppingSelects.forEach(select => {
    select.onchange = async () => {
      // store only currently selected toppings
      currentModifications.toppings = Array.from(toppingSelects)
        .map(sel => sel.value)
        .filter(v => v);
      calculateModifiedPrice();

      if (ttsEnabled) {
        const newValue = select.value; // only capture the new value
        const topping = availableToppings.find(t => String(t.menuid) === String(newValue)); // get topping for TTS

        if (topping) {
          const toppingText = "Topping selected: " + topping.itemname + ". The extra cost is $" + topping.itemprice;
          await speak(toppingText);
        }
      }
    };
  });

  // add sweetness listeners
  document.querySelectorAll('.modification:nth-of-type(3) .fourModificationChoices button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modification:nth-of-type(3) .fourModificationChoices button')
        .forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentModifications.sweetness = btn.textContent.trim();

      if (ttsEnabled) {
        const sweetnessText = btn.textContent.trim() + " sweetness selected";
        speak(sweetnessText);
      }
    };
  });

  // add ice listeners 
  document.querySelectorAll('.modification:nth-of-type(4) .fourModificationChoices button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modification:nth-of-type(4) .fourModificationChoices button')
        .forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      currentModifications.ice = btn.textContent.trim();

      if (ttsEnabled) {
        const iceText = btn.textContent.trim() + " ice selected";
        speak(iceText);
      }
    };
  });

  // show popup
  document.getElementById("modificationsPopup").style.display = "block";
}

//----- closes popup and resets buttons 
async function closeModificationsPopup() {
    const modificationsPopupDiv = document.getElementById("modificationsPopup");
    if (!modificationsPopupDiv) {
        console.error("Modifications popup container not found!");
        return;
    }
    if (ttsEnabled) {
      await speak("Closing modifications popup");
    }
    modificationsPopupDiv.style.display = "none";
}

async function closeModificationsPopupNav() {
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

  // just do a single re-calc instead of running sum
  if (currentModifications.size === "medium") newPrice += 0.50;
  else if (currentModifications.size === "large") newPrice += 1.00;

  // add topping fees
  currentModifications.toppings.forEach(toppingId => {
    const topping = availableToppings.find(t => String(t.menuid) === String(toppingId));
    if (topping) newPrice += parseFloat(topping.itemprice);
  });

  // display / overwrite this new price 
  document.getElementById("modifiedDrinkPrice").textContent = `$${newPrice.toFixed(2)}`;
  return newPrice;
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

//-------------------- CART FUNCTIONS --------------------//
// THIS IS THE KEY CHANGE: Save to sessionStorage instead of local cart array
document.getElementById("addItemToCart").addEventListener("click", async () => {
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
  if (ttsEnabled) {
    await speak(`${currentDrink.itemname} added to cart!`);
  }
  alert(`${currentDrink.itemname} added to cart!`);

  // close popup after adding to cart
  closeModificationsPopupNav(); // nav function reduces TTS if navigating to cart
});


//----- get menu items from database using API
document.addEventListener("DOMContentLoaded", () => {
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

document.querySelectorAll(".ttsButton").forEach(button => {
  button.addEventListener("click", async (e) => {
    if (!ttsEnabled) {
      return;
    }
    e.preventDefault(); // stop navigation
    console.log("Raw clicked element:", e.target);
    console.log("Closest .ttsButton:", button);
    const text = button.dataset.text;
    if (text == null) {
      return;
    }
    console.log("TTS enabled?", ttsEnabled, "Text:", text);

    const url = button.getAttribute("href");

    if (ttsEnabled && text) {
      await speak(text);
      if (url) {
        window.location.href = url;
      }
    }
  });
});

// Initialize language based on stored preference
document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('languageToggle');
  if (toggle && pageTranslator.getCurrentLanguage() === 'es') {
    toggle.checked = true;
  }
});

function toggleLanguage(checkbox) {
  if (checkbox.checked) {
    pageTranslator.switchLanguage('es');
  } else {
    pageTranslator.switchLanguage('en');
  }
}