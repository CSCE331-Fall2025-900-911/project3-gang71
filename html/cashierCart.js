function checkout() {
    // clear sessionStorage and page
    const totalPrice = calculateTotalPrice();
    document.getElementById("cartPage").innerHTML = "";

    showPaymentScreen(totalPrice);
    sessionStorage.clear();
}

function showPaymentScreen(totalPrice) {
    const checkoutButton = document.getElementById("checkoutButton");
    checkoutButton.style.display = "none";

    document.getElementById("paymentScreen").innerHTML = `
        <button>Card</button>
        <button>Cash</button>
        <input type="text">
        <button>Add Tip</button>
        <h2>Total price: $${totalPrice}</h2>
        <a href="cashierCart.html" style="text-decoration: none; color: black;">
            <button>Cancel</button>
        </a>
        <button onclick="showThankYouScreen()">Pay</button>
    `;
}

function showThankYouScreen() {
    document.getElementById("paymentScreen").innerHTML = "";
    document.getElementById("paymentScreen").innerHTML = "<h1>Thank you for visiting!</h1>";
}

function calculateTotalPrice() {
    const cartItems = JSON.parse(sessionStorage.getItem("cartItems")) || [];

    const total = cartItems.reduce((sum, item) => sum + Number(item.price), 0);

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

        itemDiv.innerHTML = `
            <img src="${item.url}" alt="${item.name}" class="cartItemImg">
            <div>
                <h3>${item.name}</h3>
                <p>Price: $${item.price.toFixed(2)}</p>
                <p>Modifications: ${(item.modifications || []).join(", ") || "None"}</p>
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

    // change + - quantity
});
