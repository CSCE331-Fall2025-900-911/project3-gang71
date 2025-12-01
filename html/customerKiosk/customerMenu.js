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

  // add "No Topping" option at the top
  [topping1Select, topping2Select].forEach(select => {
    const noToppingOption = document.createElement('option');
    noToppingOption.value = "";
    noToppingOption.textContent = "No Topping";
    noToppingOption.dataset.price = "0";
    noToppingOption.dataset.name = "No Topping";
    select.appendChild(noToppingOption);
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
function renderDrinks(drinks, menuRow) {
  drinks.forEach(drink => {
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("menuItem");

    itemDiv.innerHTML = `
      <img src="${drink.itemphoto}" alt="${drink.itemname}" class="menuItemImg">
      <h2 class="menuItemH2" data-translate>${drink.itemname}</h2>
      <p class="menuItemP" data-translate>${drink.itemdescrip}</p>
      <div style="display: flex; align-items: center;">
        <h1 class="menuItemH1">$${Number(drink.itemprice).toFixed(2)}</h1>
        <button class="menuItemButton" data-id="${drink.menuid}" data-text="Opened modifications popup for ${drink.itemname}." data-translate>Customize</button>
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
  // Only re-translate if user has already switched to Spanish (don't auto-translate on first load)
  if (pageTranslator.currentLanguage === 'ES') {
    pageTranslator.translatePage('ES');
  }
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
  document.getElementById("custName").innerHTML = sessionStorage.getItem('currentCustomer');

const ttsToggle = document.getElementById("ttsToggle");
  if (ttsToggle) {
    ttsToggle.checked = ttsEnabled;

    ttsToggle.addEventListener("change", async (e) => {
      if (ttsToggle.checked) {
        await speak("TTS enabled");
      }
      else {
        await speak("TTS disabled");
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





document.addEventListener("DOMContentLoaded", () => {
  getWeather();
});


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
                <span class="weatherLocation"> ${data.name} </span>
                <div class = "weatherRow">
                    <div class="weatherColumn">
                        <i class="material-symbols-outlined" style="font-size:50px;">${icon}</i>
                    </div>
                    <div class="weatherColumn">
                        <p>${data.main.temp}°F</p> 
                        <p>Feels like: ${data.main.feels_like}°F</p>
                        <p>Wind: ${data.wind.speed} m/s</p>       
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

  console.log(indices);
  // extract drinks and categories using the same indices
  let drinks = indices.map(i => allDrinks[i]);
  console.log(drinks);
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
      <p id="drinkRecTitle">Based on the weather, we recommend:<p>
      <ul class="drinksList">
        <li><p>${randomResult.drinks[0]} (${randomResult.categories[0]})</p></li>
        <li><p>${randomResult.drinks[1]} (${randomResult.categories[1]})</p></li>
      </ul>
    `;
  }
}
