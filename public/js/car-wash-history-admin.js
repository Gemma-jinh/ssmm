$(document).ready(function () {
  // 인증 및 권한 확인 (관리자 전용)
  if (!checkAuthentication("관리자")) {
    return;
  }

  // 초기 설정
  initializeFilters();
  performSearch();

  // 이벤트 리스너 설정
  setupEventListeners();
});

// AJAX 요청 시 Authorization 헤더 설정
$.ajaxSetup({
  beforeSend: function (xhr) {
    const token = sessionStorage.getItem("token");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
  },
});

// 현재 검색 파라미터 저장
let currentSearchParams = {};

// 필터 초기화 함수
function initializeFilters() {
  // 차종 로드
  populateCarTypes();

  // 지역 로드
  populateRegions();
  const savedFilters = sessionStorage.getItem("carWashFilters");
  if (savedFilters) {
    // 저장된 필터가 있으면 복원
    const filters = JSON.parse(savedFilters);
    restoreFilters(filters);
  } else {
    // 작업 날짜 기본값 설정
    // const today = new Date().toISOString().split("T")[0];
    // $("#assign-date").val(today);
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0];
    $("#assign-date").val(formattedDate);
    $("#car-wash-status-all").prop("checked", true);
  }
}

function saveFilters() {
  const filters = {
    carType: $("#car-type").val(),
    carModel: $("#car-model").val(),
    licensePlate: $("#license-plate").val(),
    region: $("#region-select").val(),
    place: $("#place-select").val(),
    parkingSpot: $("#parking-spot-select").val(),
    status: $('input[name="flexRadioDefault"]:checked').attr("id"),
    manager: $("#manager").val(),
    assignDate: $("#assign-date").val(),
  };
  sessionStorage.setItem("carWashFilters", JSON.stringify(filters));
}

// 필터 복원 함수 추가
async function restoreFilters(filters) {
  // 날짜 복원
  if (filters.assignDate) {
    $("#assign-date").val(filters.assignDate);
  }

  // 차종 복원
  if (filters.carType) {
    $("#car-type").val(filters.carType);
    await populateCarModels(filters.carType);
    if (filters.carModel) {
      $("#car-model").val(filters.carModel);
      $("#car-model").prop("disabled", false);
    }
  }

  // 지역 복원
  if (filters.region) {
    $("#region-select").val(filters.region);
    await populatePlaces(filters.region);
    if (filters.place) {
      $("#place-select").val(filters.place);
      $("#place-select").prop("disabled", false);
      await populateParkingSpots(filters.place);
      if (filters.parkingSpot) {
        $("#parking-spot-select").val(filters.parkingSpot);
        $("#parking-spot-select").prop("disabled", false);
      }
    }
  }

  // 차량번호 복원
  if (filters.licensePlate) {
    $("#license-plate").val(filters.licensePlate);
  }

  // 담당자 복원
  if (filters.manager) {
    $("#manager").val(filters.manager);
  }

  // 상태 복원
  if (filters.status) {
    $(`#${filters.status}`).prop("checked", true);
  }
}

