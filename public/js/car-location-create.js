$(document).ready(function () {
  const API_BASE_URL = "/api";
  const addressModal = new bootstrap.Modal(
    document.getElementById("addressModal"),
    {
      keyboard: false,
    }
  );

  // 2. URL에서 region 추출
  function getRegionFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("region") || "";
  }

  const region = getRegionFromURL();

  // 디버깅용 로그 추가
  console.log("추출된 region:", region);
  console.log("region 타입:", typeof region);

  if (!region) {
    $("#error-message").text("지역 정보가 제공되지 않았습니다.").show();
    return;
  }

  // 2. 지역명 설정
  $("#region-name").val(region);
  // 3. 주소검색 버튼 클릭 시 모달 열기
  $("#search-address-btn").on("click", function () {
    addressModal.show();
  });
  // 4. 모달이 열리고 난 후 Postcode API 임베드
  $("#addressModal").on("shown.bs.modal", function () {
    console.log("모달이 열림, Postcode API 임베드 시작");

    // Postcode API embed
    new daum.Postcode({
      oncomplete: function (data) {
        console.log("주소 선택됨:", data);
        // 우편번호와 주소 정보를 해당 필드에 입력
        const fullAddress = data.roadAddress || data.jibunAddress;
        $("#location-address-selected").val(fullAddress);

        // 메인 주소 필드에 입력
        $("#location-address").val(fullAddress);

        // 로딩 스피너 숨김
        $("#loading-spinner").hide();

        // 모달 닫기
        addressModal.hide();
      },
      onsearchcomplete: function () {
        console.log("주소 검색 완료");
        // 검색이 완료되면 로딩 스피너 숨김
        $("#loading-spinner").hide();
      },
    }).embed(document.getElementById("postcode-container"));
  });

  // 8. 폼 제출 이벤트
  $("#create-location-form").on("submit", function (e) {
    e.preventDefault();

    // const region = $("#region-name").val().trim();
    const name = $("#location-name").val().trim();
    const address = $("#location-address").val().trim();

    let isValid = true;

    // 유효성 검사
    if (!name) {
      $("#location-name").addClass("is-invalid");
      isValid = false;
    } else {
      $("#location-name").removeClass("is-invalid");
    }

    if (!address) {
      $("#location-address").addClass("is-invalid");
      isValid = false;
    } else {
      $("#location-address").removeClass("is-invalid");
    }

    if (!isValid) {
      $("#error-message").text("모든 필드를 올바르게 입력해주세요.").show();
      return;
    } else {
      $("#error-message").hide();
    }

    const dataToSend = { region, name, address };
    console.log("전송 데이터:", dataToSend);
    // AJAX 요청으로 장소 등록
    $.ajax({
      url: `${API_BASE_URL}/car-locations`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(dataToSend),
      success: function (response) {
        $("#success-message").text("장소가 성공적으로 등록되었습니다.").show();
        // 폼 초기화
        $("#create-location-form")[0].reset();
        $("#region-name").val(region); // 지역명 다시 설정
        // 장소 리스트 페이지로 리디렉션
        window.location.href = `./car-location-detail.html?region=${encodeURIComponent(
          region
        )}`;
      },
      error: function (xhr, status, error) {
        console.error("장소 등록 실패:", xhr.responseText);
        const errorMsg =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : "장소 등록에 실패했습니다.";
        $("#error-message").text(errorMsg).show();
      },
    });
  });
});
