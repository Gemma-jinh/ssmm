const API_BASE_URL = "/api"; // 백엔드 서버 URL

function checkAuthentication(requiredRole) {
  const token = sessionStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return false;
  }

  try {
    const decoded = jwt_decode(token); // jwt-decode 라이브러리가 필요합니다
    if (decoded.authorityGroup !== requiredRole) {
      alert(`${requiredRole} 권한이 필요합니다.`);
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

// API 호출 시 토큰 포함
$.ajaxSetup({
  beforeSend: function (xhr) {
    const token = sessionStorage.getItem("token");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
  },
});

let currentSearchParams = {};

$(document).ready(function () {
  // const token = localStorage.getItem("token");
  // if (!token) {
  //   window.location.href = "/login.html";
  //   return;
  if (!checkAuthentication("관리자")) {
    return;
  }
  // $("#search-button").on("click", function (e) {
  //   e.preventDefault();
  //   performSearch();
  // });

  // 필드 변경 시 자동 검색 (선택적)
  // $(
  //   "#car-type, #car-model, #region-select, #place-select, #parking-spot-select, #customer-select, #manager-select"
  // ).on("change", function () {
  //   performSearch();
  // });

  // 차량 번호 입력 시 타이핑 완료 후 검색
  // let searchTimeout;
  // $("#license-plate").on("input", function () {
  //   clearTimeout(searchTimeout);
  //   searchTimeout = setTimeout(() => {
  //     performSearch();
  //   }, 500);
  // });

  // initializeSearchFields();
  // loadCarList();
  initializeFilters();
  performSearch();

  setupEventListeners();
});

function initializeFilters() {
  populateCarTypes();
  populateCustomers();
  populateRegions();
  populateManagers();

  let searchTimeout;
  $("#license-plate").on("input", function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch();
    }, 500); // 500ms 후 검색 실행
  });
}

function setupEventListeners() {
  // 차종 선택 시 모델 로드
  $("#car-type").on("change", function () {
    const selectedType = $(this).val();
    if (selectedType) {
      populateCarModels(selectedType);
      $("#car-model").prop("disabled", false);
    } else {
      $("#car-model")
        // .empty()
        // .append('<option value="" selected>차량 모델 선택</option>')
        .html("<option selected>차량 모델 선택</option>")
        .prop("disabled", true);
      $("#parking-spot-select")
        // .empty()
        // .append('<option value="" selected>주차 위치 선택</option>')
        .html('<option value="" selected>주차 위치 선택</option>')
        .prop("disabled", true);
    }
  });

  // 지역 선택 시 장소 로드
  $("#region-select").on("change", function () {
    const selectedRegion = $(this).val();
    if (selectedRegion) {
      populatePlaces(selectedRegion);
      $("#place-select").prop("disabled", false);
    } else {
      $("#place-select")
        // .empty()
        // .append('<option value="" selected>장소 선택</option>')
        .html("<option selected>장소 선택</option>")
        .prop("disabled", true);
      $("#parking-spot-select")
        // .empty()
        // .append('<option value="" selected>주차 위치 선택</option>')
        .html('<option value="" selected>주차 위치 선택</option>')
        .prop("disabled", true);
    }
  });

  // 장소 선택 시 주차 위치 로드
  $("#place-select").on("change", function () {
    const selectedPlace = $(this).val();
    if (selectedPlace) {
      populateParkingSpots(selectedPlace);
      $("#parking-spot-select").prop("disabled", false);
    } else {
      $("#parking-spot-select")
        // .empty()
        // .append('<option value="" selected>주차 위치 선택</option>')
        .html('<option value="" selected>주차 위치 선택</option>')
        .prop("disabled", true);
    }
  });

  $("#search-button").on("click", function (e) {
    e.preventDefault();
    performSearch();
  });

  $("#flexCheckDefault").on("change", function () {
    $(".select-check-1").prop("checked", this.checked);
  });

  $(document).on("change", ".select-check-1", function () {
    if (!this.checked) {
      $("#flexCheckDefault").prop("checked", false);
    }
    if ($(".select-check-1:checked").length === $(".select-check-1").length) {
      $("#flexCheckDefault").prop("checked", true);
    }
  });

  $("#delete-button").on("click", function () {
    const selectedIds = $(".select-check-1:checked")
      .map(function () {
        return $(this).val();
      })
      .get();

    if (selectedIds.length === 0) {
      alert("삭제할 차량을 선택해주세요.");
      return;
    }

    if (!confirm(`${selectedIds.length}개의 차량을 삭제하시겠습니까?`)) {
      return;
    }

    // 삭제 요청 보내기 (삭제 API가 필요)
    // 예시: DELETE /api/car-registrations (백엔드에 DELETE 엔드포인트 구현 필요)
    $.ajax({
      url: `${API_BASE_URL}/car-registrations`,
      method: "DELETE",
      // headers: {
      //   Authorization: `Bearer ${getToken()}`,
      // },
      contentType: "application/json",
      data: JSON.stringify({ ids: selectedIds }),
      success: function () {
        alert("선택된 차량이 삭제되었습니다.");
        loadCarList(); // 목록 다시 로드
      },
      error: function (err) {
        if (err.status === 401) {
          alert("로그인이 필요합니다.");
          window.location.href = "/login.html";
        } else {
          console.error("차량 삭제 실패:", err);
          alert("차량 삭제에 실패했습니다.");
        }
      },
    });
  });

  // 페이징 링크 클릭 이벤트 핸들러
  // $(document).on("click", ".pagination a.page-link", function (e) {
  //   e.preventDefault();
  //   const page = $(this).data("page");
  //   if (page) {
  //     loadCarList(currentSearchParams, page, 10);
  //   }
  // });

  $("#download-excel").on("click", function () {
    downloadExcel(currentSearchParams);
  });
}

