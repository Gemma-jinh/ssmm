document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const yearSelect = document.querySelector("#year-select");
  const monthSelect = document.querySelector("#month-select");
  const customerSelect = document.querySelector("#customer-select");
  const managerSelect = document.querySelector("#manager-select");
  const teamSelect = document.querySelector("#team-select");
  const regionSelect = document.querySelector("#region-select");
  const placeSelect = document.querySelector("#place-select");
  const parkingSpotSelect = document.querySelector("#parking-spot-select");
  const carTypeSelect = document.querySelector("#car-type");
  const tableBody = document.querySelector("#report-table-body");
  const totalWashRateCell = document.querySelector("#total-wash-rate");
  const totalWashCountCell = document.querySelector("#total-wash-count");
  const excelDownloadButton = document.querySelector("#excel-download-button");

  // Fetch years and months
  function populateDateOptions() {
    const currentYear = new Date().getFullYear();
    // const currentMonth = new Date().getMonth() + 1;
    for (let y = currentYear; y >= currentYear - 10; y--) {
      const option = document.createElement("option");
      option.value = y;
      option.textContent = y;
      yearSelect.appendChild(option);
    }
    // yearSelect.value = currentYear;

    for (let m = 1; m <= 12; m++) {
      const option = document.createElement("option");
      option.value = m;
      option.textContent = m;
      monthSelect.appendChild(option);
    }
    // monthSelect.value = currentMonth;
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
      console.error("옵션을 가져오는 중 오류 발생:", error);
    }
  }

  // Event listeners for selects
  function addEventListeners() {
    yearSelect.addEventListener("change", fetchReportData);
    monthSelect.addEventListener("change", fetchReportData);
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
      year: yearSelect.value || new Date().getFullYear(),
      month: monthSelect.value || new Date().getMonth() + 1,
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
      const response = await fetch(
        `/api/reports/monthly?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();

      // Clear table body
      tableBody.innerHTML = "";

      // Populate table rows
      data.records.forEach((record) => {
        const tr = document.createElement("tr");

        // const weekStatusCells = record.weekStatuses
        //   .map((status) => `<td>${status || "세차전"}</td>`)
        //   .join("");

        tr.innerHTML = `
             <td>${record.date || "-"}</td>
            <td>${record.licensePlate || "-"}</td>
            <td>${record.carType || "N/A"}</td>
            <td>${record.customer || "N/A"}</td>
            <td>${record.region || "N/A"}</td>
            <td>${record.place || "N/A"}</td>
            <td>${record.manager || "N/A"}</td>
            <td>${record.washStatus || "세차전"}</td>
          `;
        tableBody.appendChild(tr);
      });

      totalWashRateCell.textContent = data.totalWashRate || "0";
      totalWashCountCell.textContent = `세차대수: ${
        data.totalWashCount || "0"
      }대`;
    } catch (error) {
      console.error("보고서 데이터를 가져오는 중 오류 발생:", error);
    }
  }

  // Excel download
  async function downloadExcel() {
    const params = new URLSearchParams({
      year: yearSelect.value,
      month: monthSelect.value,
      customer: customerSelect.value,
      manager: managerSelect.value,
      team: teamSelect.value,
      region: regionSelect.value,
      place: placeSelect.value,
      parkingSpot: parkingSpotSelect.value,
      carType: carTypeSelect.value,
    });

    const token = sessionStorage.getItem("token");
    params.append("token", token);

    window.location.href = `/api/reports/monthly/excel?${params.toString()}`;
  }

  // Initialize
  populateDateOptions();
  fetchOptions();
  addEventListeners();
  fetchReportData();
});
