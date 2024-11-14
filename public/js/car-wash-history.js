const API_BASE_URL = "/api";

$.ajaxSetup({
  beforeSend: function (xhr) {
    const token = sessionStorage.getItem("token");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
  },
});

let currentSearchParams = {};

function getUserInfo() {
  const token = sessionStorage.getItem("token");
  if (!token) return null;

  try {
    return jwt_decode(token);
  } catch (err) {
    console.error("토큰 디코딩 실패:", err);
    return null;
  }
}

function checkAuthentication() {
  const userInfo = getUserInfo();
  if (!userInfo) {
    window.location.href = "/login.html";
    return false;
  }

  if (
    userInfo.authorityGroup !== "작업자" &&
    userInfo.authorityGroup !== "관리자"
  ) {
    alert("작업자 권한이 필요합니다.");
    window.location.href = "/login.html";
    return false;
  }
  return true;
}

function initializeSearchFields() {
  // 검색 필드 초기화 예시
  $("#car-wash-status-all").prop("checked", true);
  const today = new Date().toISOString().split("T")[0];
  $("#assign-date").val(today);
  console.log("검색 필드가 초기화되었습니다.");
}

function loadManagers() {
  // 관리자 목록을 로드하는 AJAX 호출 예시
  $.ajax({
    url: `${API_BASE_URL}/managers`,
    method: "GET",
    success: function (data) {
      console.log("Managers data:", data); // 데이터 확인
      let managersArray = [];
      // if (!data.managers || !Array.isArray(data.managers)) {
      //   managersArray = data.managers;
      // } else if (Array.isArray(data)) {
      //   managersArray = data;
      // } else {
      //   console.error("Managers 데이터 형식이 올바르지 않습니다.");
      //   alert("관리자 목록을 불러오는데 실패했습니다.");
      //   return;
      // }
      if (data.managers && Array.isArray(data.managers)) {
        managersArray = data.managers;
      } else if (Array.isArray(data)) {
        managersArray = data;
      } else {
        console.error("Managers 데이터 형식이 올바르지 않습니다.");
        alert("관리자 목록을 불러오는데 실패했습니다.");
        return;
      }

      const managerSelect = $("#manager-select");
      managerSelect.empty();
      managersArray.forEach(function (manager) {
        managerSelect.append(
          `<option value="${manager._id}">${manager.name}</option>`
        );
      });
      console.log("관리자 목록이 로드되었습니다.");
    },
    error: function (err) {
      console.error("관리자 목록 로드 실패:", err);
      alert("관리자 목록을 불러오는데 실패했습니다.");
    },
  });
}

function loadTeams() {
  // 팀 목록을 로드하는 AJAX 호출 예시
  $.ajax({
    url: `${API_BASE_URL}/teams`,
    method: "GET",
    success: function (data) {
      console.log("Teams data:", data); // 데이터 확인
      // if (!data.teams || !Array.isArray(data.teams)) {
      //   console.error("Teams 데이터 형식이 올바르지 않습니다.");
      //   alert("팀 목록을 불러오는데 실패했습니다.");
      //   return;
      // }

      let teamsArray = [];

      // 응답 형식에 따라 처리
      if (Array.isArray(data)) {
        teamsArray = data;
      } else if (data.teams && Array.isArray(data.teams)) {
        teamsArray = data.teams;
      } else {
        console.error("Teams 데이터 형식이 올바르지 않습니다.");
        alert("팀 목록을 불러오는데 실패했습니다.");
        return;
      }

      const teamSelect = $("#team-select");
      teamSelect.empty();
      teamsArray.forEach((team) => {
        teamSelect.append(`<option value="${team.id}">${team.name}</option>`);
      });
      console.log("팀 목록이 로드되었습니다.");
    },
    error: function (err) {
      console.error("팀 목록 로드 실패:", err);
      alert("팀 목록을 불러오는데 실패했습니다.");
    },
  });
}

function clickAllCheck(masterCheckboxSelector, itemCheckboxSelector) {
  $(masterCheckboxSelector).on("click", function () {
    const isChecked = $(this).is(":checked");
    $(itemCheckboxSelector).prop("checked", isChecked);
  });
}

function clickSingleCheck(masterCheckboxSelector, itemCheckboxSelector) {
  $(document).on("click", itemCheckboxSelector, function () {
    const allChecked =
      $(itemCheckboxSelector).length ===
      $(itemCheckboxSelector + ":checked").length;
    $(masterCheckboxSelector).prop("checked", allChecked);
  });
}

function getStatusText(status) {
  switch (status) {
    case "emergency":
      return "긴급세차요청";
    case "complete":
      return "세차완료";
    case "pending":
      return "세차전";
    default:
      return "N/A";
  }
}

function getStatusStyle(status) {
  switch (status) {
    case "emergency":
      return "background-color: #ffcccc;";
    case "complete":
      return "background-color: #ccffcc;";
    case "pending":
      return "background-color: #ffffcc;";
    default:
      return "";
  }
}

// $(document).ready(function () {
//   if (!checkAuthentication()) {
//     return;
//   }
//   initializeSearchFields();
//   loadManagers();
//   loadTeams();
//   loadCarList(1, 10, {});

//   $("#search-button").on("click", function () {
//     performSearch();
//   });