// 검색 수행 함수
function performSearch() {
  const searchParams = {
    status: getStatusFilter(),
    type: $("#car-type").val(),
    model: $("#car-model").val(),
    licensePlate: $("#license-plate").val().trim(),
    locationRegion: $("#region-select").val(),
    locationPlace: $("#place-select").val(),
    locationParkingSpot: $("#parking-spot-select").val(),
    customer: $("#customer-select").val(),
    manager: $("#manager-select").val(),
  };

  // 빈 값 제거
  Object.keys(searchParams).forEach((key) => {
    if (
      !searchParams[key] ||
      searchParams[key] === "차종 선택" ||
      searchParams[key] === "차량 모델 선택" ||
      searchParams[key] === "지역 선택" ||
      searchParams[key] === "장소 선택" ||
      searchParams[key] === "주차 위치 선택"
    ) {
      delete searchParams[key];
    }
  });

  console.log("Search params:", searchParams);
  currentSearchParams = searchParams;
  loadCarList(1, 10, searchParams);
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

// 차량 목록 로드 함수
function loadCarList(page = 1, limit = 10, searchParams = {}) {
  const params = {
    ...searchParams,
    page,
    limit,
  };

  $.ajax({
    url: `${API_BASE_URL}/car-registrations`,
    method: "GET",
    data: params,
    success: function (data) {
      console.log("Received data:", data);
      const carList = $("#car-list");
      carList.empty();

      if (!data.cars || data.cars.length === 0) {
        carList.append(
          '<tr><td colspan="8" class="text-center">등록 차량이 없습니다.</td></tr>'
        );
        $(".pagination").empty(); //페이지네이션 비움
        return;
      }

      data.cars.forEach((car) => {
        console.log("Processing car data:", car);
        const row = `
              <tr>
                <td><input class="form-check-input select-check-1" type="checkbox" value="${
                  car._id
                }" /></td>
            <td>${car.location?.place?.name || "N/A"}</td>
            <td>${car.location?.place?.address || "N/A"}</td>
            <td>${car.model || "N/A"}</td>
            <td>${car.licensePlate || "N/A"}</td>
            <td>${car.customer || "N/A"}</td>
            <td>${car.location?.parkingSpot || "N/A"}</td>
            <td>${car.manager || "N/A"}</td>
                <td>
                  <a href="./car-info-modify.html?id=${car._id}">
                    <button type="button" class="btn btn-light btn-sm">수정</button>
                  </a>
                </td>
              </tr>
            `;
        carList.append(row);
      });
      // renderPagination(data.page, data.totalPages);
      if (data.totalPages > 1) {
        renderPagination(data.page, data.totalPages);
      } else {
        $("#pagination").empty();
      }
    },
    error: function (err) {
      console.error("차량 목록 로드 실패:", err);
      if (err.status === 401) {
        alert("로그인이 필요합니다.");
        // 로그인 페이지로 리다이렉트
        window.location.href = "/login.html";
      } else {
        console.error("차량 목록 로드 실패:", err);
        alert("차량 목록을 불러오는 데 실패했습니다.");
      }
    },
  });
}

// 페이징 네비게이션 렌더링
function renderPagination(currentPage, totalPages) {
  const pagination = $("#pagination");
  pagination.empty();

  // 이전 버튼
  if (currentPage > 1) {
    pagination.append(`
    <li class="page-item">
      <a class="page-link" href="#" data-page="${
        currentPage - 1
      }" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
      </a>
    </li>
  `);
  } else {
    pagination.append(`
      <li class="page-item disabled">
        <a class="page-link" href="#" aria-label="Previous">
          <span aria-hidden="true">&laquo;</span>
        </a>
      </li>
    `);
  }

  // 페이지 번호
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      pagination.append(`
      <li class="page-item active">
        <a class="page-link" href="#" data-page="${i}">${i}</a>
      </li>
    `);
    } else {
      pagination.append(`
        <li class="page-item">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `);
    }
  }

  // 다음 버튼
  if (currentPage < totalPages) {
    pagination.append(`
    <li class="page-item">
      <a class="page-link" href="#" data-page="${
        currentPage + 1
      }" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
      </a>
    </li>
  `);
  } else {
    pagination.append(`
    <li class="page-item disabled">
      <a class="page-link" href="#" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
      </a>
    </li>
  `);
  }
  $(".page-link").on("click", function (e) {
    e.preventDefault();
    const page = $(this).data("page");
    if (page && page >= 1 && page <= totalPages) {
      loadCarList(page, 10, currentSearchParams);
    }
  });
}

