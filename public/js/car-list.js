const API_BASE_URL = "/api"; // 백엔드 서버 URL
//초기 차량 목록 로딩
$(document).ready(function () {
  initializeSearchFields();
  loadCarList();

  // 검색 버튼 클릭 이벤트 핸들러
  $("#search-button").on("click", function () {
    performSearch();
  });

  // 전체 선택 체크박스 이벤트 핸들러
  clickAllCheck("#flexCheckDefault", ".select-check-1");
  clickSingleCheck("#flexCheckDefault", ".select-check-1");

  // 페이징 링크 클릭 이벤트 핸들러
  $(document).on("click", ".pagination a.page-link", function (e) {
    e.preventDefault();
    const page = $(this).data("page");
    if (page) {
      loadCarList({}, page, 10);
    }
  });
});

// 검색 필드 초기화 함수
function initializeSearchFields() {
  loadCarTypes();
  loadCustomers();
  loadRegions();

  // 차량 모델과 장소 선택 시 해당 목록을 로드하도록 이벤트 핸들러 추가
  $("#car-type").on("change", function () {
    const selectedTypeId = $(this).val();
    if (selectedTypeId) {
      loadCarModels(selectedTypeId);
    } else {
      $("#car-model")
        .empty()
        .append('<option value="" selected>차량 모델 선택</option>')
        .prop("disabled", true);
    }
  });

  $("#region-select").on("change", function () {
    const selectedRegionId = $(this).val();
    if (selectedRegionId) {
      loadPlaces(selectedRegionId);
    } else {
      $("#place-select")
        .empty()
        .append('<option value="" selected>장소 선택</option>')
        .prop("disabled", true);
      $("#parking-spot-select")
        .empty()
        .append('<option value="" selected>주차 위치 선택</option>')
        .prop("disabled", true);
    }
  });

  $("#place-select").on("change", function () {
    const selectedPlaceId = $(this).val();
    if (selectedPlaceId) {
      loadParkingSpots(selectedPlaceId);
    } else {
      $("#parking-spot-select")
        .empty()
        .append('<option value="" selected>주차 위치 선택</option>')
        .prop("disabled", true);
    }
  });
}

// 차종 목록 로드(검색)
function loadCarTypes() {
  $.ajax({
    url: `${API_BASE_URL}/car-types`,
    method: "GET",
    success: function (data) {
      console.log("차종 목록:", data); // 차종 목록 출력

      const carTypeSelect = $("#car-type");
      // 기존 옵션 삭제 (차종 선택 제외)
      carTypeSelect.find('option:not([value=""])').remove();

      // 새로운 차종 옵션 추가
      data.forEach((carType) => {
        if (typeof carType === "object" && carType.name) {
          const option = `<option value="${carType._id}">${carType.name}</option>`;
          carTypeSelect.append(option);
        } else {
          console.warn("Unexpected carType format:", carType);
        }
      });
    },
    error: function (err) {
      console.error("차종 목록 로드 실패:", err);
      alert("차종 목록을 불러오는 데 실패했습니다.");
    },
  });
}

// 고객사 목록 로드 함수
function loadCustomers() {
  $.ajax({
    url: `${API_BASE_URL}/customers`,
    method: "GET",
    success: function (data) {
      console.log("고객사 목록:", data); // 고객사 목록 출력

      const customerSelect = $("#customer-select");
      // 기존 옵션 삭제 (선택 제외)
      customerSelect.find('option:not([value=""])').remove();

      // 새로운 고객사 옵션 추가
      data.forEach((customer) => {
        if (typeof customer === "object" && customer.name) {
          const option = `<option value="${customer._id}">${customer.name}</option>`;
          customerSelect.append(option);
        } else {
          console.warn("Unexpected customer format:", customer);
        }
      });
    },
    error: function (err) {
      console.error("고객사 목록 로드 실패:", err);
      alert("고객사 목록을 불러오는 데 실패했습니다.");
    },
  });
}

// 지역 목록 로드 함수
function loadRegions() {
  $.ajax({
    url: `${API_BASE_URL}/regions`,
    method: "GET",
    success: function (data) {
      console.log("지역 목록:", data); // 지역 목록 출력

      const regionSelect = $("#region-select");
      regionSelect.empty().append('<option value="" selected>전체</option>');
      data.forEach((region) => {
        if (typeof region === "object" && region.name) {
          const option = `<option value="${region._id}">${region.name}</option>`;
          regionSelect.append(option);
        } else {
          console.warn("Unexpected region format:", region);
        }
      });
    },
    error: function (err) {
      console.error("지역 목록 로드 실패:", err);
      alert("지역 목록을 불러오는 데 실패했습니다.");
    },
  });
}

