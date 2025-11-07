function checkout() {
    // clear sessionStorage and page
    sessionStorage.clear();
    document.getElementById("cartPage").innerHTML = "";

    showPaymentScreen();
}

function showPaymentScreen() {
    // TODO: finish this function
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
