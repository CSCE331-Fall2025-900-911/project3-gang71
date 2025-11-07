function addItemToCart(itemName, price, url, modifications = []) {
	const items = JSON.parse(sessionStorage.getItem("cartItems")) || [];

    const newItem = { name: itemName, price, url, modifications };
    items.push(newItem);

    // save updated array to sessionStorage
    sessionStorage.setItem("cartItems", JSON.stringify(items));
    console.log("Added:", itemName);
    console.log("All items:", items);

	alert(itemName + " added to cart!");
}


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
        <button class="menuItemButton" data-id="${drink.menuid}">Add to Order</button>
      </div>
    `;
    menuRow.appendChild(itemDiv);

    // event listeners
    const addDrinkToOrderButton = itemDiv.querySelector(".menuItemButton");
    addDrinkToOrderButton.addEventListener("click", () => {
      openModificationsPopup(drink);
    });  
  }); 
}

function openModificationsPopup(drink) {
	// save drink info for price modification and cart
	const addButton = document.getElementById("addItemToCart");
	addButton.dataset.name = drink.itemname;
	addButton.dataset.price = drink.itemprice;
	addButton.dataset.url = drink.itemphoto;

	basePrice = Number(drink.itemprice);

	// put in drink info
	document.getElementById("itemImage").src = drink.itemphoto;
	document.getElementById("itemName").textContent = drink.itemname;
	document.getElementById("itemDescription").textContent = drink.itemdescrip;
	document.getElementById("modifiedDrinkPrice").textContent = `$${basePrice.toFixed(2)}`;

	// TODO: pull in toppings info (remove hardcoded version)

	// reset modifications UI (size, sweetness, ice, toppings)
	document.getElementById("smallDrinkButton").dataset.selected = "false";
	document.getElementById("mediumDrinkButton").dataset.selected = "false";
	document.getElementById("largeDrinkButton").dataset.selected = "false";
	document.querySelectorAll(".threeModificationChoices button, .fourModificationChoices button").forEach(btn => btn.classList.remove("selected"));
	document.querySelectorAll("select").forEach(sel => sel.selectedIndex = 0);

	// show popup
	document.getElementById("modificationsPopup").style.display = "block";
}



function closeModificationsPopup() {
    const modificationsPopupDiv = document.getElementById("modificationsPopup");
    if (!modificationsPopupDiv) {
        console.error("Modifications popup container not found!");
        return;
    }

    // TODO: clear button color changes

    modificationsPopupDiv.style.display = "none";
}

// calculate order price
function calculateModifiedPrice(fee) {
    const price = document.getElementById("modifiedDrinkPrice");
	// TODO: dynamically pull in these values

    // remove existing dollar sign
    extractedCurrentPrice = parseFloat(price.textContent.replace("$", ""));
    newPrice = extractedCurrentPrice + fee;
    price.textContent = "$" + newPrice.toFixed(2);

	// change drink price in sessionStorage
	const addButton = document.getElementById("addItemToCart");
	addButton.dataset.price = newPrice.toFixed(2);
	const drinkName = addButton.dataset.name;
	let cartItems = JSON.parse(sessionStorage.getItem("cartItems")) || [];
	const index = cartItems.findIndex(item => item.name === drinkName);

	if (index !== -1) {
		cartItems[index].price = newPrice.toFixed(2);
	}
}




document.getElementById("addItemToCart").addEventListener("click", () => {
    const btn = document.getElementById("addItemToCart");
	closeModificationsPopup();

	const modifications = []
    addItemToCart(
        btn.dataset.name,
        Number(btn.dataset.price),
        btn.dataset.url,
        modifications
    );

	console.log("drink object:", drink);
	console.log("drink.itemphoto:", drink.itemphoto);

});





// get menu items from database using API
document.addEventListener("DOMContentLoaded", () => {
	const menuRows = document.querySelectorAll(".menuRow");
	const category = document.body.dataset.category;

	if (menuRows.length === 0) {
		console.error("No elements with class 'menuRow' found in the DOM.");
		// stop execution
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
				// clear old content
				menuRow.innerHTML = "";

				const chunk = drinks.slice(startingIndex, startingIndex + 4); // 4 drinks per row
				startingIndex += 4;
				renderDrinks(chunk, menuRow);
			});

			// TODO: modification menu
		
		})
		.catch(err => {
			console.error("Error loading drinks:", err);
			menuRows.forEach(menuRow => {
				menuRow.innerHTML = "<p>Failed to load menu items</p>";
			});
		});
});