// 차량 모델 목록 로드 함수
function loadCarModels(typeId) {
  if (!typeId) {
    $("#car-model")
      .empty()
      .append('<option value="" selected>차량 모델 선택</option>')
      .prop("disabled", true);
    return;
  }

  $.ajax({
    url: `${API_BASE_URL}/car-types/${typeId}/models`,
    method: "GET",
    success: function (data) {
      $("#car-model")
        .empty()
        .append('<option value="" selected>차량 모델 선택</option>');
      data.forEach((model) => {
        if (typeof model === "object" && model.name) {
          const option = `<option value="${model._id}">${model.name}</option>`;
          $("#car-model").append(option);
        } else {
          console.warn("Unexpected carModel format:", model);
        }
      });
      $("#car-model").prop("disabled", false);
    },
    error: function (err) {
      console.error("차량 모델 로드 실패:", err);
      alert("차량 모델을 로드하는 데 실패했습니다.");
    },
  });
}

// 장소 목록 로드 함수
function loadPlaces(regionId) {
  if (!regionId) {
    $("#place-select")
      .empty()
      .append('<option value="" selected>장소 선택</option>')
      .prop("disabled", true);
    $("#parking-spot-select")
      .empty()
      .append('<option value="" selected>주차 위치 선택</option>')
      .prop("disabled", true);
    return;
  }

  $.ajax({
    url: `${API_BASE_URL}/regions/${regionId}/places`,
    method: "GET",
    success: function (data) {
      $("#place-select")
        .empty()
        .append('<option value="" selected>장소 선택</option>');
      data.forEach((place) => {
        if (typeof place === "object" && place.name) {
          const option = `<option value="${place._id}">${place.name}</option>`;
          $("#place-select").append(option);
        } else {
          console.warn("Unexpected place format:", place);
        }
      });
      $("#place-select").prop("disabled", false);
    },
    error: function (err) {
      console.error("장소 로드 실패:", err);
      alert("장소를 로드하는 데 실패했습니다.");
    },
  });
}

// 주차 위치 목록 로드 함수 (필요 시 API 추가)
function loadParkingSpots(placeId) {
  if (!placeId) {
    $("#parking-spot-select")
      .empty()
      .append('<option value="" selected>주차 위치 선택</option>')
      .prop("disabled", true);
    return;
  }

  // 주차 위치 목록을 동적으로 로드하려면 백엔드 API가 필요.
  // 예를 들어, /api/places/:placeId/parking-spots 엔드포인트를 추가.
  // 여기서는 예시로 고정된 값을 사용.

  // 예시 주차 위치 목록
  const parkingSpots = ["A-1", "A-2", "B-1", "B-2"];

  $("#parking-spot-select")
    .empty()
    .append('<option value="" selected>주차 위치 선택</option>');
  parkingSpots.forEach((spot) => {
    const option = `<option value="${spot}">${spot}</option>`;
    $("#parking-spot-select").append(option);
  });
  $("#parking-spot-select").prop("disabled", false);
}

// 차량 목록 로드 함수
function loadCarList(searchParams = {}, page = 1, limit = 10) {
  // 페이징 파라미터 추가
  searchParams.page = page;
  searchParams.limit = limit;
  $.ajax({
    url: `${API_BASE_URL}/car-registrations`,
    method: "GET",
    data: searchParams, //검색 파라미터를 요청에 포함
    success: function (data) {
      const carList = $("#car-list");
      carList.empty(); // 기존 데이터 비우기

      // const pagination = $("#pagination");
      // pagination.empty();

      if (data.cars.length === 0) {
        carList.append(
          '<tr><td colspan="7" class="text-center">등록된 차량이 없습니다.</td></tr>'
        );
        $(".pagination").empty(); // 페이징 네비게이션도 비움
        return;
      }

      data.cars.forEach((car) => {
        const customerName = car.customer ? car.customer.name : "N/A";
        const modelName = car.model ? car.model.name : "N/A";

        // 디버깅: 문제 되는 차량 객체 로그 출력
        if (!car.customer) {
          console.warn(`차량 ID ${car._id}에 고객사 정보가 없습니다.`);
        }
        if (!car.model) {
          console.warn(`차량 ID ${car._id}에 차량 모델 정보가 없습니다.`);
        }

        // 지역명과 장소명만 표시하도록 수정
        const regionName = car.location.region
          ? car.location.region.name
          : "N/A";
        const placeName = car.location.place ? car.location.place.name : "N/A";

        const address =
          car.location.place && car.location.place.address
            ? car.location.place.address
            : "N/A";

        const row = `
              <tr>
                <th><input class="form-check-input select-check-1" type="checkbox" value="${car._id}" /></th>
                <td>${placeName}</td>
                <td>${address}</td>
                <td>${modelName}</td>
                <td>${car.licensePlate}</td>
                <td>${customerName}</td>
                <td>
                  <a href="../pages/car-info-modify.html?id=${car._id}">
                    <button type="button" class="btn btn-light btn-sm">수정</button>
                  </a>
                </td>
              </tr>
            `;
        carList.append(row);
      });

      // 페이징 렌더링
      renderPagination(data.Page, data.totalPages);
    },
    error: function (err) {
      console.error("차량 목록 로드 실패:", err);
      alert("차량 목록을 불러오는 데 실패했습니다.");
    },
  });
}

