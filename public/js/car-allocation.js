const API_BASE_URL = "/api"; // 백엔드 서버 URL

let currentSearchParams = {};

$.ajaxSetup({
  beforeSend: function (xhr) {
    const token = sessionStorage.getItem("token");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
  },
});

// 초기 차량 목록 로딩 및 필드 초기화
$(document).ready(function () {
  initializeSearchFields();
  loadManagers();
  loadTeams();
  loadCarList(1, 10, currentSearchParams);

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
      loadCarList(page, 10, currentSearchParams);
    }
  });

  // 배정 완료 버튼 클릭 이벤트 핸들러
  $("#assign-button").on("click", function () {
    const selectedCars = getSelectedCars();
    const managerId = $("#assign-manager").val();
    const teamId = $("#assign-team").val();
    const assignDate = $("#assign-date").val();

    if (selectedCars.length === 0) {
      alert("배정할 차량을 선택해주세요.");
      return;
    }

    if (!managerId) {
      alert("배정할 담당자를 선택해주세요.");
      return;
    }

    if (!teamId) {
      alert("배정할 팀을 선택해주세요.");
      return;
    }

    if (!assignDate) {
      alert("날짜를 선택해주세요.");
      return;
    }
    // 배정 요청 보내기
    assignCars(selectedCars, managerId, teamId, assignDate);
  });
});

// "배정 변경" 버튼 클릭 이벤트 핸들러
// document.ready 블록 내, assignCars 함수 외부에 위치해야 동작한다.
$(document).on("click", ".change-assignment-button", function () {
  const carId = $(this).data("car-id");
  if (carId) {
    window.location.href = `car-allocation-modify.html?id=${carId}`;
  } else {
    alert("차량 ID를 찾을 수 없습니다.");
  }
});

// 담당자 선택 시 이름 표시
$("#assign-manager").on("change", function () {
  const selectedManagerId = $(this).val();
  const selectedManagerName = $(this).find("option:selected").text();
  if (selectedManagerId) {
    $("#selected-manager-name").text(`담당자: ${selectedManagerName}`);
  } else {
    $("#selected-manager-name").text("");
  }
});

