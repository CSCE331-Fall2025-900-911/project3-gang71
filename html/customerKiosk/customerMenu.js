// global variables to store / keep track of drink modifications
let currentDrink = null;
let currentBasePrice = 0;
let currentModifications = {
  size: 'small',
  temperature: 'iced',
  sweetness: '100%',
  ice: '100%',
  toppings: []
};
let availableToppings = [];
let ttsEnabled = JSON.parse(sessionStorage.getItem("ttsEnabled") || "false");

//-------------------- TRANSLATION HELPER FOR ALERTS --------------------//
// Translate alert text using the pageTranslator
async function alertTranslated(englishText) {
  let textToShow = englishText;
  
  if (typeof pageTranslator !== 'undefined' && pageTranslator.currentLanguage === 'ES') {
    // Get cached translation
    textToShow = await pageTranslator.translate(englishText, 'ES');
  }
  
  alert(textToShow);
}

//-------------------- TOPPING HELPER FUNCTIONS --------------------//
//----- get toppings from the database //
async function loadToppings() {
  try {
    const response = await fetch('/api/menu/Topping');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    availableToppings = await response.json();
    populateToppingButtons();
  } catch (err) {
    console.error("Error loading toppings:", err);
  }
}

//----- display toppings as selectable buttons instead of dropdowns //
function populateToppingButtons() {
  const toppingContainer = document.getElementById('toppingButtonContainer');
  
  // Clear existing buttons
  toppingContainer.innerHTML = '';
  
  // Sort toppings alphabetically for better UX
  availableToppings.sort((a, b) => a.itemname.localeCompare(b.itemname, undefined, { sensitivity: 'base' }));
  
  // Create a button for each topping
  availableToppings.forEach(topping => {
    const button = document.createElement('button');
    button.className = 'topping-btn';
    button.dataset.toppingId = topping.menuid;
    button.dataset.toppingName = topping.itemname;
    button.dataset.toppingPrice = topping.itemprice;
    button.dataset.translate = '';
    button.textContent = `${topping.itemname} (+${Number(topping.itemprice).toFixed(2)})`;
    
    // Click handler to toggle selection
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      const isSelected = button.classList.contains('selected');
      
      if (isSelected) {
        // Deselect topping
        button.classList.remove('selected');
        const index = currentModifications.toppings.findIndex(t => t.id === topping.menuid.toString());
        if (index > -1) {
          currentModifications.toppings.splice(index, 1);
        }
        
        if (ttsEnabled) {
          await speak(`${topping.itemname} removed`);
        }
      } else {
        // Select topping
        button.classList.add('selected');
        currentModifications.toppings.push({
          id: topping.menuid.toString(),
          name: topping.itemname,
          price: topping.itemprice
        });
        
        if (ttsEnabled) {
          await speak(`${topping.itemname} added. The extra cost is $${topping.itemprice}`);
        }
      }
      
      updateSelectAllButton();
      calculateModifiedPrice();
    });
    
    toppingContainer.appendChild(button);
  });
  
  // Setup Select All button
  setupSelectAllButton();
  
  // Don't translate here - let the page-level translation handle it
}

// Setup the Select All button functionality
function setupSelectAllButton() {
  const selectAllBtn = document.getElementById('selectAllToppingsBtn');
  if (!selectAllBtn) return;
  
  selectAllBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const allToppingButtons = document.querySelectorAll('.topping-btn');
    const allSelected = Array.from(allToppingButtons).every(btn => btn.classList.contains('selected'));
    
    if (allSelected) {
      // Deselect all
      allToppingButtons.forEach(btn => btn.classList.remove('selected'));
      currentModifications.toppings = [];
      
      if (ttsEnabled) {
        await speak('All toppings deselected');
      }
    } else {
      // Select all
      allToppingButtons.forEach(btn => {
        if (!btn.classList.contains('selected')) {
          btn.classList.add('selected');
          const toppingId = btn.dataset.toppingId;
          const toppingName = btn.dataset.toppingName;
          const toppingPrice = btn.dataset.toppingPrice;
          
          // Add to modifications if not already there
          if (!currentModifications.toppings.find(t => t.id === toppingId)) {
            currentModifications.toppings.push({
              id: toppingId,
              name: toppingName,
              price: toppingPrice
            });
          }
        }
      });
      
      if (ttsEnabled) {
        await speak('All toppings selected the extra cost is $' + availableToppings.reduce((sum, t) => sum + Number(t.itemprice), 0).toFixed(2));
      }
    }
    
    updateSelectAllButton();
    calculateModifiedPrice();
  });
}