// 페이징 렌더링 함수
function renderPagination(currentPage, totalPages) {
  const pagination = $(".pagination");
  pagination.empty(); // 기존 페이징 네비게이션 비우기

  // 이전 페이지 버튼
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
  // 페이지 번호 버튼
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

  // 다음 페이지 버튼
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
}

// 페이징 링크 클릭 이벤트 핸들러
// $(".page-link")
//   .off("click")
//   .on("click", function (e) {
//     e.preventDefault();
//     const selectedPage = parseInt($(this).data("page"));

//     if (
//       isNaN(selectedPage) ||
//       selectedPage < 1 ||
//       selectedPage > totalPages
//     ) {
//       return;
//     }

// 현재 검색 조건을 유지하면서 선택된 페이지의 데이터를 로드
//       const searchParams = getSearchParams();
//       loadCarList(searchParams, selectedPage, 10); // limit을 필요에 따라 조정
//     });
// }

// 검색 수행 함수
function performSearch() {
  // 검색 조건 수집
  const carType = $("#car-type").val(); // 첫 번째 select: 차종
  const carModel = $("#car-model").val(); // 두 번째 select: 차량 모델
  const carNumber = $("#license-plate]").val().trim(); // 차량 번호
  const region = $("#region-select").val(); // 지역 선택
  const place = $("#place-select").val(); // 장소 선택
  const parkingSpot = $("#parking-spot-select").val(); // 주차 위치 선택
  const customer = $("#customer-select").val(); // 고객사 선택
  const manager = $("#manager-input").val().trim(); // 담당자

  // 검색 파라미터 객체 생성
  const searchParams = {};

  if (carType) searchParams.carType = carType;
  if (carModel) searchParams.carModel = carModel;
  if (carNumber) searchParams.licensePlate = carNumber;
  if (region) searchParams["location.region"] = region;
  if (place) searchParams["location.place"] = place;
  if (parkingSpot) searchParams["location.parkingSpot"] = parkingSpot;
  if (customer) searchParams.customer = customer;
  if (manager) searchParams.manager = manager;

  // carType: carType !== "" ? carType : "",
  // carModel: carModel !== "차량 모델 선택" ? carModel : "",
  // carNumber: carNumber.trim(),
  // "location.region": region !== "지역 선택" ? region : "",
  // "location.place": location !== "장소 선택" ? location : "",
  // "location.parkingSpot": parkingSpot !== "주차 위치 선택" ? parkingSpot : "",
  // customer: customer !== "선택" ? customer : "",
  // manager: manager.trim(),

  loadCarList(searchParams, 1, 10); // 페이지 로드 시 차량 목록 로드
}
// 전체 선택 체크박스
// $("#flexCheckDefault").on("change", function () {
//   $(".select-check-1").prop("checked", this.checked);
// });
function clickAllCheck(masterCheckboxSelector, targetCheckboxSelector) {
  $(masterCheckboxSelector).on("change", function () {
    $(targetCheckboxSelector).prop("checked", this.checked);
  });
}

// 개별 체크박스 클릭 시 전체 체크박스 상태 변경
// $(document).on("change", ".select-check-1", function () {
//   if (!this.checked) {
//     $("#flexCheckDefault").prop("checked", false);
//   }
//   if ($(".select-check-1:checked").length === $(".select-check-1").length) {
//     $("#flexCheckDefault").prop("checked", true);
//   }
// });
function clickSingleCheck(masterCheckboxSelector, targetCheckboxSelector) {
  $(document).on("change", targetCheckboxSelector, function () {
    if (!this.checked) {
      $(masterCheckboxSelector).prop("checked", false);
    }
    if (
      $(targetCheckboxSelector + ":checked").length ===
      $(targetCheckboxSelector).length
    ) {
      $(masterCheckboxSelector).prop("checked", true);
    }
  });
}

// 차량 삭제 기능 구현 (선택된 차량 삭제)
$(document).ready(function () {
  $("#delete-button").on("click", function () {
    const selectedCars = $(".select-check-1:checked")
      .map(function () {
        return $(this).val();
      })
      .get();

    if (selectedCars.length === 0) {
      alert("삭제할 차량을 선택해주세요.");
      return;
    }

    if (!confirm(`${selectedCars.length}개의 차량을 삭제하시겠습니까?`)) {
      return;
    }

    // 삭제 요청 보내기 (삭제 API가 필요)
    $.ajax({
      url: `${API_BASE_URL}/car-registrations`,
      method: "DELETE",
      contentType: "application/json",
      data: JSON.stringify({ ids: selectedCars }),
      success: function () {
        alert("선택된 차량이 삭제되었습니다.");
        loadCarList(); // 목록 다시 로드
      },
      error: function (err) {
        console.error("차량 삭제 실패:", err);
        alert("차량 삭제에 실패했습니다.");
      },
    });
  });
});
