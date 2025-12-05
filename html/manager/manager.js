// Set default dates (today and 7 days ago)
const today = new Date().toISOString().split('T')[0];
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

document.getElementById('dashboardStartDate').value = sevenDaysAgo;
document.getElementById('dashboardEndDate').value = today;

// Generate graph on button click
document.getElementById('generateDashboardGraph').addEventListener('click', generateDashboardGraph);

// Generate initial graph on page load
generateDashboardGraph();

let dashboardChart;

async function generateDashboardGraph() {
    const startDate = document.getElementById('dashboardStartDate').value;
    const endDate = document.getElementById('dashboardEndDate').value;

    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }

    try {
        const response = await fetch(`/api/dailySales?startDate=${startDate}&endDate=${endDate}`);
        const data = await response.json();

        if (dashboardChart) {
            dashboardChart.destroy();
        }

        const ctx = document.getElementById('dashboardChart').getContext('2d');
        dashboardChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(item => item.productName),
                datasets: [{
                    label: 'Daily Revenue',
                    data: data.map(item => item.totalRevenue),
                    borderWidth: 1,
                    backgroundColor: 'rgba(230, 126, 126, 0.6)',
                    borderColor: 'rgba(230, 126, 126, 1)'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Revenue ($)'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error generating graph:', error);
    }
}


document.addEventListener("DOMContentLoaded", () => {
    getWeather();
    loadMostSoldItem();
});

async function loadMostSoldItem() {
    try {
        const response = await fetch('/api/mostSoldItem');
        const data = await response.json();

        console.log('Most sold item response:', data);

        const mostSoldDiv = document.querySelector('.mostSoldItem');
        
        if (!response.ok) {
            mostSoldDiv.innerHTML = '<p>Error: ' + data.error + '</p>';
            return;
        }
        
        if (data && data.length > 0) {
            const item = data[0];
            mostSoldDiv.innerHTML = `
                <p>Most Sold Item</p>
                <p><strong>${item.itemname}</strong></p>
                <p>Sold: ${item.quantitySold} times</p>
                <p>Total Revenue: $${parseFloat(item.totalRevenue).toFixed(2)}</p>
            `;
        } else {
            mostSoldDiv.innerHTML = '<p>No sales data available</p>';
        }
    } catch (error) {
        console.error('Error loading most sold item:', error);
        document.querySelector('.mostSoldItem').innerHTML = '<p>Error loading data</p>';
    }
}

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
}