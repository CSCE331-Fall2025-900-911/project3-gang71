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
let ttsEnabled = JSON.parse(sessionStorage.getItem("ttsEnabled") || "false"); // get tts setting from storage or use default setting


//-------------------- TOPPING HELPER FUNCTIONS --------------------//
//----- get toppings from the databse //
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

//----- display toppings in each of the drop down menus //
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
  
  // Re-translate toppings if already in Spanish mode
  if (pageTranslator && pageTranslator.currentLanguage === 'ES') {
    setTimeout(() => pageTranslator.translatePage('ES'), 50);
  }
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
async function updateSelectAllButton() {
  const selectAllBtn = document.getElementById('selectAllToppingsBtn');
  if (!selectAllBtn) return;
  
  const allToppingButtons = document.querySelectorAll('.topping-btn');
  const allSelected = Array.from(allToppingButtons).every(btn => btn.classList.contains('selected'));
  
  if (allSelected) {
    // selectAllBtn.textContent = 'Deselect All';
    // selectAllBtn.classList.add('all-selected');
    let buttonText = 'Deselect All';
    // Translate if in Spanish
    if (typeof pageTranslator !== 'undefined' && pageTranslator.currentLanguage.toUpperCase() === 'ES') {
      buttonText = await pageTranslator.translate(buttonText, 'ES');
    }
    selectAllBtn.textContent = buttonText;
    selectAllBtn.classList.add('all-selected');
  } else {
    // selectAllBtn.textContent = 'Select All';
    // selectAllBtn.classList.remove('all-selected');
    let buttonText = 'Select All';
    // Translate if in Spanish
    if (typeof pageTranslator !== 'undefined' && pageTranslator.currentLanguage.toUpperCase() === 'ES') {
      buttonText = await pageTranslator.translate(buttonText, 'ES');
    }
    selectAllBtn.textContent = buttonText;
    selectAllBtn.classList.remove('all-selected');
  }
}

//-------------------- MENU + DRINK FUNCTIONS --------------------//

