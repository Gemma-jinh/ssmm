document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const yearSelect = document.querySelector("#year-select");
  const monthSelect = document.querySelector("#month-select");
  const weekSelect = document.querySelector("#week-select");
  const customerSelect = document.querySelector("#customer-select");
  const managerSelect = document.querySelector("#manager-select");
  const teamSelect = document.querySelector("#assign-team");
  const regionSelect = document.querySelector("#region-select");
  const placeSelect = document.querySelector("#place-select");
  const parkingSpotSelect = document.querySelector("#parking-spot-select");
  const carTypeSelect = document.querySelector("#car-type");
  const tableBody = document.querySelector("#report-table-body");
  const totalWashRateCell = document.querySelector("#total-wash-rate");
  const totalWashCountCell = document.querySelector("#total-wash-count");
  const excelDownloadButton = document.querySelector("#excel-download-button");

  // Fetch years, months, and weeks
  function populateDateOptions() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 10; y--) {
      const option = document.createElement("option");
      option.value = y;
      option.textContent = y;
      yearSelect.appendChild(option);
    }

    for (let m = 1; m <= 12; m++) {
      const option = document.createElement("option");
      option.value = m;
      option.textContent = m;
      monthSelect.appendChild(option);
    }

    // Weeks (1 to 5)
    for (let w = 1; w <= 5; w++) {
      const option = document.createElement("option");
      option.value = w;
      option.textContent = `${w}주`;
      weekSelect.appendChild(option);
    }
  }

  // Fetch options for selects
  async function fetchOptions() {
    try {
      const token = sessionStorage.getItem("token");
      // Fetch customers
      const customers = await fetch("/api/customers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json());
      customers.forEach((customer) => {
        const option = document.createElement("option");
        option.value = customer._id;
        option.textContent = customer.name;
        customerSelect.appendChild(option);
      });

      // Fetch managers
      const managers = await fetch("/api/managers", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json());
      managers.forEach((manager) => {
        const option = document.createElement("option");
        option.value = manager._id;
        option.textContent = manager.name;
        managerSelect.appendChild(option);
      });

      // Fetch teams
      const teams = await fetch("/api/teams", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json());
      teams.forEach((team) => {
        const option = document.createElement("option");
        option.value = team._id;
        option.textContent = team.name;
        teamSelect.appendChild(option);
      });

      // Fetch regions
      const regions = await fetch("/api/regions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json());
      regions.forEach((region) => {
        const option = document.createElement("option");
        option.value = region._id;
        option.textContent = region.name;
        regionSelect.appendChild(option);
      });

      // Fetch car types
      const carTypes = await fetch("/api/car-types", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).then((res) => res.json());
      carTypes.forEach((type) => {
        const option = document.createElement("option");
        option.value = type._id;
        option.textContent = type.name;
        carTypeSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  }

  // Event listeners for selects
  function addEventListeners() {
    yearSelect.addEventListener("change", fetchReportData);
    monthSelect.addEventListener("change", fetchReportData);
    weekSelect.addEventListener("change", fetchReportData);
    customerSelect.addEventListener("change", fetchReportData);
    managerSelect.addEventListener("change", fetchReportData);
    teamSelect.addEventListener("change", fetchReportData);
    regionSelect.addEventListener("change", async function () {
      const regionId = regionSelect.value;
      // Fetch places based on selected region
      const places = await fetch(`/api/regions/${regionId}/places`).then(
        (res) => res.json()
      );
      placeSelect.innerHTML = '<option value="">장소 선택</option>';
      places.forEach((place) => {
        const option = document.createElement("option");
        option.value = place._id;
        option.textContent = place.name;
        placeSelect.appendChild(option);
      });
      fetchReportData();
    });
    placeSelect.addEventListener("change", async function () {
      const placeId = placeSelect.value;
      // Fetch parking spots based on selected place
      const parkingSpots = await fetch(
        `/api/places/${placeId}/parking-spots`
      ).then((res) => res.json());
      parkingSpotSelect.innerHTML = '<option value="">주차 위치 선택</option>';
      parkingSpots.forEach((spot) => {
        const option = document.createElement("option");
        option.value = spot;
        option.textContent = spot;
        parkingSpotSelect.appendChild(option);
      });
      fetchReportData();
    });
    parkingSpotSelect.addEventListener("change", fetchReportData);
    carTypeSelect.addEventListener("change", fetchReportData);

    excelDownloadButton.addEventListener("click", downloadExcel);
  }

  // Fetch and display report data
  async function fetchReportData() {
    const params = new URLSearchParams({
      year: yearSelect.value,
      month: monthSelect.value,
      week: weekSelect.value,
      customer: customerSelect.value,
      manager: managerSelect.value,
      team: teamSelect.value,
      region: regionSelect.value,
      place: placeSelect.value,
      parkingSpot: parkingSpotSelect.value,
      carType: carTypeSelect.value,
    });

    try {
      const token = sessionStorage.getItem("token");
      const response = await fetch(`/api/reports/weekly?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      // Clear table body
      tableBody.innerHTML = "";

      // Populate table rows
      data.records.forEach((record) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${record.date}</td>
            <td>${record.licensePlate}</td>
            <td>${record.carType}</td>
            <td>${record.customer}</td>
            <td>${record.region}</td>
            <td>${record.place}</td>
            <td>${record.manager}</td>
            <td>${record.washStatus}</td>
          `;
        tableBody.appendChild(tr);
      });

      // Update wash rate
      totalWashRateCell.textContent = data.totalWashRate || "0";
      totalWashCountCell.textContent = data.totalWashCount || "0";
    } catch (error) {
      console.error("Error fetching report data:", error);
    }
  }

  // Excel download
  async function downloadExcel() {
    const params = new URLSearchParams({
      year: yearSelect.value,
      month: monthSelect.value,
      week: weekSelect.value,
      customer: customerSelect.value,
      manager: managerSelect.value,
      team: teamSelect.value,
      region: regionSelect.value,
      place: placeSelect.value,
      parkingSpot: parkingSpotSelect.value,
      carType: carTypeSelect.value,
    });

    window.location.href = `/api/reports/weekly/excel?${params.toString()}`;
  }

  // Initialize
  populateDateOptions();
  fetchOptions();
  addEventListeners();
  fetchReportData();
});
