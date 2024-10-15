$(document).ready(function () {
  const API_BASE_URL = "/api";

  // 1. URL에서 region 추출
  function getRegionIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    const region = params.get("region");
    return region ? decodeURIComponent(region) : null;
    // return params.get("region");
  }

  const region = getRegionIdFromURL();

  // 디버깅용 로그 추가
  console.log("추출된 region:", region);
  console.log("region 타입:", typeof region);

  if (!region) {
    $("#error-message").text("지역 정보가 제공되지 않았습니다.").show();
    return;
  }

  // 2. 페이지 제목 설정
  $.ajax({
    url: `${API_BASE_URL}/regions/name/${encodeURIComponent(region)}`,
    method: "GET",
    success: function (regionData) {
      $("#detail-heading").text(`${regionData.name} 차량 위치 관리`);
    },
    error: function (err) {
      console.error("지역 정보 로드 실패:", err);
      $("#error-message").text("지역 정보를 불러오는 데 실패했습니다.").show();
    },
  });

  // 1. 지역 상세 정보 로드 함수
  function loadPlaces(region) {
    $.ajax({
      url: `${API_BASE_URL}/regions/name/${encodeURIComponent(region)}/places`,
      method: "GET",
      success: function (data) {
        const placeDetailList = $("#place-detail-list");
        placeDetailList.empty(); // 기존 데이터 비우기

        if (data.length === 0) {
          placeDetailList.append(
            '<tr><td colspan="3" class="text-center">등록된 장소가 없습니다.</td></tr>'
          );
          return;
        }

        data.forEach((place) => {
          const row = `
              <tr>
                <td>${place.name}</td>
                <td>${place.address}</td>
                <td style="text-align: center;">
                <button type="button" class="btn btn-outline-primary btn-sm delete-btn" data-id="${place._id}">삭제</button>
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

  // 4. "장소 등록" 버튼 추가
  // "장소 등록" 버튼을 페이지에 동적으로 추가
  const registerButtonHTML = `
     <div class="d-flex mb-3">
      <button id="register-location-btn" class="btn btn-outline-primary btn-sm">
        장소 신규 등록
      </button>
    </div>
  `;
  // "장소 관리" 헤딩 아래에 버튼 추가
  $("#detail-heading").after(registerButtonHTML);

  // 5. "장소 등록" 버튼 클릭 이벤트
  $("#register-location-btn").on("click", function () {
    // 실제 지역명을 URL에 포함시켜 이동
    window.location.href = `./car-location-create.html?region=${encodeURIComponent(
      region
    )}`;
  });

  // 6. 삭제 버튼 클릭 이벤트
  $(document).on("click", ".delete-btn", function () {
    const id = $(this).data("id");
    if (confirm("해당 장소를 삭제하시겠습니까?")) {
      $.ajax({
        url: `${API_BASE_URL}/regions/name/${encodeURIComponent(
          region
        )}/places/${id}`,
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
