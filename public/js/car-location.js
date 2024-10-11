$(document).ready(function () {
  const API_BASE_URL = "/api";

  // 1. 지역 목록 로드 함수
  function loadLocations() {
    $.ajax({
      url: `${API_BASE_URL}/car-locations`,
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