// 데이터 로드 함수들
function populateCarTypes() {
  $.ajax({
    url: `${API_BASE_URL}/car-types`,
    method: "GET",
    success: function (data) {
      const select = $("#car-type");
      select.find('option:not([value=""])').remove();
      data.forEach((type) => {
        if (type._id && type.name) {
          select.append(`<option value="${type._id}">${type.name}</option>`);
        }
      });
    },
    error: function (err) {
      console.error("차종 로드 실패:", err);
    },
  });
}

function populateCustomers() {
  $.ajax({
    url: `${API_BASE_URL}/customers`,
    method: "GET",
    success: function (data) {
      const select = $("#customer-select");
      select.find('option:not([value=""])').remove();
      data.forEach((customer) => {
        if (customer._id && customer.name) {
          select.append(
            `<option value="${customer._id}">${customer.name}</option>`
          );
        }
      });
    },
    error: function (err) {
      console.error("고객사 로드 실패:", err);
    },
  });
}

function populateRegions() {
  $.ajax({
    url: `${API_BASE_URL}/regions`,
    method: "GET",
    success: function (data) {
      const select = $("#region-select");
      select.empty().append('<option value="" selected>지역 선택</option>');
      data.forEach((region) => {
        if (region._id && region.name) {
          select.append(
            `<option value="${region._id}">${region.name}</option>`
          );
        }
      });
    },
    error: function (err) {
      console.error("지역 로드 실패:", err);
    },
  });
}