//   clickAllCheck("#flexCheckDefault", ".select-check-1");
//   clickSingleCheck("#flexCheckDefault", ".select-check-1");

//   $(document).on("click", ".pagination a.page-link", function (e) {
//     e.preventDefault();
//     const page = $(this).data("page");
//     if (page) {
//       loadCarList(page, 10, currentSearchParams);
//     }
//   });
// });

function loadCarList(page = 1, limit = 10, searchParams = {}) {
  searchParams.page = page;
  searchParams.limit = limit;

  $.ajax({
    url: "/api/car-registrations",
    method: "GET",
    data: searchParams,
    success: function (data) {
      console.log("Car Registrations data:", data);
      const carList = $("#car-allocation-list");
      carList.empty();

      if (!data.cars || !Array.isArray(data.cars) || data.cars.length === 0) {
        carList.append(`
            <tr>
              <td colspan="7" class="text-center">등록된 세차 내역이 없습니다.</td>
            </tr>
          `);
        $(".pagination").empty();
        return;
      }

      data.cars.forEach((car) => {
        const row = ` 
            <tr style="${getStatusStyle(car.status)}">
              <td>
                <a href="./car-wash-modify.html?id=${car._id}">
                  <button type="button" class="btn btn-light btn-sm">보고</button>
                </a>
              </td>
              <td>${car.licensePlate}</td>
              <td>${car.model}</td>
              <td>${
                car.location && car.location.place
                  ? car.location.place.name
                  : "N/A"
              }</td>
              <td>${car.customer || "N/A"}</td>
              <td>${
                car.assignDate
                  ? new Date(car.assignDate).toLocaleDateString()
                  : "N/A"
              }</td>
               <td>${getStatusText(car.status)}</td>
            </tr>
          `;
        carList.append(row);
      });

      // 페이지네이션 업데이트
      renderPagination(data.page, data.totalPages);
    },
    error: function (err) {
      console.error("세차 내역 로드 실패:", err);
      alert("세차 내역을 불러오는데 실패했습니다.");
    },
  });
}

function renderPagination(currentPage, totalPages) {
  const pagination = $(".pagination");
  pagination.empty();

  // 이전 페이지 버튼
  pagination.append(`
      <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
        <a class="page-link" href="#" data-page="${
          currentPage - 1
        }" aria-label="Previous">
          <span aria-hidden="true">&laquo;</span>
        </a>
      </li>
    `);

  // 페이지 번호
  for (let i = 1; i <= totalPages; i++) {
    pagination.append(`
        <li class="page-item ${currentPage === i ? "active" : ""}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `);
  }

  // 다음 페이지 버튼
  pagination.append(`
      <li class="page-item ${currentPage === totalPages ? "disabled" : ""}">
        <a class="page-link" href="#" data-page="${
          currentPage + 1
        }" aria-label="Next">
          <span aria-hidden="true">&raquo;</span>
        </a>
      </li>
    `);
}

function performSearch() {
  const status = getStatusFilter();
  const assignDate = $("#assign-date").val();
  const searchParams = {
    status: status,
    assignDate: assignDate,
    page: 1,
    limit: 10,
  };

  Object.keys(searchParams).forEach((key) => {
    if (
      key !== "status" &&
      key !== "assignDate" &&
      (searchParams[key] === undefined || searchParams[key] === "")
    ) {
      delete searchParams[key];
    }
  });

  console.log("Search params:", searchParams);
  currentSearchParams = searchParams;
  loadCarList(searchParams.page, searchParams.limit, searchParams);
}

// 다음 날 자정에 업데이트 스케줄링
function scheduleNextDayUpdate() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const timeUntilMidnight = tomorrow - now;

  setTimeout(() => {
    $("#assign-date").val(tomorrow.toISOString().split("T")[0]);
    performSearch();
    scheduleNextDayUpdate(); // 다음 날을 위해 재귀적으로 호출
  }, timeUntilMidnight);
}

function getStatusFilter() {
  if ($("#car-wash-status-emergency").prop("checked")) {
    return "emergency";
  } else if ($("#car-wash-status-complete").prop("checked")) {
    return "complete";
  } else if ($("#car-wash-status-pending").prop("checked")) {
    return "pending";
  } else if ($("#car-wash-status-all").prop("checked")) {
    return "all";
  }
  return "all";
}

$(document).ready(function () {
  if (!checkAuthentication()) {
    return;
  }

  initializeSearchFields();
  loadManagers();
  loadTeams();
  loadCarList(1, 10, {});

  $("#search-button").on("click", function () {
    performSearch();
  });

  clickAllCheck("#flexCheckDefault", ".select-check-1");
  clickSingleCheck("#flexCheckDefault", ".select-check-1");

  $(document).on("click", ".pagination a.page-link", function (e) {
    e.preventDefault();
    const page = $(this).data("page");
    if (page) {
      loadCarList(page, 10, currentSearchParams);
    }
  });
});

// 초기 세팅
initializeSearchFields();
const today = new Date().toISOString().split("T")[0];
$("#assign-date").val(today);

performSearch();
scheduleNextDayUpdate();

// 라디오 버튼 변경 이벤트
$('input[name="flexRadioDefault"]').on("change", function () {
  performSearch();
});
