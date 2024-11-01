$(document).ready(function () {
  const API_BASE_URL = "/api"; // 백엔드 서버 URL

  // JWT 토큰 가져오기
  function getToken() {
    return localStorage.getItem("token"); // 로그인 시 저장한 토큰
  }
  // 차량 목록 로드 함수
  function loadCarList() {
    $.ajax({
      url: `${API_BASE_URL}/car-registrations`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${getToken()}`, // JWT 토큰 추가
      },
      success: function (response) {
        console.log("서버 응답:", response);

        const carList = $("#car-list");
        carList.empty(); // 기존 데이터 비우기

        // 데이터 구조에 따라 처리
        const carsArray = Array.isArray(response)
          ? response
          : response.data
          ? response.data
          : response.cars
          ? response.cars
          : [];

        if (carsArray.length === 0) {
          carList.append(
            '<tr><td colspan="7" class="text-center">등록된 차량이 없습니다.</td></tr>'
          );
          return;
        }

        carsArray.forEach((car) => {
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
        if (err.status === 401) {
          alert("로그인이 필요합니다.");
          // 로그인 페이지로 리다이렉트
          window.location.href = "/pages/login.html";
        } else {
          console.error("차량 목록 로드 실패:", err);
          alert("차량 목록을 불러오는 데 실패했습니다.");
        }
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
      headers: {
        Authorization: `Bearer ${getToken()}`, // JWT 토큰 추가
      },
      contentType: "application/json",
      data: JSON.stringify({ ids: selectedCars }),
      success: function () {
        alert("선택된 차량이 삭제되었습니다.");
        loadCarList(); // 목록 다시 로드
      },
      error: function (err) {
        if (err.status === 401) {
          alert("로그인이 필요합니다.");
          window.location.href = "/pages/login.html";
        } else {
          console.error("차량 삭제 실패:", err);
          alert("차량 삭제에 실패했습니다.");
        }
      },
    });
  });
});
