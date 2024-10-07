$(document).ready(function () {
  const API_BASE_URL = "http://localhost:5500/api"; // 백엔드 서버 URL

  // 차량 목록 로드 함수
  function loadCarList() {
    $.ajax({
      url: `${API_BASE_URL}/car-registrations`,
      method: "GET",
      success: function (data) {
        const carList = $("#car-list");
        carList.empty(); // 기존 데이터 비우기

        data.forEach((car) => {
          const row = `
              <tr>
                <th><input class="form-check-input select-check-1" type="checkbox" value="${car._id}" /></th>
                <td>${car.location.region}_${car.location.place}</td>
                <td>${car.location.place}</td>
                <td>${car.model.name}</td>
                <td>${car.licensePlate}</td>
                <td>${car.customer}</td>
                <td>
                  <a href="./car-info-modify.html?id=${car._id}">
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

  loadCarList(); // 페이지 로드 시 차량 목록 로드

  // 추가: 차량 삭제 기능 구현 (선택된 차량 삭제)
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
    // 예시: DELETE /api/car-registrations (백엔드에 DELETE 엔드포인트 구현 필요)
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
