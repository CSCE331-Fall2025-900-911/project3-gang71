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

  generateReportTypeButton.addEventListener("click", () => {
    const reportType = reportTypeBox.value;
    let dates = "";
    if (reportType === "dailySales") {
      dates = `/api/dailySales?startDate=${startDate.value}&endDate=${endDate.value}`;
    } else if (reportType === "weeklySales") {
      dates = `/api/weeklySales?startDate=${startDate.value}&endDate=${endDate.value}`;
    } else if (reportType === "monthlySales") {
      dates = `/api/monthlySales?startDate=${startDate.value}&endDate=${endDate.value}`;
    } else if (reportType === "yearlySales") {
      dates = `/api/yearlySales?startDate=${startDate.value}&endDate=${endDate.value}`;
    } else if (reportType === "topSellingProducts") {
      dates = `/api/topSellingProducts?startDate=${startDate.value}&endDate=${endDate.value}`;
    } else if (reportType === "restockReport") {
      dates = `/api/restockReport?startDate=${startDate.value}&endDate=${endDate.value}`;
    } else if (reportType === "employeePerformance") {
      dates = `/api/employeePerformance?startDate=${startDate.value}&endDate=${endDate.value}`;
    } else if (reportType === "productUsageChart") {
      dates = `/api/productUsageChart?startDate=${startDate.value}&endDate=${endDate.value}`;
    } else if (reportType === "salesByItem") {
      dates = `/api/salesByItem?startDate=${startDate.value}&endDate=${endDate.value}`;
    }

    fetch(dates)
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

        if(reportType == "restockReport"){
          chart = new Chart(salesChart, {
          type: 'bar',
          data: {
            labels: data.map(i => i.productName),
            datasets: [{
              label: 'Low Stock Items',
              data: data.map(i => i.quantitySold),
              borderWidth: 1
            }]
          }
          });
        }
        else{
          chart = new Chart(salesChart, {
          type: 'bar',
          data: {
            labels: data.map(i => i.productName),
            datasets: [{
              label: 'Total Revenue',
              data: data.map(i => i.totalRevenue),
              borderWidth: 1
            }]
          }
          });
        }
      })
      .catch((err) => {
        console.error("Error loading data:", err);
        tableBody.innerHTML =
          "<tr><td colspan='4'>Failed to load inventory data</td></tr>";
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