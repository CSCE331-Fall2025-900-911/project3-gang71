async function loadCategory(category, containerSelector) {
    try {
        const response = await fetch(`/api/menu/${encodeURIComponent(category)}`);
        const items = await response.json();

        const container = document.querySelector(containerSelector);
        if (!container) return;

        container.innerHTML = "";

        items.forEach(item => {
            const div = document.createElement("div");
            div.classList.add("item");
            div.innerHTML = `
                <span>${item.itemname} - $${item.itemprice}</span>
            `;
            container.appendChild(div);
        });

    } catch (error) {
        console.error(`Error loading category ${category}:`, error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadCategory("La Colombe Cold Brew", ".itemsColdBrew");
    loadCategory("Milk Tea", ".itemsMilkTea");
    loadCategory("Matcha", ".itemsMatcha");
    loadCategory("Slush", ".itemsSlush");
    loadCategory("Classic", ".itemsClassic");
    loadCategory("Punch", ".itemsPunch");
    loadCategory("Milk Strike", ".itemsMilkStrike");
    loadCategory("Oat Strike", ".itemsOatStrike");
    loadCategory("Milk Cap", ".itemsMilkCap");
    loadCategory("Coffee", ".itemsCoffee");
    loadCategory("Yogurt", ".itemsYogurt");
});
