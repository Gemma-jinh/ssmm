$(document).ready(function () {
  const API_BASE_URL = "/api";

  // 1. URL에서 지역 ID 추출
  function getLocationIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  const locationId = getLocationIdFromURL();

  if (!locationId) {
    alert("유효한 지역 ID가 제공되지 않았습니다.");
    window.location.href = "./car-location.html"; // 차량 위치 관리 페이지로 이동
  }

  // 1. 지역 상세 정보 로드 함수
  function loadLocations(id) {
    $.ajax({
      url: `${API_BASE_URL}/car-locations/${id}`,
      method: "GET",
      success: function (data) {
        const locationList = $("#location-list");
        locationList.empty(); // 기존 데이터 비우기

        if (data.length === 0) {
          locationList.append(
            '<tr><td colspan="2" class="text-center">등록된 지역이 없습니다.</td></tr>'
          );
          return;
        }

        data.forEach((location) => {
          const row = `
              <tr>
                <td>${location.name}</td>
                <td style="text-align: center;">
                  <a href="./car-location-detail.html?id=${location._id}">
                    <button type="button" class="btn btn-outline-primary btn-sm">상세보기</button>
                  </a>
                </td>
              </tr>
            `;
          locationList.append(row);
        });
      },
      error: function (err) {
        console.error("지역 목록 로드 실패:", err);
        $("#error-message")
          .text("지역 목록을 불러오는 데 실패했습니다.")
          .show();
      },
    });
  }

  loadLocations(); // 페이지 로드 시 지역 목록 로드
});
