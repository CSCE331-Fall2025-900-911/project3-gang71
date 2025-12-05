// html/trends.js
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("salesBody");
  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");
  const generateReportTypeButton = document.getElementById("generateReportTypeButton");
  const downloadReportButton = document.getElementById("downloadReportButton");
  const reportTypeBox = document.getElementById("reportTypeBox");
  const salesChart = document.getElementById('salesChart');
  const downloadXReportButton = document.getElementById('downloadXReportButton');
  const downloadZReportButton = document.getElementById('downloadZReportButton');
  let chart;

  // Define report configurations with proper headers and labels
  const reportConfigs = {
    dailySales: {
      endpoint: '/api/dailySales',
      header1: 'Date',
      header2: 'Number of Orders',
      header3: 'Total Revenue',
      chartLabel: 'Daily Revenue',
      chartDataKey: 'totalRevenue',
      xAxisLabel: 'Date',
      yAxisLabel: 'Revenue ($)'
    },
    weeklySales: {
      endpoint: '/api/weeklySales',
      header1: 'Week',
      header2: 'Number of Orders',
      header3: 'Total Revenue',
      chartLabel: 'Weekly Revenue',
      chartDataKey: 'totalRevenue',
      xAxisLabel: 'Week',
      yAxisLabel: 'Revenue ($)'
    },
    monthlySales: {
      endpoint: '/api/monthlySales',
      header1: 'Month',
      header2: 'Number of Orders',
      header3: 'Total Revenue',
      chartLabel: 'Monthly Revenue',
      chartDataKey: 'totalRevenue',
      xAxisLabel: 'Month',
      yAxisLabel: 'Revenue ($)'
    },
    yearlySales: {
      endpoint: '/api/yearlySales',
      header1: 'Year',
      header2: 'Number of Orders',
      header3: 'Total Revenue',
      chartLabel: 'Yearly Revenue',
      chartDataKey: 'totalRevenue',
      xAxisLabel: 'Year',
      yAxisLabel: 'Revenue ($)'
    },
    topSellingProducts: {
      endpoint: '/api/topSellingProducts',
      header1: 'Product Name',
      header2: 'Quantity Sold',
      header3: 'Total Revenue',
      chartLabel: 'Product Sales',
      chartDataKey: 'quantitySold',
      xAxisLabel: 'Product',
      yAxisLabel: 'Quantity Sold'
    },
    restockReport: {
      endpoint: '/api/restockReport',
      header1: 'Supply Name',
      header2: 'Quantity on Hand',
      header3: 'Status',
      chartLabel: 'Low Stock Items',
      chartDataKey: 'quantitySold',
      xAxisLabel: 'Supply Item',
      yAxisLabel: 'Quantity on Hand'
    },
    employeePerformance: {
      endpoint: '/api/employeePerformance',
      header1: 'Employee Name',
      header2: 'Number of Orders',
      header3: 'Total Revenue',
      chartLabel: 'Employee Performance',
      chartDataKey: 'totalRevenue',
      xAxisLabel: 'Employee',
      yAxisLabel: 'Revenue ($)'
    },
    productUsageChart: {
      endpoint: '/api/productUsageChart',
      header1: 'Supply Name',
      header2: 'Quantity Used',
      header3: 'Total Cost',
      chartLabel: 'Product Usage',
      chartDataKey: 'quantitySold',
      xAxisLabel: 'Supply Item',
      yAxisLabel: 'Quantity Used'
    },
    salesByItem: {
      endpoint: '/api/salesByItem',
      header1: 'Product Name',
      header2: 'Quantity Sold',
      header3: 'Total Revenue',
      chartLabel: 'Sales by Item',
      chartDataKey: 'quantitySold',
      xAxisLabel: 'Product',
      yAxisLabel: 'Quantity Sold'
    }
  };

  generateReportTypeButton.addEventListener("click", () => {
    const reportType = reportTypeBox.value;
    const config = reportConfigs[reportType];

    if (!config) return;

    const endpoint = config.endpoint + `?startDate=${startDate.value}&endDate=${endDate.value}`;

    // Update table headers
    const thead = document.querySelector('thead tr');
    thead.innerHTML = `
      <th>${config.header1}</th>
      <th>${config.header2}</th>
      <th>${config.header3}</th>
    `;

    fetch(endpoint)
      .then((response) => response.json())
      .then((data) => {
        tableBody.innerHTML = "";
        
        data.forEach((item) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${item.productName}</td>
            <td>${item.quantitySold}</td>
            <td>${item.totalRevenue}</td>
          `;
          tableBody.appendChild(row);
        });

        if (chart) 
          chart.destroy();

        chart = new Chart(salesChart, {
          type: 'bar',
          data: {
            labels: data.map(i => i.productName),
            datasets: [{
              label: config.chartLabel,
              data: data.map(i => i[config.chartDataKey]),
              borderWidth: 1
            }]
          },
          options: {
            scales: {
              x: {
                title: {
                  display: true,
                  text: config.xAxisLabel
                }
              },
              y: {
                title: {
                  display: true,
                  text: config.yAxisLabel
                }
              }
            }
          }
        });
      })
      .catch((err) => {
        console.error("Error loading data:", err);
        tableBody.innerHTML =
          "<tr><td colspan='3'>Failed to load report data</td></tr>";
      });
  });

  downloadReportButton.addEventListener("click", () => {
    let csv = "Product Name,Quantity Sold,Total Revenue\n";
    tableBody.querySelectorAll("tr").forEach(row => {
      csv += Array.from(row.cells).map(cell => cell.innerText).join(",") + "\n";
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], {type: "text/csv"}));
    a.download = "sales_report.csv";
    a.click();
  });
});

downloadZReportButton.addEventListener("click", () => {
  fetch("/api/zReport")
    .then((response) => response.json())
    .then((data) => {
      let zReport = `Z Report: ${new Date().toISOString().split("T")[0]}\n`;
      zReport += `\nSales Summary`;
      zReport += `\nCash: $${(data.totalCash || 0)}`;
      zReport += `\nCard: $${(data.totalCard || 0)}`;
      zReport += `\nTotal Sales: $${(data.totalSales || 0)}\n`;
      zReport += `\nTips & Tax Summary`;
      zReport += `\nTips: $${(data.totalTips || 0)}`;
      zReport += `\nTax: $${(data.totalTax || 0)}\n`;
      zReport += `\nEmployee Sales Summary\n`;
      for (const employeeId in data.empSales) {
        const employee = data.empSales[employeeId];
        zReport += `${employee.name}: $${employee.sales}\n`;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([zReport], {type: "text/plain"}));
      a.download = "zreport.txt";
      a.click();  
    })
    .catch((err) => {
        console.error("Error loading Z report:", err);
    });
});

downloadXReportButton.addEventListener("click", () => {
  fetch("/api/xReport")
    .then((response) => response.json())
    .then((data) => {
      let xReport = "Hour,Number of Orders,Total Sales,Average Order Price,Total Tips,Total Drinks Sold\n";
      data.forEach((record) => {
        xReport += `${record.hour},${record.numOrders},${record.totalSales},${record.avgOrderPrice},${record.totalTips},${record.totalDrinks}\n`;
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([xReport], {type: "text/csv"}));
      a.download = `xreport.csv`;
      a.click();
    })
    .catch((err) => {
      console.error("Error loading X report sales:", err);
    });
});

// load employee name
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("empName").innerHTML = sessionStorage.getItem('currentEmployee');
});