function checkout() {
    // clear page
    document.getElementById("cartPage").innerHTML = "";

    // total price before tip
    const totalPrice = calculateTotalPrice();
    showPaymentScreen(totalPrice);
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

        // USE modsText here, not the old code!
        itemDiv.innerHTML = `
            <img src="${item.url}" alt="${item.name}" class="cartItemImg">
            <div>
                <h3>${item.name}</h3>
                <p>Price: $${Number(item.price).toFixed(2)}</p>
                <p>${modsText || "No modifications"}</p>
                <button class="removeBtn" data-index="${index}">Remove</button>
            </div>
        `;

        cartDiv.appendChild(itemDiv);
    });
    
    const price = document.createElement("h2");
    price.textContent = "Total price: $" + calculateTotalPrice();
    cartDiv.appendChild(price);

    document.querySelectorAll(".removeBtn").forEach(btn => {
        btn.addEventListener("click", e => {
            const index = e.target.dataset.index;
            items.splice(index, 1);
            sessionStorage.setItem("cartItems", JSON.stringify(items));
            location.reload(); // re-render cart
        });
    });
});

// load employee name
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("empName").innerHTML = sessionStorage.getItem('currentEmployee');
});