let currentPage = 1;
let currentStatus = "all";
let totalPages = 1;


// ---------------- DEMO ----------------

document.getElementById("demoBtn").addEventListener("click", async () => {

    try {

        const response = await fetch("/demo", {
            method: "POST"
        });

        const data = await response.json();

        document.getElementById("demoResult").style.display = "block";

        let color = data.prediction === 1 ? "fraud-text" : "normal-text";

        document.getElementById("demoText").innerHTML = `
            <div class="demo-box">

                <h3 class="${color}">
                    ${data.result}
                </h3>

                <p>
                    Fraud Probability:
                    <strong>${data.probability}%</strong>
                </p>

            </div>
        `;

    } catch (error) {

        alert("Something went wrong!");

    }

});


// ---------------- CSV UPLOAD ----------------

document.getElementById("csvFile").addEventListener("change", async function () {

    const file = this.files[0];

    if (!file) {
        return;
    }

    const formData = new FormData();

    formData.append("file", file);

    document.getElementById("loading").style.display = "block";

    try {

        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (data.error) {

            alert(data.error);
            return;

        }

        // Update cards

        document.getElementById("totalTransactions").innerText =
            data.total.toLocaleString();

        document.getElementById("fraudTransactions").innerText =
            data.fraud.toLocaleString();

        document.getElementById("normalTransactions").innerText =
            data.normal.toLocaleString();

        document.getElementById("fraudPercentage").innerText =
            data.fraud_percentage + "%";

        document.getElementById("totalAmount").innerText =
            "₹" + data.total_amount.toLocaleString();

        // Show dashboard

        document.getElementById("dashboard").style.display = "block";

        currentPage = 1;

        loadTransactions();

    } catch (error) {

        alert("Error uploading CSV");

        console.error(error);

    } finally {

        document.getElementById("loading").style.display = "none";

    }

});


// ---------------- LOAD TRANSACTIONS ----------------

async function loadTransactions() {

    const search =
        document.getElementById("search").value;

    const url =
        `/transactions?page=${currentPage}&per_page=20&status=${currentStatus}&search=${search}`;

    try {

        const response = await fetch(url);

        const data = await response.json();

        if (data.error) {

            alert(data.error);
            return;

        }

        const table =
            document.getElementById("transactionTable");

        table.innerHTML = "";

        totalPages = data.pages;

        data.transactions.forEach(transaction => {

            const row = document.createElement("tr");

            let statusClass =
                transaction.Prediction === 1
                    ? "fraud"
                    : "normal";

            row.innerHTML = `

                <td>
                    #${transaction.Transaction_ID}
                </td>

                <td>
                    ${Number(transaction.Time).toFixed(2)}
                </td>

                <td>
                    ₹${Number(transaction.Amount).toFixed(2)}
                </td>

                <td>

                    <span class="status ${statusClass}">

                        ${transaction.Status}

                    </span>

                </td>

                <td>

                    ${Number(transaction.Fraud_Probability).toFixed(2)}%

                </td>

                <td>

                    <button
                        class="view-btn"
                        onclick='viewTransaction(${JSON.stringify(transaction)})'>

                        👁️ View

                    </button>

                </td>

            `;

            table.appendChild(row);

        });


        document.getElementById("pageInfo").innerText =
            `Page ${data.page} of ${data.pages}`;

    } catch (error) {

        console.error(error);

    }

}


// ---------------- TABS ----------------

document.querySelectorAll(".tab").forEach(button => {

    button.addEventListener("click", function () {

        document.querySelectorAll(".tab")
            .forEach(btn => btn.classList.remove("active"));

        this.classList.add("active");

        currentStatus =
            this.dataset.status;

        currentPage = 1;

        loadTransactions();

    });

});


// ---------------- SEARCH ----------------

document.getElementById("search")
    .addEventListener("input", function () {

        currentPage = 1;

        loadTransactions();

    });


// ---------------- PAGINATION ----------------

document.getElementById("previousBtn")
    .addEventListener("click", () => {

        if (currentPage > 1) {

            currentPage--;

            loadTransactions();

        }

    });


document.getElementById("nextBtn")
    .addEventListener("click", () => {

        if (currentPage < totalPages) {

            currentPage++;

            loadTransactions();

        }

    });


// ---------------- VIEW DETAILS ----------------

function viewTransaction(transaction) {

    const modal =
        document.getElementById("modal");

    const details =
        document.getElementById("transactionDetails");

    let html = "";

    for (const key in transaction) {

        let value = transaction[key];

        if (typeof value === "number") {

            value = value.toFixed(4);

        }

        html += `

            <div class="detail-row">

                <span>${key}</span>

                <strong>${value}</strong>

            </div>

        `;

    }

    details.innerHTML = html;

    modal.style.display = "flex";

}


// ---------------- CLOSE MODAL ----------------

document.getElementById("closeModal")
    .addEventListener("click", () => {

        document.getElementById("modal")
            .style.display = "none";

    });


window.addEventListener("click", (event) => {

    const modal =
        document.getElementById("modal");

    if (event.target === modal) {

        modal.style.display = "none";

    }

});