// Update Select All button text based on current state
function updateSelectAllButton() {
  const selectAllBtn = document.getElementById('selectAllToppingsBtn');
  if (!selectAllBtn) return;
  
  const allToppingButtons = document.querySelectorAll('.topping-btn');
  const allSelected = Array.from(allToppingButtons).every(btn => btn.classList.contains('selected'));
  
  if (allSelected) {
    selectAllBtn.textContent = 'Deselect All';
    selectAllBtn.classList.add('all-selected');
  } else {
    selectAllBtn.textContent = 'Select All';
    selectAllBtn.classList.remove('all-selected');
  }
}

//-------------------- MENU + DRINK FUNCTIONS --------------------//
//----- dynamically displays menu drinks, and gives each drink a add to order button that triggers a popup
function renderDrinks(drinks, menuRow) {
  drinks.forEach(drink => {
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("menuItem");

    itemDiv.innerHTML = `
      <img src="${drink.itemphoto}" alt="Image of ${drink.itemname}" class="menuItemImg">
      <h2 class="menuItemH2" data-translate>${drink.itemname}</h2>
      <p class="menuItemP" style="font-size: 1.07rem; margin-bottom: 25px" data-translate>${drink.itemdescrip}</p>
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 50px";>
        <p class="menuItemH1" style="font-size: 2rem;">$${Number(drink.itemprice).toFixed(2)}</p>
        <button class="menuItemButton" style="font-size: 1.1rem; margin-left: -30px;" data-id="${drink.menuid}" data-text="Opened modifications popup for ${drink.itemname}." data-translate>Customize</button>
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
  // Don't translate here - let the page-level translation handle it
}

// ensure that drinkCategoryPanel length goes all the way down the page
function adjustSidebarHeight() {
  const categories = document.querySelector('.drinkCategoryPanel');
  const menuRows = document.querySelectorAll('.menuRow');
  const menuHeader = document.querySelector('.menuHeader');

  if (!categories || !menuHeader || menuRows.length === 0) {
    console.log('Elements not ready yet');
    return;
  }

  void categories.offsetHeight;

  let totalHeight = menuHeader.offsetHeight;
  
  menuRows.forEach((row, i) => {
    totalHeight += row.offsetHeight;
  });

  let extraRoom = 30;
  totalHeight += extraRoom;
  
  const difference = totalHeight - categories.offsetHeight;
  if (difference > 0) {
    const oldSpacer = categories.querySelector('.sidebar-spacer');
    if (oldSpacer) oldSpacer.remove();
    
    const spacer = document.createElement('div');
    spacer.className = 'sidebar-spacer';
    spacer.style.height = difference + 'px';
    categories.appendChild(spacer);
  }
}

window.addEventListener('load', () => {
  setTimeout(adjustSidebarHeight, 1000);
});

//----- shows the pop up that allows the customer to make modifications to their drink before adding to the cart
function openModificationsPopup(drink, existingModifications = null) {
  currentDrink = drink;
  currentBasePrice = Number(drink.itemprice);

  // reset modifications UI
  document.getElementById("smallDrinkButton").dataset.selected = "false";
  document.getElementById("mediumDrinkButton").dataset.selected = "false";
  document.getElementById("largeDrinkButton").dataset.selected = "false";
  document.querySelectorAll(".threeModificationChoices button, .fourModificationChoices button").forEach(btn => btn.classList.remove("selected"));
  
  // Reset topping buttons
  document.querySelectorAll('.topping-btn').forEach(btn => btn.classList.remove('selected'));

  // If editing existing item, load its modifications
  if (existingModifications) {
    currentModifications = {
      size: existingModifications.size,
      temperature: existingModifications.temperature,
      sweetness: existingModifications.sweetness,
      ice: existingModifications.ice,
      toppings: existingModifications.toppings ? [...existingModifications.toppings] : []
    };
  } else {
    // reset modification values for new item
    currentModifications = {
      size: 'small',
      temperature: 'iced',
      sweetness: '100%',
      ice: '100%',
      toppings: []
    };
  }

  // put in drink info
  document.getElementById("itemImage").src = drink.itemphoto;
  document.getElementById("itemImage").textContent = drink.itemname;
  document.getElementById("itemName").textContent = drink.itemname;
  document.getElementById("itemDescription").textContent = drink.itemdescrip;
  document.getElementById("modifiedDrinkPrice").textContent = `Total: $${currentBasePrice.toFixed(2)}`;

  // add tts text for drink size
  document.getElementById("smallDrinkButton").classList.add("ttsButton");
  document.getElementById("smallDrinkButton").dataset.text = "Small drink size selected.";
  document.getElementById("mediumDrinkButton").classList.add("ttsButton");
  document.getElementById("mediumDrinkButton").dataset.text = "Medium drink size selected. The extra cost is $0.50.";
  document.getElementById("largeDrinkButton").classList.add("ttsButton");
  document.getElementById("largeDrinkButton").dataset.text = "Large drink size selected. The extra cost is $1.00.";

  // Set size button based on current modifications
  const smallBtn = document.getElementById("smallDrinkButton");
  const mediumBtn = document.getElementById("mediumDrinkButton");
  const largeBtn = document.getElementById("largeDrinkButton");
  
  if (currentModifications.size === 'small' && smallBtn) smallBtn.classList.add("selected");
  else if (currentModifications.size === 'medium' && mediumBtn) mediumBtn.classList.add("selected");
  else if (currentModifications.size === 'large' && largeBtn) largeBtn.classList.add("selected");

  // Set temperature button
  const icedBtn = document.getElementById("icedButton");
  const hotBtn = document.getElementById("hotButton");

  if (currentModifications.temperature === 'iced' && icedBtn) icedBtn.classList.add("selected");
  else if (currentModifications.temperature === 'hot' && hotBtn) hotBtn.classList.add("selected");

  // Set sweetness button
  const sweetnessButtons = document.querySelectorAll('.modification:nth-of-type(4) .fourModificationChoices button');
  sweetnessButtons.forEach(btn => {
    if (btn.textContent.trim() === currentModifications.sweetness) {
      btn.classList.add("selected");
    }
  });
  
  // Set ice button
  const iceButtons = document.querySelectorAll('.modification:nth-of-type(5) .fourModificationChoices button');
  iceButtons.forEach(btn => {
    if (btn.textContent.trim() === currentModifications.ice) {
      btn.classList.add("selected");
    }
  });

  // Set previously selected toppings
  if (existingModifications && existingModifications.toppings && existingModifications.toppings.length > 0) {
    existingModifications.toppings.forEach(topping => {
      const toppingBtn = document.querySelector(`[data-topping-id="${topping.id}"]`);
      if (toppingBtn) {
        toppingBtn.classList.add('selected');
      }
    });
  }
  
  // Update Select All button state
  updateSelectAllButton();

  // Calculate and display price
  calculateModifiedPrice();

  // add event listeners for size modifications
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

  // add temperature listeners
  const tempButtons = [icedBtn, hotBtn];
  tempButtons.forEach(btn => {
    if (!btn) return;

      btn.onclick = () => {
          tempButtons.forEach(b => b.classList.remove("selected"));
          btn.classList.add("selected");
          currentModifications.temperature = btn.dataset.temp;
          if (ttsEnabled) {
            speak(`${btn.dataset.temp} temperature selected`);
          }
      };
  });

  
  // add topping listeners
  // move these to only the topping population area because toppingselected doesn't exist anymore (since that was for the dropdown container)

  // add sweetness listeners
  document.querySelectorAll('.modification:nth-of-type(4) .fourModificationChoices button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modification:nth-of-type(4) .fourModificationChoices button')
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
  document.querySelectorAll('.modification:nth-of-type(5) .fourModificationChoices button').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.modification:nth-of-type(5) .fourModificationChoices button')
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
  //document.getElementById("modificationsPopup").style.display = "block";
  const popup = document.getElementById("modificationsPopup");
  popup.style.display = "block";

  const firstFocusable = popup.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  firstFocusable?.focus();
  popup.dataset.removeFocusTrap = trapFocus(popup);
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

  if (modificationsPopupDiv._removeFocusTrap) {
    modificationsPopupDiv._removeFocusTrap();
    delete modificationsPopupDiv._removeFocusTrap;
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

  // Add size fees
  if (currentModifications.size === "medium") newPrice += 0.50;
  else if (currentModifications.size === "large") newPrice += 1.00;

  // Add topping fees (all selected toppings)
  if (currentModifications.toppings && currentModifications.toppings.length > 0) {
    currentModifications.toppings.forEach(topping => {
      if (topping && topping.price) {
        newPrice += parseFloat(topping.price);
      }
    });
  }

  // Display the new price 
  const priceElement = document.getElementById("modifiedDrinkPrice");
  if (priceElement) {
    priceElement.textContent = `$${newPrice.toFixed(2)}`;
  }
  return newPrice;
}

function trapFocus(popup) {
  const focusableElements = popup.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstEl = focusableElements[0];
  const lastEl = focusableElements[focusableElements.length - 1];

  function handleTab(e) {
    if (e.key === "Tab") {
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    }
    if (e.key === "Escape") {
      closeModificationsPopup();
    }
  }
  popup.addEventListener("keydown", handleTab);
  return () => popup.removeEventListener("keydown", handleTab);
}

//-------------------- CART FUNCTIONS --------------------//
// Add to cart - stores ALL selected toppings in sessionStorage
document.getElementById("addItemToCart").addEventListener("click", async () => {
  if (!currentDrink) return;

  // compute final price using YOUR working calculation
  const finalPrice = calculateModifiedPrice();

  // Create cart item with ALL selected toppings (not just first 2)
  const cartItem = {
    name: currentDrink.itemname,
    price: finalPrice,
    url: currentDrink.itemphoto,
    modifications: {
      size: currentModifications.size,
      temperature: currentModifications.temperature,
      sweetness: currentModifications.sweetness,
      ice: currentModifications.ice,
      toppings: [...currentModifications.toppings] // Store all toppings
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
  
  // Show appropriate message based on topping count
  let message = `${currentDrink.itemname} added to cart!`;
  // if (currentModifications.toppings.length > 2) {
  //   message += `\n\nNote: You selected ${currentModifications.toppings.length} toppings. All will be shown in cart, but only the first 2 will be processed in the final order due to system limitations.`;
  // }
  
  alertTranslated(message);

  closeModificationsPopupNav();
});

//-------------------------------- LOAD PAGE -----------------------------------//
//----- get menu items from database using API and other setup tasks
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("custName").innerHTML = sessionStorage.getItem('currentCustomer');
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
      
      // If page should start in Spanish, translate all content
      // Increased delay to ensure DOM is fully settled
      if (pageTranslator && pageTranslator.currentLanguage === 'ES') {
        setTimeout(() => pageTranslator.translatePage('ES'), 300);
      }
    })
    .catch(err => {
      console.error("Error loading drinks:", err);
      menuRows.forEach(menuRow => {
        menuRow.innerHTML = "<p>Failed to load menu items</p>";
      });
    });

  // TTS toggle setup
  const ttsToggle = document.getElementById("ttsToggle");
  const ttsButtonText = document.getElementById("ttsLabel");

  if (ttsToggle) {
    // make sure it's focusable
    ttsToggle.tabIndex = 0;

    // handle Enter/Space key toggling
    ttsToggle.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        ttsToggle.checked = !ttsToggle.checked;
        const event = new Event("change");
        ttsToggle.dispatchEvent(event);
      }
    });

    // existing change handler
    ttsToggle.addEventListener("change", async (e) => {
      if (ttsToggle.checked) {
        ttsButtonText.textContent = "Disable TTS";
        await speak("TTS enabled");
      } else {
        ttsButtonText.textContent = "Enable TTS";
        await speak("TTS disabled");
      }
      ttsEnabled = ttsToggle.checked;
      sessionStorage.setItem("ttsEnabled", JSON.stringify(ttsEnabled));
    });
  }

  getWeather();

  document.querySelectorAll('.categoryLink').forEach(link => {
    link.addEventListener('click', function (e) {
      setTimeout(() => {
        const logoutButton = document.getElementById("logoutButton"); 
        if (logoutButton) logoutButton.focus();
      }, 50);
    });
  });
});


//----------------------------- TEXT-TO-SPEECH ---------------------------------//
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
        resolve();
      };

      audio.onerror = (err) => {
        reject(err);
      };

      audio.play();
    } catch (err) {
      console.error("Error during TTS:", err);
      resolve();
    }
  });
}

document.querySelectorAll(".ttsButton").forEach(button => {
  button.addEventListener("click", async (e) => {
    if (!ttsEnabled) {
      return;
    }
    e.preventDefault();
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

const ttsButton = document.getElementById("ttsButton");
const ttsToggle = document.getElementById("ttsToggle");

ttsButton.addEventListener("click", async () => {
  ttsToggle.checked = !ttsToggle.checked;
  ttsButton.textContent = ttsToggle.checked ? "Disable TTS" : "Enable TTS";
  ttsEnabled = ttsToggle.checked;
  sessionStorage.setItem("ttsEnabled", JSON.stringify(ttsEnabled));
  await speak(ttsToggle.checked ? "TTS enabled" : "TTS disabled");
});

//-------------------------------- WEATHER --------------------------------//
async function getWeather() {
  const res = await fetch('/weather');
  const data = await res.json();

  if (data.cod === 200) {
    const resultDiv = document.getElementById('weather');
    const weatherMain = data.weather[0].main;
    let icon = 'partly_cloudy_day';

    switch (weatherMain) {
      case 'Clear':
        icon = 'sunny';
        break;
      case 'Clouds':
        icon = 'cloud';
        break;
      case 'Rain':
        icon = 'rainy';
        break;
      case 'Drizzle':
        icon = 'rainy';
        break;
      case 'Thunderstorm':
        icon = 'thunderstorm';
        break;
      case 'Snow':
        icon = 'cloudy_snowing';
        break;
      case 'Mist':
        icon = 'rainy';
        break;
      case 'Fog':
        icon = 'foggy';
        break;
      case 'Haze':
        icon = 'foggy';
        break;
      default:
        icon = 'partly_cloudy_day';
    }

  resultDiv.innerHTML = `
  <span class="weatherLocation"
        style="font-size: 1.5rem; font-weight: bold; display: block; margin-bottom: 15px;">
        <span data-translate>Location:</span> ${data.name}
  </span>

  <div class="weatherRow" style="display: flex; gap: 20px; align-items: center;">
    <div class="weatherColumn" style="flex-shrink: 0;">
      <i class="material-symbols-outlined"
         style="font-size: 60px; color: #d56087ff;"
         alt="${weatherMain}">
         ${icon}
      </i>
    </div>

    <div class="weatherColumn" style="flex: 1;">
      <p style="font-size: 1.3rem; margin: 8px 0; font-weight: 500;">
        <span data-translate>Temperature:</span>
        <span class="dynamic" style="font-weight: bold; color: #d56087ff;">
          ${data.main.temp}°F
        </span>
      </p>

      <p style="font-size: 1.3rem; margin: 8px 0; font-weight: 500;">
        <span data-translate>Feels like:</span>
        <span class="dynamic" style="font-weight: bold; color: #d56087ff;">
          ${data.main.feels_like}°F
        </span>
      </p>

      <p style="font-size: 1.3rem; margin: 8px 0; font-weight: 500;">
        <span data-translate>Wind:</span>
        <span class="dynamic" style="font-weight: bold; color: #d56087ff;">
          ${data.wind.speed} m/s
        </span>
      </p>
    </div>
  </div>
`;
  }

  
  let category = getWeatherCategory(data.main.feels_like);
  getDrinkRec(category);
}

function getWeatherCategory(feelsLikeTemp) {
  if (feelsLikeTemp >= 85) return "hot";
  if (feelsLikeTemp >= 70) return "warm";
  if (feelsLikeTemp >= 55) return "cool";
  if (feelsLikeTemp >= 40) return "cold";
  return "cold";
}

//------------------------------ DRINK RECOMMENDATION ------------------------------//
function fetchDrinkOptions(weather) {
  const keywordMap = {
    "hot": ["Slush", "Coconut", "Winter Melon", "Green Tea", "Delight", "Snow", "Mania", "Flurry", "Breeze", "Bliss", "Yogurt"],
    "warm": ["Rose", "Lavender", "Taro", "Strawberry", "Honeydew", "Mango", "Rosehip", "Peach", "Lemonade", "Longan", "Passion Fruit", "Lychee", "Dragonfruit", "Pineapple", "Grapefruit", "Punch", "Guava", "Orange"],
    "neutral": ["Milk Tea", "Thai", "Oolong", "Latte", "Mocha", "Black Tea", "Cappuccino", "Macchiato", "Matcha", "Honey", "Almond", "Coffee"],
    "cool": ["Pumpkin", "Caramel", "Apple", "Chai", "Cocoa", "Mocha"],
    "cold": ["Hot", "Pistachio", "Brown Sugar", "Chai", "Cocoa"]
  }

  let keywords = keywordMap[weather];

  const promises = keywords.map(keyword =>
    fetch(`/api/menu?search=${encodeURIComponent(keyword)}`)
      .then(res => res.json())
      .then(data => {
        if (!data || data.length === 0) {
          return { drinks: [], categories: [] };
        }

        const excludedCategories = ['Topping', 'Modification'];
        const filteredData = data.filter(drink => 
          !excludedCategories.includes(drink.itemcategory)
        );

        let drink = filteredData.map(drink => drink.itemname);
        let category = filteredData.map(drink => drink.itemcategory);
        return { drink, category };
      })
      .catch(err => {
        console.error("Error fetching drink recommendation options:", err);
        return { drinks: [], categories: [] };
      })
  );

  // return promise to show that all keywords were processes
  return Promise.all(promises).then(results => results.flat());
}

function selectRandomDrinks(result, count = 2) {
  let allDrinks = [];
  let allCategories = [];
  
  result.forEach(r => {
    if (r.drink && r.category) {
      r.drink.forEach((drink, index) => {
        allDrinks.push(drink);
        allCategories.push(r.category[index]);
      });
    }
  });

  let indices = [];
  while (indices.length < count) {
    let randomIndex = Math.floor(Math.random() * allDrinks.length);
    if (!indices.includes(randomIndex)) {
      indices.push(randomIndex);
    }
  }

  let drinks = indices.map(i => allDrinks[i]);
  let categories = indices.map(i => allCategories[i]);  
  return { drinks, categories };
}

async function getDrinkRec(weatherCategory) {
  const storedDrinks = sessionStorage.getItem('drinkRecommendations');
 
  let randomResult;
  if (storedDrinks) {
    randomResult = JSON.parse(storedDrinks);
  } else {
    const result = await fetchDrinkOptions(weatherCategory);
    randomResult = selectRandomDrinks(result);
    // store for other pages
    sessionStorage.setItem('drinkRecommendations', JSON.stringify(randomResult));
  }
  
  // add to HTML page
  const drinkRecSectionElement = document.getElementById("drinkRecSectionDiv");
  if (drinkRecSectionElement) {
    drinkRecSectionElement.innerHTML = `
      <p style="font-size: 1.5rem; font-weight: bold; display: block; margin-bottom: 15px;" id="drinkRecTitle" data-translate>Based on the weather, we recommend:<p>
      <ul style="list-style-type: none;" class="drinksList">
        <li><p style="font-size: 1.3rem; margin: 8px 0; font-weight: 500;" data-translate>${randomResult.drinks[0]} (${randomResult.categories[0]})</p></li>
        <li><p style="font-size: 1.3rem; margin: 8px 0; font-weight: 500;" data-translate>${randomResult.drinks[1]} (${randomResult.categories[1]})</p></li>
      </ul>
    `;
  }
}

//--------------------------- LOGOUT --------------------------//
// Handle logout
function handleLogout() {
  // Clear session storage
  sessionStorage.removeItem("currentEmployee");
  sessionStorage.removeItem("cartItems");
  // Redirect to logout endpoint which will clear server session
  window.location.href = '/api/logout';
}