// 이벤트 리스너 설정 함수
function setupEventListeners() {
  $("#car-type").on("change", async function () {
    const selectedType = $(this).val();
    if (selectedType && selectedType !== "차종 선택") {
      await populateCarModels(selectedType);
      $("#car-model").prop("disabled", false);
    } else {
      $("#car-model").html("<option selected>차량 모델 선택</option>");
      $("#car-model").prop("disabled", true);
    }
    saveFilters();
  });

  // 지역 선택 변경 이벤트
  $("#region-select").on("change", async function () {
    const selectedRegion = $(this).val();
    if (selectedRegion && selectedRegion !== "지역 선택") {
      await populatePlaces(selectedRegion);
      $("#place-select").prop("disabled", false);
    } else {
      $("#place-select").html("<option selected>장소 선택</option>");
      $("#place-select").prop("disabled", true);
      $("#parking-spot-select").html(
        "<option selected>주차 위치 선택</option>"
      );
      $("#parking-spot-select").prop("disabled", true);
    }
    saveFilters();
  });

  // 장소 선택 변경 이벤트
  $("#place-select").on("change", async function () {
    const selectedPlace = $(this).val();
    if (selectedPlace && selectedPlace !== "장소 선택") {
      await populateParkingSpots(selectedPlace);
      $("#parking-spot-select").prop("disabled", false);
    } else {
      $("#parking-spot-select").html(
        "<option selected>주차 위치 선택</option>"
      );
      $("#parking-spot-select").prop("disabled", true);
    }
    saveFilters();
  });
  // 차량 타입 변경 시 차량 모델 불러오기
  $(
    "#car-type, #car-model, #license-plate, #region-select, #place-select, #parking-spot-select, #manager, #assign-date"
  ).on("change", function () {
    //   const selectedType = $(this).val();
    //   if (selectedType) {
    //     populateCarModels(selectedType);
    //     $("#car-model").prop("disabled", false);
    //   } else {
    //     $("#car-model").html("<option selected>차량 모델 선택</option>");
    //     $("#car-model").prop("disabled", true);
    //   }
    // });
    // $("#region-select").on("change", function () {
    //   const selectedRegion = $(this).val();
    //   if (selectedRegion) {
    //     populatePlaces(selectedRegion);
    //     $("#place-select").prop("disabled", false);
    //   } else {
    //     $("#place-select").html("<option selected>장소 선택</option>");
    //     $("#place-select").prop("disabled", true);
    //     $("#parking-spot-select").html(
    //       "<option selected>주차 위치 선택</option>"
    //     );
    //     $("#parking-spot-select").prop("disabled", true);
    //   }
    // });
    // $("#place-select").on("change", function () {
    //   const selectedPlace = $(this).val();
    //   if (selectedPlace) {
    //     populateParkingSpots(selectedPlace);
    //     $("#parking-spot-select").prop("disabled", false);
    //   } else {
    //     $("#parking-spot-select").html(
    //       "<option selected>주차 위치 선택</option>"
    //     );
    //     $("#parking-spot-select").prop("disabled", true);
    //   }
    saveFilters();
  });

  $('input[name="flexRadioDefault"]').on("change", function () {
    saveFilters();
  });

  $("#search-button").on("click", function () {
    saveFilters();
    performSearch();
  });

  window.addEventListener("popstate", function () {
    const savedFilters = sessionStorage.getItem("carWashFilters");
    if (savedFilters) {
      restoreFilters(JSON.parse(savedFilters));
      performSearch();
    }
  });
}

// 상세보기 페이지로 이동하기 전에 상태 저장
$(document).on(
  "click",
  'a[href*="car-wash-progress-detail.html"]',
  function () {
    saveFilters();
  }
);

// 전체 선택 체크박스 이벤트
$("#flexCheckDefault").on("change", function () {
  $(".select-check").prop("checked", this.checked);
});

// 개별 체크박스 클릭 시 전체 선택 체크박스 상태 업데이트
$(document).on("change", ".select-check", function () {
  if (!this.checked) {
    $("#flexCheckDefault").prop("checked", false);
  }
  if ($(".select-check:checked").length === $(".select-check").length) {
    $("#flexCheckDefault").prop("checked", true);
  }
});

// 선택 삭제 버튼 클릭 이벤트
$("#delete-button").on("click", function () {
  const selectedIds = $(".select-check:checked")
    .map(function () {
      return $(this).data("id");
    })
    .get();

  if (selectedIds.length === 0) {
    alert("삭제할 세차 내역을 선택해주세요.");
    return;
  }

  if (confirm("선택한 세차 내역을 삭제하시겠습니까?")) {
    deleteCarWash(selectedIds);
  }
});

// 엑셀 다운로드 버튼 클릭 이벤트
$("#download-excel").on("click", function () {
  downloadExcel(currentSearchParams);
});

$(document).on("click", ".page-link", function (e) {
  e.preventDefault();
  const page = $(this).data("page");
  if (page && page >= 1) {
    loadCarList(page, 10, currentSearchParams);
  }
});

// 차량 타입을 서버에서 불러오는 함수
function populateCarTypes() {
  $.ajax({
    url: "/api/car-types", // 서버의 차량 타입 API 엔드포인트
    method: "GET",
    success: function (response) {
      if (Array.isArray(response)) {
        const carTypeSelect = $("#car-type");
        carTypeSelect.append(
          response.map(
            (type) => `<option value="${type._id}">${type.name}</option>`
          )
        );
      } else {
        console.error("Unexpected response structure for carTypes:", response);
        alert("차량 타입을 불러오는 데 실패했습니다.");
      }
    },
    error: function (err) {
      console.error("차량 타입 불러오기 실패:", err);
      alert("차량 타입을 불러오는 데 실패했습니다.");
    },
  });
}

