const API_BASE_URL = "/api"; // 백엔드 서버 URL
//초기 차량 목록 로딩
$(document).ready(function () {
  loadCarTypes();

  loadCarList();

  // 검색 버튼 클릭 이벤트 핸들러
  $("#search-button").on("click", function () {
    performSearch();
  });

  // 전체 선택 체크박스 이벤트 핸들러
  clickAllCheck("#flexCheckDefault", ".select-check-1");
  clickSingleCheck("#flexCheckDefault", ".select-check-1");
});

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

// 차량 목록 로드 함수
function loadCarList(searchParams = {}) {
  $.ajax({
    url: `${API_BASE_URL}/car-registrations`,
    method: "GET",
    data: searchParams, //검색 파라미터를 요청에 포함
    success: function (data) {
      const carList = $("#car-list");
      carList.empty(); // 기존 데이터 비우기

      if (data.length === 0) {
        carList.append(
          '<tr><td colspan="7" class="text-center">등록된 차량이 없습니다.</td></tr>'
        );
        return;
      }

      data.forEach((car) => {
        const row = `
              <tr>
                <th><input class="form-check-input select-check-1" type="checkbox" value="${car._id}" /></th>
                <td>${car.location.region}_${car.location.place}</td>
                <td>${car.location.place}</td>
                <td>${car.model.name}</td>
                <td>${car.licensePlate}</td>
                <td>${car.customer.name}</td>
                <td>
                  <a href="../pages/car-info-modify.html?id=${car._id}">
                    <button type="button" class="btn btn-light btn-sm">수정</button>
                  </a>
                </td>
              </tr>
            `;
        carList.append(row);
      });
    },
    error: function (err) {
      console.error("차량 목록 로드 실패:", err);
      alert("차량 목록을 불러오는 데 실패했습니다.");
    },
  });
}

// 검색 수행 함수
function performSearch() {
  // 검색 조건 수집
  const carType = $("#car-type").val(); // 첫 번째 select: 차종
  const carModel = $("select").eq(1).val(); // 두 번째 select: 차량 모델
  const carNumber = $('input[type="text"]').eq(0).val(); // 차량 번호
  const region = $("select").eq(2).val(); // 지역 선택
  const location = $("select").eq(3).val(); // 장소 선택
  const parkingSpot = $("select").eq(4).val(); // 주차 위치 선택
  const customer = $("select").eq(5).val(); // 고객사 선택
  const manager = $('input[type="text"]').eq(1).val(); // 담당자

  // 검색 파라미터 객체 생성
  const searchParams = {
    carType: carType !== "" ? carType : "",
    carModel: carModel !== "차량 모델 선택" ? carModel : "",
    carNumber: carNumber.trim(),
    "location.region": region !== "지역 선택" ? region : "",
    "location.place": location !== "장소 선택" ? location : "",
    "location.parkingSpot": parkingSpot !== "주차 위치 선택" ? parkingSpot : "",
    customer: customer !== "선택" ? customer : "",
    manager: manager.trim(),
  };

  loadCarList(searchParams); // 페이지 로드 시 차량 목록 로드
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
