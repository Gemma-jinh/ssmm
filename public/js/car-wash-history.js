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
    if (decoded.authorityGroup !== "작업자") {
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
  loadCarWashHistory();

  // 라디오 버튼 변경 이벤트
  $('input[name="flexRadioDefault"]').on("change", function () {
    loadCarWashHistory();
  });

  // 검색 버튼 클릭 이벤트
  $(".btn-primary").on("click", function () {
    loadCarWashHistory();
  });
});

function getStatusFilter() {
  if ($("#car-wash-status-emergency").prop("checked")) {
    return "emergency";
  } else if ($("#car-wash-status-complete").prop("checked")) {
    return "complete";
  }
  return "all";
}

function loadCarWashHistory(page = 1) {
  const status = getStatusFilter();
  //   const token = localStorage.getItem("token");

  $.ajax({
    url: "/api/car-registrations",
    method: "GET",
    data: {
      page: page,
      limit: 10,
      status: status,
    },
    success: function (response) {
      console.log("Received response:", response);
      const tbody = $("#car-wash-list");
      tbody.empty();

      if (!response.cars || response.cars.length === 0) {
        tbody.append(`
            <tr>
              <td colspan="5" class="text-center">등록된 세차 내역이 없습니다.</td>
            </tr>
          `);
        $(".pagination").empty();
        return;
      }

      response.cars.forEach((car) => {
        const licensePlate = car.licensePlate || "N/A";
        const modelName = car.model?.name || "N/A";
        const placeName = car.location?.place?.name || "N/A";
        const customerName = car.customer?.name || "N/A";

        const row = `
            <tr>
              <td>
                <a href="./car-wash-modify.html?id=${car._id}">
                  <button type="button" class="btn btn-light btn-sm">보고</button>
                </a>
              </td>
              <td>${licensePlate || "N/A"}</td>
              <td>${modelName || "N/A"}</td>
              <td>${placeName || "N/A"}</td>
              <td>${customerName || "N/A"}</td>
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
      loadCarWashHistory(page);
    }
  });
}

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

// 세차 상태에 따른 배경색 설정
function getStatusStyle(status) {
  switch (status) {
    case "emergency":
      return "background-color: #ffebee;";
    case "complete":
      return "background-color: #e8f5e9;";
    default:
      return "";
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
