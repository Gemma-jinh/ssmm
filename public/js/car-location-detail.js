$(document).ready(function () {
  const API_BASE_URL = "/api";

  // 1. URL에서 지역 ID 추출
  function getRegionFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("region") || "차량 위치 관리";
  }

  const region = getRegionFromURL();

  // 예시: 지역명을 페이지에 표시
  $("#region-name").text(region);

  if (region !== "차량 위치 관리") {
    $("#page-heading").text(`${region} 차량 위치 관리`);
  }

  // 1. 지역 상세 정보 로드 함수
  function loadLocations(region) {
    $.ajax({
      url: `${API_BASE_URL}/car-locations`,
      method: "GET",
      data: { region },
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
              </tr>
            `;
          locationList.append(row);
        });
      },
      error: function (err) {
        console.error("장소 목록 로드 실패:", err);
        $("#error-message")
          .text("장소 목록을 불러오는 데 실패했습니다.")
          .show();
      },
    });
  }

  loadLocations(); // 페이지 로드 시 장소 목록 로드
});