function populateCarModels(carTypeId) {
  // console.log("Loading car models for typeId:", typeId);
  $.ajax({
    url: `${API_BASE_URL}/car-types/${carTypeId}/models`,
    method: "GET",
    success: function (data) {
      // console.log("Received car models data:", data);
      const select = $("#car-model");
      select.html('<option value="" selected>차량 모델 선택</option>');
      // .empty()
      // .append('<option value="" selected>차량 모델 선택</option>');
      data.forEach((model) => {
        if (model._id && model.name) {
          select.append(`<option value="${model._id}">${model.name}</option>`);
        }
      });
      select.prop("disabled", false);
    },
    error: function (err) {
      console.error("차량 모델 로드 실패:", err);
    },
  });
}

function populatePlaces(regionId) {
  $.ajax({
    url: `${API_BASE_URL}/regions/${regionId}/places`,
    method: "GET",
    success: function (data) {
      const select = $("#place-select");
      // select.empty().append('<option value="" selected>장소 선택</option>');
      select.html('<option value="" selected>장소 선택</option>');
      data.forEach((place) => {
        if (place._id && place.name) {
          select.append(`<option value="${place._id}">${place.name}</option>`);
        }
      });
      select.prop("disabled", false);
    },
    error: function (err) {
      console.error("장소 로드 실패:", err);
    },
  });
}

function populateParkingSpots(placeId) {
  // if (!placeId) {
  //   const select = $("#parking-spot-select");
  //   select.empty().append('<option value="" selected>주차 위치 선택</option>');
  //   select.prop("disabled", true);
  //   return;
  // }
  $.ajax({
    url: `${API_BASE_URL}/places/${placeId}/parking-spots`,
    method: "GET",
    success: function (data) {
      const select = $("#parking-spot-select");
      select.html('<option value="" selected>주차 위치 선택</option>');
      // .empty()
      // .append('<option value="" selected>주차 위치 선택</option>');
      if (Array.isArray(data)) {
        data.forEach((spot) => {
          select.append(`<option value="${spot}">${spot}</option>`);
        });
        select.prop("disabled", false);
      } else {
        select.prop("disabled", true);
      }
    },
    error: function (err) {
      console.error("주차 위치 로드 실패:", err);
      // const select = $("#parking-spot-select");
      // select
      //   .empty()
      //   .append('<option value="" selected>주차 위치 선택</option>');
      select.prop("disabled", true);
    },
  });
}

function populateManagers() {
  $.ajax({
    url: `${API_BASE_URL}/managers`,
    method: "GET",
    success: function (data) {
      const select = $("#manager-select");
      // select.empty().append('<option value="" selected>세차직원 선택</option>');
      select.html('<option value="" selected>세차직원 선택</option>');
      data.forEach((manager) => {
        if (manager._id && manager.name) {
          select.append(
            `<option value="${manager._id}">${manager.name}</option>`
          );
        }
      });
    },
    error: function (err) {
      console.error("세차직원 목록 로드 실패:", err);
    },
  });
}

// 전체 선택 체크박스
function clickAllCheck(masterCheckboxSelector, targetCheckboxSelector) {
  $(masterCheckboxSelector).on("change", function () {
    $(targetCheckboxSelector).prop("checked", this.checked);
  });
}

// 개별 체크박스 클릭 시 전체 체크박스 상태 변경
// function clickSingleCheck(masterCheckboxSelector, targetCheckboxSelector) {
//   $(document).on("change", targetCheckboxSelector, function () {
//     if (!this.checked) {
//       $(masterCheckboxSelector).prop("checked", false);
//     }
//     if (
//       $(targetCheckboxSelector + ":checked").length ===
//       $(targetCheckboxSelector).length
//     ) {
//       $(masterCheckboxSelector).prop("checked", true);
//     }
//   });
// }