// shows the pop up that allows the customer to make modifications to their drink before adding to the cart
function openModificationsPopup(drink, existingModifications = null) {
  currentDrink = drink;
  currentBasePrice = Number(drink.itemprice);

  // reset modifications UI (size, sweetness, ice, toppings)
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
  const sweetnessButtons = document.querySelectorAll('.modification:nth-of-type(5) .fourModificationChoices button');
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

  // just do a single re-calc instead of running sum
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
document.getElementById("addItemToCart").addEventListener("click", async () => {
  if (!currentDrink) return;

  // compute final price using YOUR working calculation
  const finalPrice = calculateModifiedPrice();

  // Create cart item with proper structure
  const cartItem = {
    name: currentDrink.itemname,
    price: finalPrice,
    url: currentDrink.itemphoto,
    modifications: {
      size: currentModifications.size,
      temperature: currentModifications.temperature,
      sweetness: currentModifications.sweetness,
      ice: currentModifications.ice,
      toppings: currentModifications.toppings // Store full topping info, not just IDs
    }
  };

  // Get existing cart from sessionStorage
  const cartItems = JSON.parse(sessionStorage.getItem("cartItems")) || [];

  // Add new item
  cartItems.push(cartItem);

  // Save back to sessionStorage
  sessionStorage.setItem("cartItems", JSON.stringify(cartItems));

  if (ttsEnabled) {
    await speak(`${currentDrink.itemname} added to cart!`);
  }
  alert(`${currentDrink.itemname} added to cart!`);

  // close popup after adding to cart
  closeModificationsPopupNav(); // nav function reduces TTS if navigating to cart
});

//-------------------------- LOAD PAGE ---------------------------------//
//----- get menu items from database using API
document.addEventListener("DOMContentLoaded", () => {
  // load toppings at startup
  loadToppings();

  // load employee name
  document.getElementById("custName").innerHTML = sessionStorage.getItem('currentCustomer');
  
  // set up text-to-speech
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
  reorderDrinks();

  document.querySelectorAll('.categoryLink').forEach(link => {
    link.addEventListener('click', function (e) {
      setTimeout(() => {
        const logoutButton = document.getElementById("logoutButton"); 
        if (logoutButton) logoutButton.focus();
      }, 50);
    });
  });
});

window.addEventListener('load', () => {
  const categories = document.querySelector('.drinkCategoryPanel');
  let currentHeight = categories.offsetHeight;

  // full height - current = paddingBottom
  categories.style.paddingBottom = document.documentElement.scrollHeight + 'px';
});

//--------------------------- TEXT-TO-SPEECH --------------------------------//
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

document.querySelectorAll(".ttsButton").forEach(button => {
  button.addEventListener("click", async (e) => {
    if (!ttsEnabled) {
      return;
    }
    e.preventDefault(); // stop navigation
    const text = button.dataset.text;
    if (text == null) {
      return;
    }

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

//------------------------------- WEATHER API --------------------------------//
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
  getDrinkRec(category); // get drink recommendations based on weather category
}

function getWeatherCategory(feelsLikeTemp) {
  if (feelsLikeTemp >= 85) return "hot";
  if (feelsLikeTemp >= 70) return "warm";
  if (feelsLikeTemp >= 55) return "cool";
  if (feelsLikeTemp >= 40) return "cold";
  return "cold"; // below 40°F
}

//----------------------------- DRINK RECOMMENDATIONS -----------------------------//

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
        console.log("No drinks found for " + keyword);
        return { drinks: [], categories: [] };
      }

      // filter out unwanted categories
      const excludedCategories = ['Topping', 'Modification'];
      const filteredData = data.filter(drink => 
        !excludedCategories.includes(drink.itemcategory)
      );

      if (filteredData.length === 0) {
        console.log("No valid drinks found for " + keyword);
      }

      // extract names and categories
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

function selectRandomDrinks(result, count = 2) { // default 2 drink recs
  // flatten
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

  // get 2 random indices
  let indices = [];
  while (indices.length < count) {
    let randomIndex = Math.floor(Math.random() * allDrinks.length);
    if (!indices.includes(randomIndex)) { // no duplicate recs
      indices.push(randomIndex);
    }
  }

  // extract drinks and categories using the same indices
  let drinks = indices.map(i => allDrinks[i]);
  let categories = indices.map(i => allCategories[i]);  
  return { drinks, categories };
}

async function getDrinkRec(weatherCategory) {
  const storedDrinks = sessionStorage.getItem('drinkRecommendations');
 
  let randomResult;
  if (storedDrinks) {
    randomResult = JSON.parse(storedDrinks); // use existing recommendations

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

//------------------------------------ DRINK REORDER --------------------------------------//
async function reorderDrinks() {
  // retrieve all drinks ordered by current customer in order of most recent
  fetch(`/api/reorder?name=${sessionStorage.getItem('currentCustomer')}`)
  .then(res => res.json())
  .then(async (data) => {
    if (!data || data.length === 0) {
      displayReorder([]);
      return;
    }

    data.forEach(async (drink) => {   
      fetch(`/api/reorder/drinkToppings?drinkID=${drink.drinkid}`)
      .then(res => res.json())
      .then((topping) => {
        allToppings = []
        if (topping && topping.length > 0) {
          topping.forEach(top => {
            const curTopping = [top.toppingid].map(toppingId => {
              const topping = availableToppings.find(t => String(t.menuid) === String(toppingId));
              return topping ? { id: toppingId, name: topping.itemname, price: topping.itemprice } : null;
            }).filter(t => t !== null);
            allToppings.push(curTopping[0]);
          });
        }
            
      // constructs drink with necessary info for later
      const reorderDrink = {
        name: drink.itemname,
        menuid: drink.menuid,
        date: drink.orderdate,
        photo: drink.itemphoto,
        price: drink.totaldrinkprice,
        modifications: {
          cup: drink.cupsize,
          temperature: drink.temperature,
          sugar: drink.sugarlevel,
          ice: drink.iceamount,
          toppings: allToppings
        }
      };
      displayDrink(reorderDrink);
      });
    });
  })
  .catch(err => {
    console.error("Error loading reorder:", err);
  });
}

// adds reorder drink to HTML
async function displayDrink(item) {
  // accessing HTML element for where reorder recommendations will display
  const reorderDiv = document.getElementById("reorderDiv");

  // adding each drink recommendation to HTML
  const drinkDiv = document.createElement("div");
  drinkDiv.classList.add("menuItem");

  // Format modifications properly
  const mods = item.modifications || {};
  let modsText = '';

  // gets the name of the base drink based on its menuID
  const drinkSize = await fetch(`/api/namebyid?id=${mods.cup}`);
  const cup = await drinkSize.json();
  const name = `<span data-translate>${cup[0].itemname.split(' ')[0]}</span>`;
  modsText += `<span data-translate>Size</span>: ${name}<br>`;

  const drinkTemp = await fetch(`/api/namebyid?id=${mods.temperature}`);
  const temp = await drinkTemp.json();
  const temperature = `<span data-translate>${temp[0].itemname}</span>`;
  modsText += `<span data-translate>Temperature</span>: ${temperature}<br>`;

  // translates sugar, ice, and toppings to their names based on their IDs
  const drinkSugar = await fetch(`/api/namebyid?id=${mods.sugar}`);
  const sugar = await drinkSugar.json();
  let sugarAmount = sugar[0].itemname.split(' ')[0];
  modsText += `<span data-translate>Sweetness</span>: ${sugarAmount}<br>`;

  const drinkIce = await fetch(`/api/namebyid?id=${mods.ice}`);
  const ice = await drinkIce.json();
  let iceAmount = "";
  if(ice[0].itemname.split(' ')[0] === "No") { iceAmount = "0%"; }
    else if(ice[0].itemname.split(' ')[0] === "Less") { iceAmount = "50%"; }
    else if(ice[0].itemname.split(' ')[0] === "Regular") { iceAmount = "100%"; }
    else { iceAmount = "120%"; }
    modsText += `<span data-translate>Ice</span>: ${iceAmount}<br>`;

    if (mods.toppings && mods.toppings.length > 0) {
      const toppingNames = mods.toppings.map(t => `<span data-translate>${t.name}</span>`).join(", ");
      modsText += `<span data-translate>Toppings</span>: ${toppingNames}<br>`;
    }
    else {
      modsText += `<span data-translate>Toppings</span>: <span data-translate>None</span><br>`;
    }
    modsText += `<span data-translate>Last Ordered</span>: ${item.date.substring(0,10)}`;

  let plainModsText = modsText.replace(/<br>/g, ", ").replace(/&nbsp;/g, " ").trim();

    // adds HTML with drinks
    drinkDiv.innerHTML = `
    <img src="${item.photo}" alt="${item.name}" class="menuItemImg">
    <h2 class = "menuItemH2" data-translate>${item.name}</h2>
    <p class="menuItemP" style="font-size: 1.07rem; margin-bottom: 25px" >${modsText || "No modifications"}</p>
    <div style="display: flex; align-items: center; justify-content: space-between; gap: 50px";>
        <h1 class="menuItemH1" style="font-size: 2rem;">$${Number(item.price).toFixed(2)}</h1>
        <button class="menuItemButton ttsButton" style="font-size: 1.1rem; margin-left: -30px;" data-id="${item.menuid}" data-text="Customize ${item.name}" data-translate-basic>Customize</button>
      </div>
    </div>`;

  reorderDiv.appendChild(drinkDiv);

  // event listeners for adding drink to cart
  const addDrinkToOrderButton = drinkDiv.querySelector(".menuItemButton");
  addDrinkToOrderButton.addEventListener("click", async e => {
    const drinkNameText = e.currentTarget.dataset.text;

    const res = await fetch(`/api/drinkbyid?id=${item.menuid}`);
    const baseDrink = await res.json();
    openModificationsPopup(baseDrink[0], 
      {size: cup[0].itemname.split(' ')[0].toLowerCase(),
        temperature: temp[0].itemname.toLowerCase(),
        sweetness: sugarAmount,
        ice: iceAmount,
        toppings: mods.toppings
    });

    if (ttsEnabled) {
      speak(drinkNameText);
    }
  });

  // Translate if in Spanish
  if (typeof pageTranslator !== 'undefined' && pageTranslator.currentLanguage.toUpperCase() === 'ES') {
    setTimeout(() => pageTranslator.translatePage('ES'), 100);
  }
}

//---------------------------------- LOGOUT -----------------------------------//
// Handle logout
function handleLogout() {
  // Clear session storage
  sessionStorage.removeItem("currentEmployee");
  sessionStorage.removeItem("cartItems");
  localStorage.setItem("currentLanguage", "EN");
  // Redirect to logout endpoint which will clear server session
  window.location.href = '/api/logout';
}

//---------------------------------- TTS -----------------------------------//
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

document.querySelectorAll(".ttsButton").forEach(button => {
  button.addEventListener("click", async (e) => {
    if (!ttsEnabled) {
      return;
    }
    e.preventDefault(); // stop navigation
    const text = button.dataset.text;
    if (text == null) {
      return;
    }

    const url = button.getAttribute("href");

    if (ttsEnabled && text) {
      await speak(text);
      if (url) {
        window.location.href = url;
      }
    }
  });
});