// 선택된 차량 타입에 따른 차량 모델을 서버에서 불러오는 함수
function populateCarModels(carTypeId) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `/api/car-types/${carTypeId}/models`, // 서버의 차량 모델 API 엔드포인트
      method: "GET",
      success: function (response) {
        if (Array.isArray(response)) {
          const carModelSelect = $("#car-model");
          carModelSelect.html("<option selected>차량 모델 선택</option>");
          carModelSelect.append(
            response.map(
              (model) => `<option value="${model._id}">${model.name}</option>`
            )
          );
          resolve();
        } else {
          // console.error("Unexpected response structure for models:", response);
          // alert("차량 모델을 불러오는 데 실패했습니다.");
          reject("Unexpected response structure for models");
        }
      },
      error: function (err) {
        // console.error("차량 모델 불러오기 실패:", err);
        // alert("차량 모델을 불러오는 데 실패했습니다.");
        reject(err);
      },
    });
  });
}

// 지역을 서버에서 불러오는 함수
function populateRegions() {
  $.ajax({
    url: "/api/regions", // 서버의 지역 API 엔드포인트
    method: "GET",
    success: function (response) {
      if (Array.isArray(response)) {
        const regionSelect = $("#region-select");
        regionSelect.append(
          response.map(
            (region) => `<option value="${region._id}">${region.name}</option>`
          )
        );
      } else {
        console.error("Unexpected response structure for regions:", response);
        alert("지역을 불러오는 데 실패했습니다.");
      }
    },
    error: function (err) {
      console.error("지역 불러오기 실패:", err);
      alert("지역을 불러오는 데 실패했습니다.");
    },
  });
}

// 선택된 지역에 따른 장소를 서버에서 불러오는 함수
function populatePlaces(regionId) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `/api/regions/${regionId}/places`, // 서버의 장소 API 엔드포인트
      method: "GET",
      success: function (response) {
        if (Array.isArray(response)) {
          const placeSelect = $("#place-select");
          placeSelect.html("<option selected>장소 선택</option>");
          placeSelect.append(
            response.map(
              (place) => `<option value="${place._id}">${place.name}</option>`
            )
          );
          resolve();
        } else {
          reject("Unexpected response structure for models");
        }
      },
      error: function (err) {
        reject(err);
      },
    });
  });
}

// 선택된 장소에 따른 주차 위치를 서버에서 불러오는 함수
function populateParkingSpots(placeId) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: `/api/places/${placeId}/parking-spots`, // 서버의 주차 위치 API 엔드포인트
      method: "GET",
      success: function (response) {
        if (Array.isArray(response)) {
          const parkingSpotSelect = $("#parking-spot-select");
          parkingSpotSelect.html("<option selected>주차 위치 선택</option>");
          parkingSpotSelect.append(
            response.map((spot) => `<option value="${spot}">${spot}</option>`)
          );
          resolve();
        } else {
          reject("Unexpected response structure for models");
        }
      },
      error: function (err) {
        reject(err);
      },
    });
  });
}

