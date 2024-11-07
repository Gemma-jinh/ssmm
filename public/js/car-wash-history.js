$.ajaxSetup({
  beforeSend: function (xhr) {
    const token = localStorage.getItem("token");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
  },
});

$(document).ready(function () {
  // 로그인 사용자 정보 확인
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const decoded = jwt_decode(token);
    if (
      decoded.authorityGroup !== "작업자" &&
      decoded.authorityGroup !== "관리자"
    ) {
      alert("작업자 권한이 필요합니다.");
      window.location.href = "/login.html";
      return;
    }
  } catch (err) {
    console.error("토큰 검증 실패:", err);
    window.location.href = "/login.html";
    return;
  }

  // 초기 세팅
  $("#car-wash-status-all").prop("checked", true);
  // $("#work-date").val(new Date().toISOString().substring(0, 10));
  const today = new Date().toISOString().split("T")[0];
  $("#work-date").val(today);

  performSearch();

  scheduleNextDayUpdate();

  // 라디오 버튼 변경 이벤트
  $('input[name="flexRadioDefault"]').on("change", function () {
    performSearch();
  });

  // 검색 버튼 클릭 이벤트
  // $(".btn-primary").on("click", function () {
  //   loadCarWashHistory();
  // });

  $("#work-date").on("change", function () {
    performSearch();
  });

  $("#search-button").on("click", function () {
    performSearch();
  });
});

// let currentSearchParams = {};

// 다음 날 자정에 업데이트 스케줄링
function scheduleNextDayUpdate() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const timeUntilMidnight = tomorrow - now;

  setTimeout(() => {
    $("#work-date").val(tomorrow.toISOString().split("T")[0]);
    performSearch();
    scheduleNextDayUpdate(); // 다음 날을 위해 재귀적으로 호출
  }, timeUntilMidnight);
}

function getStatusFilter() {
  if ($("#car-wash-status-emergency").prop("checked")) {
    return "emergency";
  } else if ($("#car-wash-status-complete").prop("checked")) {
    return "complete";
  }
  return "all";
}

function performSearch() {
  const searchParams = {
    status: getStatusFilter(),
    workDate: $("#work-date").val(), // 추가된 부분
    page: 1, // 검색 시 페이지를 1로 초기화
    limit: 10,
  };

  Object.keys(searchParams).forEach((key) => {
    if (!searchParams[key]) {
      delete searchParams[key];
    }
  });

  console.log("Search params:", searchParams);
  currentSearchParams = searchParams;
  loadCarWashHistory(searchParams.page, searchParams.limit, searchParams);
}

function loadCarWashHistory(page = 1, limit = 10, searchParams = {}) {
  // const status = getStatusFilter();
  //   const token = localStorage.getItem("token");
  const params = {
    page: page,
    limit: limit,
    ...searchParams,
  };

  $.ajax({
    url: "/api/car-registrations",
    method: "GET",
    data:
      // page: page,
      // limit: 10,
      // status: status,
      params,
    success: function (response) {
      console.log("Received response:", response);
      const tbody = $("#car-wash-list");
      tbody.empty();

      if (!response.cars || response.cars.length === 0) {
        tbody.append(`
            <tr>
              <td colspan="7" class="text-center">등록된 세차 내역이 없습니다.</td>
            </tr>
          `);
        $(".pagination").empty();
        return;
      }

      response.cars.forEach((car) => {
        const status = car.status || "pending";
        // const licensePlate = car.licensePlate || "N/A";
        // const modelName = car.model?.name || "N/A";
        // const placeName = car.location?.place?.name || "N/A";
        // const customerName = car.customer?.name || "N/A";
        // const workDate = car.workDate
        //   ? new Date(car.workDate).toLocaleDateString()
        //   : "N/A";
        // const status = car.status || "N/A";

        const row = `
            <tr style="${getStatusStyle(status)}">
              <td>
                <a href="./car-wash-modify.html?id=${car._id}">
                  <button type="button" class="btn btn-light btn-sm">보고</button>
                </a>
              </td>
              <td>${car.licensePlate}</td>
              <td>${car.modelName}</td>
              <td>${car.location.place.name}</td>
              <td>${car.customer}</td>
              <td>${
                car.workDate
                  ? new Date(car.workDate).toLocaleDateString()
                  : "N/A"
              }</td>
               <td>${getStatusText(status)}</td>
            </tr>
          `;
        tbody.append(row);
      });

      // 페이지네이션 업데이트
      updatePagination(response.page, response.totalPages);
    },
    error: function (err) {
      console.error("세차 내역 로드 실패:", err);
      alert("세차 내역을 불러오는데 실패했습니다.");
    },
  });
}

function getStatusStyle(status) {
  switch (status) {
    case "emergency":
      return "background-color: #ffebee;"; // 긴급 - 연한 빨강
    case "complete":
      return "background-color: #e8f5e9;"; // 완료 - 연한 초록
    default:
      return "";
  }
}

function getStatusText(status) {
  switch (status) {
    case "emergency":
      return "긴급세차요청";
    case "complete":
      return "세차완료";
    default:
      return "대기중";
  }
}

function updatePagination(currentPage, totalPages) {
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

  // 페이지 클릭 이벤트
  $(".page-link").on("click", function (e) {
    e.preventDefault();
    const page = $(this).data("page");
    if (page) {
      loadCarWashHistory(page, 10, currentSearchParams);
    }
  });
}

// function performSearch() {
//   const workDate = $("#work-date").val();
//   const assignDate = $("#assign-date").val();
//   const searchParams = {
//     status: getStatusFilter(),
//     workDate: workDate,
//     assignDate: assignDate,
//     page: 1,
//     limit: 10,
//   };

// 빈 값 제거
//   Object.keys(searchParams).forEach((key) => {
//     if (!searchParams[key]) {
//       delete searchParams[key];
//     }
//   });

//   console.log("Search params:", searchParams);
//   currentSearchParams = searchParams;
//   loadCarWashHistory(searchParams.page, searchParams.limit, searchParams);
// }

function getUserInfo() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    return jwt_decode(token);
  } catch (err) {
    console.error("토큰 디코딩 실패:", err);
    return null;
  }
}

// 인증 상태 확인 및 권한 체크
function checkAuthentication() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return false;
  }

  try {
    const decoded = jwt_decode(token);
    if (decoded.authorityGroup !== "작업자") {
      alert("작업자 권한이 필요합니다.");
      window.location.href = "/login.html";
      return false;
    }
    return true;
  } catch (err) {
    console.error("토큰 검증 실패:", err);
    window.location.href = "/login.html";
    return false;
  }
}
