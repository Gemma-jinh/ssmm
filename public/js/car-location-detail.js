$(document).ready(function () {
  const API_BASE_URL = "/api";

  // 1. URL에서 region 추출
  function getRegionFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("region");
  }

  const region = getRegionFromURL();

  if (!region) {
    $("#error-message").text("지역 정보가 제공되지 않았습니다.").show();
    return;
  }

  // 2. 페이지 제목 설정
  $("#detail-heading").text(`${region} 차량 위치 관리`);

  // 1. 지역 상세 정보 로드 함수
  function loadPlaces(region) {
    $.ajax({
      url: `${API_BASE_URL}/car-locations`,
      method: "GET",
      data: { region },
      success: function (data) {
        const placeDetailList = $("#place-detail-list");
        placeDetailList.empty(); // 기존 데이터 비우기

        if (data.length === 0) {
          placeDetailList.append(
            '<tr><td colspan="2" class="text-center">등록된 장소가 없습니다.</td></tr>'
          );
          return;
        }

        data.forEach((place) => {
          const row = `
              <tr>
                <td>${place.name}</td>
                <td>${place.address}</td>
                <td style="text-align: center;">
                 <a href="./car-location-edit.html?id=${
                   place._id
                 }&region=${encodeURIComponent(region)}">
                <button type="button" class="btn btn-outline-danger btn-sm delete-btn" data-id="${
                  place._id
                }">삭제</button>
                </td>
              </tr>
            `;
          placeDetailList.append(row);
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

  loadPlaces(region); // 페이지 로드 시 해당 지역의 장소 리스트 로드

  // 4. 삭제 버튼 클릭 이벤트
  $(document).on("click", ".delete-btn", function () {
    const id = $(this).data("id");
    if (confirm("해당 장소를 삭제하시겠습니까?")) {
      $.ajax({
        url: `${API_BASE_URL}/car-locations/${id}`,
        method: "DELETE",
        success: function (data) {
          $("#success-message").text(data.message).show();
          // 장소 리스트 갱신
          loadPlaces(region);
        },
        error: function (err) {
          console.error("장소 삭제 실패:", err);
          $("#error-message").text("장소를 삭제하는 데 실패했습니다.").show();
        },
      });
    }
  });
});