// 검색 수행 함수
function performSearch() {
  const status = getStatusFilter();
  const assignDate = $("#assign-date").val();
  const carType = $("#car-type").val();
  const carModel = $("#car-model").val();
  const licensePlate = $("#license-plate").val().trim();
  const region = $("#region-select").val();
  const place = $("#place-select").val();
  const parkingSpot = $("#parking-spot-select").val();
  const manager = $("#manager").val().trim(); // 담당자 input에 id="manager" 추가 필요

  const searchParams = {
    status: status,
    assignDate: assignDate,
    carType: carType !== "" ? carType : undefined,
    carModel:
      carModel !== "차량 모델 선택" && carModel !== "" ? carModel : undefined,
    licensePlate: licensePlate !== "" ? licensePlate : undefined,
    region: region !== "" ? region : undefined,
    place: place !== "" ? place : undefined,
    parkingSpot: parkingSpot !== "" ? parkingSpot : undefined,
    manager: manager !== "" ? manager : undefined,
    // page: 1,
    // limit: 10,
  };

  // 빈 값 제거
  Object.keys(searchParams).forEach((key) => {
    if (
      searchParams[key] === undefined ||
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

// 세차 상태 필터 가져오기 함수
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

// 세차 내역 로드 함수
function loadCarList(page = 1, limit = 10, searchParams = {}) {
  const params = {
    page: page,
    limit: limit,
    ...searchParams,
  };

  $.ajax({
    url: "/api/car-registrations", // 서버의 세차 내역 API 엔드포인트
    method: "GET",
    data: params,
    success: function (response) {
      console.log("Received response:", response);
      const tbody = $("#car-list");
      tbody.empty();

      if (!response.cars || response.cars.length === 0) {
        tbody.append(`
            <tr>
              <td colspan="7" class="text-center">등록된 세차 내역이 없습니다.</td>
            </tr>
          `);
        $("#pagination").empty();
        return;
      }

      response.cars.forEach((car) => {
        const row = `
            <tr style="${getStatusStyle(car.status)}">
              <td>
                <input class="form-check-input select-check" type="checkbox" data-id="${
                  car._id
                }" />
              </td>
              <td>${car.licensePlate || "N/A"}</td>
              <td>${car.model || "N/A"}</td>
              <td>${car.location?.place?.name || "N/A"}</td>
              <td>${getStatusText(car.status)}</td>
              <td>${car.manager || "N/A"}</td>
              <td>
                <a href="./car-wash-progress-detail.html?id=${car._id}">
                  <button type="button" class="btn btn-light btn-sm">
                    상세보기
                  </button>
                </a>
              </td>
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

// 세차 상태에 따른 스타일 설정 함수
function getStatusStyle(status) {
  switch (status) {
    case "emergency":
      return "background-color: #ffebee;"; // 연한 빨강
    case "complete":
      return "background-color: #e8f5e9;"; // 연한 초록
    case "pending":
      return "background-color: #e3f2fd;"; // 연한 파랑
    default:
      return "";
  }
}

// 세차 상태 텍스트 변환 함수
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

// 페이지네이션 업데이트 함수
function updatePagination(currentPage, totalPages) {
  const pagination = $("#pagination");
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

  // 페이지 번호 (1~totalPages)
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
  // $(".page-link").on("click", function (e) {
  //   e.preventDefault();
  //   const page = $(this).data("page");
  //   if (page && page >= 1 && page <= totalPages) {
  //     loadCarList(page, 10, currentSearchParams);
  //   }
  // });
}

// 선택 삭제 함수
function deleteCarWash(ids) {
  $.ajax({
    url: "/api/car-registrations/delete", // 서버의 삭제 API 엔드포인트
    method: "DELETE",
    data: JSON.stringify({ ids: ids }),
    contentType: "application/json",
    success: function (response) {
      console.log("삭제 성공:", response);
      alert(response.message || "선택한 세차 내역이 삭제되었습니다.");
      performSearch(); // 삭제 후 재검색
    },
    error: function (err) {
      console.error("삭제 실패:", err);
      alert(err.responseJSON?.error || "세차 내역 삭제에 실패했습니다.");
    },
  });
}

// 엑셀 다운로드 함수
// function downloadExcel(searchParams) {
//   const params = new URLSearchParams(searchParams).toString();
//   window.location.href = `/api/car-registrations/excel?${params}`;
// }

function downloadExcel() {
  const params = new URLSearchParams();
  //   {
  //   type: $("#car-type").val() || "",
  //   model: $("#car-model").val() || "",
  //   licensePlate: $("#license-plate").val() || "",
  //   locationRegion: $("#region-select").val() || "",
  //   locationPlace: $("#place-select").val() || "",
  //   locationParkingSpot: $("#parking-spot-select").val() || "",
  //   customer: $("#customer").val() || "",
  //   manager: $("#manager").val() || "",
  //   status: getStatusFilter(),
  //   assignDate: $("#assign-date").val() || "",
  // }

  const type = $("#car-type").val();
  if (type && type !== "차종 선택") {
    params.append("type", type);
  }

  const model = $("#car-model").val();
  if (model && model !== "차량 모델 선택") {
    params.append("model", model);
  }

  const licensePlate = $("#license-plate").val().trim();
  if (licensePlate) {
    params.append("licensePlate", licensePlate);
  }

  const region = $("#region-select").val();
  if (region && region !== "지역 선택") {
    params.append("locationRegion", region);
  }

  const place = $("#place-select").val();
  if (place && place !== "장소 선택") {
    params.append("locationPlace", place);
  }

  const parkingSpot = $("#parking-spot-select").val();
  if (parkingSpot && parkingSpot !== "주차 위치 선택") {
    params.append("locationParkingSpot", parkingSpot);
  }

  const manager = $("#manager").val().trim();
  if (manager) {
    params.append("manager", manager);
  }

  params.append("status", getStatusFilter());

  const assignDate = $("#assign-date").val();
  if (assignDate) {
    params.append("assignDate", assignDate);
  }

  const token = sessionStorage.getItem("token");
  params.append("token", token);

  window.location.href = `/api/car-registrations/excel?${params.toString()}`;
}

// 인증 상태 확인 및 권한 체크 함수
function checkAuthentication(requiredRole) {
  const token = sessionStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return false;
  }

  try {
    const decoded = jwt_decode(token);
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

// 다음 날 자정에 업데이트 스케줄링 함수 (선택 사항)
function scheduleNextDayUpdate() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const timeUntilMidnight = tomorrow - now;

  setTimeout(() => {
    performSearch();
    scheduleNextDayUpdate(); // 다음 날을 위해 재귀적으로 호출
  }, timeUntilMidnight);
}