// 팀 선택 시 이름 표시
$("#assign-team").on("change", function () {
  const selectedTeamId = $(this).val();
  const selectedTeamName = $(this).find("option:selected").text();
  if (selectedTeamId) {
    $("#selected-team-name").text(`팀: ${selectedTeamName}`);
  } else {
    // 팀을 선택하지 않았을 때 기본값 설정
    $("#selected-team-name").text("팀: 기본 팀"); // 원하는 기본 팀명으로 변경
  }
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

// 차종 목록 로드
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
        if (carType._id && carType.name) {
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

// 고객사 목록 로드
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
        if (customer._id && customer.name) {
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

// 지역 목록 로드
function loadRegions() {
  $.ajax({
    url: `${API_BASE_URL}/regions`,
    method: "GET",
    success: function (data) {
      console.log("지역 목록:", data); // 지역 목록 출력

      const regionSelect = $("#region-select");
      regionSelect
        .empty()
        .append('<option value="" selected>지역 선택</option>');
      data.forEach((region) => {
        if (region._id && region.name) {
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

// 차량 모델 목록 로드
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
      const carModelSelect = $("#car-model");
      carModelSelect
        .empty()
        .append('<option value="" selected>차량 모델 선택</option>');
      data.forEach((model) => {
        if (model._id && model.name) {
          const option = `<option value="${model._id}">${model.name}</option>`;
          carModelSelect.append(option);
        } else {
          console.warn("Invalid model data:", model);
        }
      });
      carModelSelect.prop("disabled", false);
    },
    error: function (err) {
      console.error("차량 모델 로드 실패:", err);
      alert("차량 모델을 로드하는 데 실패했습니다.");
    },
  });
}

// 장소 목록 로드
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
      const placeSelect = $("#place-select");
      placeSelect
        .empty()
        .append('<option value="" selected>장소 선택</option>');
      data.forEach((place) => {
        if (place._id && place.name) {
          const option = `<option value="${place._id}">${place.name}</option>`;
          placeSelect.append(option);
        } else {
          console.warn("Unexpected place format:", place);
        }
      });
      placeSelect.prop("disabled", false);
    },
    error: function (err) {
      console.error("장소 로드 실패:", err);
      alert("장소를 로드하는 데 실패했습니다.");
    },
  });
}

// 주차 위치 목록 로드 (예시)
// function loadParkingSpots(placeId) {
//   if (!placeId) {
//     $("#parking-spot-select")
//       .empty()
//       .append('<option value="" selected>주차 위치 선택</option>')
//       .prop("disabled", true);
//     return;
//   }

//   const parkingSpots = ["A-1", "A-2", "B-1", "B-2"];

//   const parkingSpotSelect = $("#parking-spot-select");
//   parkingSpotSelect
//     .empty()
//     .append('<option value="" selected>주차 위치 선택</option>');
//   parkingSpots.forEach((spot) => {
//     const option = `<option value="${spot}">${spot}</option>`;
//     parkingSpotSelect.append(option);
//   });
//   parkingSpotSelect.prop("disabled", false);
// }
function loadParkingSpots(placeId) {
  if (!placeId) {
    const select = $("#parking-spot-select");
    select.empty().append('<option value="" selected>주차 위치 선택</option>');
    select.prop("disabled", true);
    return;
  }
  $.ajax({
    url: `${API_BASE_URL}/places/${placeId}/parking-spots`,
    method: "GET",
    success: function (data) {
      const select = $("#parking-spot-select");
      select
        .empty()
        .append('<option value="" selected>주차 위치 선택</option>');
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
      const select = $("#parking-spot-select");
      select
        .empty()
        .append('<option value="" selected>주차 위치 선택</option>');
      select.prop("disabled", true);
    },
  });
}
// 담당자 목록 로드
function loadManagers() {
  $.ajax({
    url: `${API_BASE_URL}/managers`, // 백엔드에 담당자 목록 API 엔드포인트 필요
    method: "GET",
    success: function (data) {
      console.log("담당자 목록:", data);

      const managerSelect = $("#assign-manager");
      managerSelect.find('option:not([value=""])').remove();

      data.forEach((manager) => {
        if (manager._id && manager.name) {
          const option = `<option value="${manager._id}">${manager.name}</option>`;
          managerSelect.append(option);
        } else {
          console.warn("Unexpected manager format:", manager);
        }
      });
    },
    error: function (err) {
      console.error("담당자 목록 로드 실패:", err);
      alert("담당자 목록을 불러오는 데 실패했습니다.");
    },
  });
}

// 팀 목록 로드
function loadTeams() {
  $.ajax({
    url: `${API_BASE_URL}/teams`, // 백엔드에 팀 목록 API 엔드포인트 필요
    method: "GET",
    success: function (data) {
      console.log("팀 목록:", data);

      const teamSelect = $("#assign-team");
      teamSelect.empty().append('<option value="" selected>선택</option>');

      data.forEach((team) => {
        if (team._id && team.name) {
          const option = `<option value="${team._id}">${team.name}</option>`;
          teamSelect.append(option);
        } else {
          console.warn("Unexpected team format:", team);
        }
      });

      // 기본 팀 선택 (예시: 첫 번째 팀을 기본 선택)
      if (data.length > 0) {
        const firstTeam = data[0];
        teamSelect.val(firstTeam._id).trigger("change");
      }
    },
    error: function (err) {
      console.error("팀 목록 로드 실패:", err);
      alert("팀 목록을 불러오는 데 실패했습니다.");
    },
  });
}

// 차량 목록 로드 함수
function loadCarList(page = 1, limit = 10, searchParams = {}) {
  // 페이징 파라미터 추가
  searchParams.page = page;
  searchParams.limit = limit;

  $.ajax({
    url: `${API_BASE_URL}/car-registrations`,
    method: "GET",
    data: searchParams, // 검색 파라미터를 요청에 포함
    success: function (data) {
      const carList = $("#car-list");
      carList.empty(); // 기존 데이터 비우기

      if (!data.cars || data.cars.length === 0) {
        carList.append(
          '<tr><td colspan="7" class="text-center">등록된 차량이 없습니다.</td></tr>'
        );
        $(".pagination").empty(); // 페이징 네비게이션도 비움
        return;
      }

      data.cars.forEach((car) => {
        // 디버깅: 문제 되는 차량 객체 로그 출력
        // if (!car.customer) {
        //   console.warn(`차량 ID ${car._id}에 고객사 정보가 없습니다.`);
        // }
        // if (!car.model) {
        //   console.warn(`차량 ID ${car._id}에 차량 모델 정보가 없습니다.`);
        // }
        // const customerName = car.customer ? car.customer.name : "N/A";
        // const modelName = car.model ? car.model.name : "N/A";
        // const placeName = car.location.place ? car.location.place.name : "N/A";
        // const address =
        //   car.location.place && car.location.place.address
        //     ? car.location.place.address
        //     : "N/A";
        const modelName = car.model || "N/A";
        const customerName = car.customer || "N/A";
        const placeName = car.location?.place?.name || "N/A";
        const address = car.location?.place?.address || "N/A";

        const row = `
          <tr>
            <th><input class="form-check-input select-check-1" type="checkbox" value="${
              car._id
            }" /></th>
            <td>${placeName}</td>
            <td>${address}</td>
            <td>${modelName}</td>
            <td>${car.licensePlate || "N/A"}</td>
            <td>${customerName}</td>
             <td>
              <button type="button" class="btn btn-secondary btn-sm change-assignment-button" data-car-id="${
                car._id
              }">
                배정 변경
              </button>
            </td>
          </tr>
        `;
        carList.append(row);
      });

      // 페이징 네비게이션 업데이트
      renderPagination(data.page, data.totalPages);
    },
    error: function (err) {
      console.error("차량 목록 로드 실패:", err);
      alert("차량 목록을 불러오는 데 실패했습니다.");
      $("#loading-spinner").hide(); // 로딩 스피너 숨김
    },
  });
}

// 페이징 네비게이션 렌더링 함수
function renderPagination(currentPage, totalPages) {
  const pagination = $(".pagination");
  pagination.empty(); // 기존 페이징 네비게이션 비우기

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
      <li class="page-item ">
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

// 검색 수행 함수
function performSearch() {
  // 검색 조건 수집
  const searchParams = {
    type: $("#car-type").val(), // 차종
    model: $("#car-model").val(), // 차량 모델
    licensePlate: $("#license-plate").val().trim(), // 차량 번호
    locationRegion: $("#region-select").val(), // 지역
    locationPlace: $("#place-select").val(), // 장소
    locationParkingSpot: $("#parking-spot-select").val(), // 주차 위치
    customer: $("#customer-select").val(), // 고객사
    manager: $("#manager-select").val(),
    // status: $("#status-select").val(),
    assignDate: $("#assign-date").val(),
  };

  Object.keys(searchParams).forEach((key) => {
    if (
      !searchParams[key] ||
      searchParams[key] === "차종 선택" ||
      searchParams[key] === "차량 모델 선택" ||
      searchParams[key] === "지역 선택" ||
      searchParams[key] === "장소 선택" ||
      searchParams[key] === "주차 위치 선택" ||
      searchParams[key] === "날짜 선택"
    ) {
      delete searchParams[key];
    }
  });
  // 검색 파라미터 객체 생성

  // if (carType) searchParams.carType = carType;
  // if (carModel) searchParams.carModel = carModel;
  // if (carNumber) searchParams.licensePlate = carNumber;
  // if (region) searchParams["location.region"] = region;
  // if (place) searchParams["location.place"] = place;
  // if (parkingSpot) searchParams["location.parkingSpot"] = parkingSpot;
  // if (customer) searchParams.customer = customer;
  // if (workDate) searchParams.workDate = workDate;
  // loadCarList(searchParams, 1, 10);
  console.log("Search params:", searchParams); // 디버깅을 위한 로그

  currentSearchParams = searchParams;

  loadCarList(1, 10, searchParams);
}

// 전체 선택 체크박스
function clickAllCheck(masterCheckboxSelector, targetCheckboxSelector) {
  $(masterCheckboxSelector).on("change", function () {
    $(targetCheckboxSelector).prop("checked", this.checked);
  });
}

// 개별 체크박스 클릭 시 전체 체크박스 상태 변경
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

// 배정 기능 구현 (선택된 차량을 담당자 또는 팀에 배정)
function getSelectedCars() {
  return $(".select-check-1:checked")
    .map(function () {
      return $(this).val();
    })
    .get();
}

// 배정 요청 보내기
function assignCars(carIds, managerId, teamId, assignDate) {
  // const assignDate = $("#assign-date").val();
  // if (!assignDate) {
  //   alert("날짜를 선택해주세요.");
  //   return;
  // }
  $.ajax({
    url: `${API_BASE_URL}/car-registrations/assign`,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      carIds: carIds,
      managerId: managerId,
      teamId: teamId,
      assignDate: assignDate,
    }),
    success: function () {
      alert("선택된 차량이 배정되었습니다.");
      loadCarList(1, 10, {}); // 목록 다시 로드
      // 전체 선택 체크박스 해제
      $("#flexCheckDefault").prop("checked", false);
      $("#assign-date").val("");
    },
    error: function (err) {
      console.error("차량 배정 실패:", err);
      alert("차량 배정에 실패했습니다.");
    },
  });
}
