const API_BASE = "";

const board = document.getElementById("order-board");
const refreshButton = document.getElementById("refreshButton");
const clockELement = document.getElementById("clock");

// clock in header
function startClock() {
    function tick() {
        const now = new Date();
        clockELement.textContent = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    }

    tick();
    setInterval(tick, 1000);
}

// fetch orders from backend
async function fetchOrders() {
    const response = await fetch(API_BASE + "/api/kitchen/orders");
    if (!response.ok) {
        console.error("Failed to fetch kitchen orders");
        return [];
    }
    
    const data = await response.json();
    return data;
}

function formatTime(timeString) {
    if (!timeString) {
        return "";
    }

    const parts = timeString.split(":");
    const hh = parts[0];
    const mm = parts[1];
    return hh + ":" + mm;
}

function renderOrders(orders) {
    board.innerHTML = "";

    if (!orders || orders.length === 0) {
        board.innerHTML = `
        <p
        style="grid-column: 1 / -1;
        text-align: center;
        color: var(--color-dark-variant);
        ">No Orders Yet.
        </p>`;
        return;
    }

    // sort by order time then order id
    orders.sort((a, b) => {
        if (a.ordertime < b.ordertime) {
            return -1
        } else if (a.ordertime > b.ordertime) {
            return 1;
        } else {
            return a.orderid - b.orderid;
        }
    });

    orders.forEach(order => {
        const card = document.createElement("article");
        card.className = "order-card";

        let statusText = "New";
        if (order.status) {
            statusText = order.status;
        }
        card.dataset.status = statusText;

        let customer = "";
        if (order.customername) {
            customer = " | " + order.customername;
        }

        let itemCount = 0;
        if (order.items && order.items.length) {
            itemCount = order.items.length;
        }

        let itemsHTML = "";
        if (order.items && order.items.length > 0) {
            for (let i = 0; i < order.items.length; i++) {
                const item = order.items[i];

                // Include customizations if they exist
                let customizationsHTML = '';

                if (item.size || item.sugar || item.ice || item.topping1 || item.topping2) {
                    customizationsHTML = '<div class="item-customizations">';
                    if (item.size) {
                        customizationsHTML += '<div>Size: ' + item.size + '</div>';
                    }
                    if (item.sugar) {
                        customizationsHTML += '<div>Sugar: ' + item.sugar + '</div>';
                    }
                    if (item.ice) {
                        customizationsHTML += '<div>Ice: ' + item.ice + '</div>';
                    }
                    if (item.topping1) {
                        customizationsHTML += '<div>Topping 1: ' + item.topping1 + '</div>';
                    }
                    if (item.topping2) {
                        customizationsHTML += '<div>Topping 2: ' + item.topping2 + '</div>';
                    }
                    customizationsHTML += '</div>';
                }

                itemsHTML +=
                    "<li>" + 
                        '<div class="item-name">' + item.quantity + "x " + item.name + "</div>" + 
                        customizationsHTML +
                    "</li>";
            }
        }

        card.innerHTML =
        '<div class="order-header">' +
            "<span>Order #" + order.orderid + "</span>" +
            '<span class="order-status">' + statusText + "</span>" +
        "</div>" +
        '<div class="order-meta">' +
            "<span>" + formatTime(order.ordertime) + "</span>" +
            "<span>Items: " + itemCount + customer + "</span>" +
        "</div>" +
        '<ul class="order-items">' +
            itemsHTML +
        "</ul>" +
        '<div class="order-actions">' +
            '<button class="start" data-action="start">Start</button>' +
            '<button class="done" data-action="done">Ready</button>' +
            '<button class="delivered" data-action="delivered">Delivered</button>' +
        "</div>"

        // touch friendly button handling
        card.addEventListener(
            "click",
            async (event) => {
                const btn = event.target.closest("button");
                if (!btn) {
                    return;
                }

                const action = btn.dataset.action;

                try {
                    if (action === "start") {
                        await updateStatus(order.orderid, "In Progress");
                    } else if (action === "done") {
                        await updateStatus(order.orderid, "Done");
                    } else if (action === "delivered") {
                        await deliverOrder(order.orderid);
                    }

                    // Refresh orders after status update
                    const newOrders = await fetchOrders();
                    renderOrders(newOrders);
                } catch (error) {
                    console.error("Failed to update order status", error);
                }
            },
            { passive: true }
        );

        board.appendChild(card);
    });
}

async function updateStatus(orderId, status) {
    await fetch(API_BASE + "/api/kitchen/orders/" + orderId + "/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify( {status: status })
        });
}

async function deliverOrder(orderId) {
    await fetch(API_BASE + "/api/kitchen/orders/" + orderId, {
        method: "DELETE"
    });
}

async function refresh() {
    const orders = await fetchOrders();
    renderOrders(orders);
}

document.addEventListener("DOMContentLoaded", function() {
    startClock();
    refresh();
    refreshButton.addEventListener("click", refresh);

    setInterval(refresh, 30000); // auto-refresh every 30 seconds
});