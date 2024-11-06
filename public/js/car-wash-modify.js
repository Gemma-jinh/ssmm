$(document).ready(function () {
  // 로그인 사용자 정보 확인
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  try {
    const decoded = jwt_decode(token);
    if (
      decoded.authorityGroup !== "작업자" &&
      decoded.authorityGroup !== "관리자"
    ) {
      alert("작업자 또는 관리자 권한이 필요합니다.");
      window.location.href = "/login.html";
      return;
    }
  } catch (err) {
    console.error("토큰 검증 실패:", err);
    window.location.href = "/login.html";
    return;
  }

  // URL에서 차량 ID 가져오기
  const urlParams = new URLSearchParams(window.location.search);
  const carId = urlParams.get("id");

  if (!carId) {
    alert("차량 ID가 제공되지 않았습니다.");
    window.location.href = "/car-list.html";
    return;
  }

  // 차량 정보 로드
  loadCarDetails(carId);

  // "보고하기" 버튼 클릭 이벤트
  $("#report-button").on("click", function () {
    if (confirm("세차 내역을 보고하시겠습니까?")) {
      reportCarWash(carId);
    }
  });

  // 외부세차 사진 미리보기
  $("#camera-click-btn2").on("change", function () {
    previewPhoto(this, "#external-photo-preview");
  });

  // 내부세차 사진 미리보기
  $("#camera-click-btn1").on("change", function () {
    previewPhoto(this, "#internal-photo-preview");
  });
});

// 차량 상세 정보 로드 함수
function loadCarDetails(carId) {
  $.ajax({
    url: `/api/car-registrations/${carId}`,
    method: "GET",
    success: function (response) {
      console.log("차량 상세 정보:", response);
      $("#license-plate").text(response.licensePlate || "N/A");
      $("#customer-name").text(
        response.customer ? response.customer.name : "N/A"
      );
      $("#work-date").text(
        response.workDate
          ? new Date(response.workDate).toLocaleDateString()
          : "N/A"
      );
      $("#status").text(response.status || "N/A");
      // 추가적으로 필요한 필드

      if (response.externalPhoto) {
        const externalImg = $("<img>")
          .attr("src", `/${response.externalPhoto}`)
          .attr("alt", "외부세차 사진")
          .addClass("img-thumbnail")
          .css({ width: "150px", height: "auto", marginTop: "10px" });
        $("#external-photo-preview").append(externalImg);
      }

      if (response.internalPhoto) {
        const internalImg = $("<img>")
          .attr("src", `/${response.internalPhoto}`)
          .attr("alt", "내부세차 사진")
          .addClass("img-thumbnail")
          .css({ width: "150px", height: "auto", marginTop: "10px" });
        $("#internal-photo-preview").append(internalImg);
      }
    },
    error: function (err) {
      console.error("차량 상세 정보 로드 실패:", err);
      alert("차량 상세 정보를 불러오는데 실패했습니다.");
      window.location.href = "/car-list.html";
    },
  });
}

// "보고하기" 버튼 클릭 시 세차 내역 보고 함수
function reportCarWash(carId) {
  const notes = $("#car-wash-note").val();

  // 파일 업로드를 위한 FormData 생성
  const formData = new FormData();
  formData.append("notes", notes);

  const externalPhoto = $("#camera-click-btn2")[0].files[0];
  const internalPhoto = $("#camera-click-btn1")[0].files[0];

  if (externalPhoto) {
    formData.append("externalPhoto", externalPhoto);
  }

  if (internalPhoto) {
    formData.append("internalPhoto", internalPhoto);
  }

  $.ajax({
    url: `/api/car-registrations/${carId}/report`,
    method: "PUT",
    data: formData,
    processData: false,
    contentType: false,
    success: function (response) {
      alert(response.message);
      // 보고 후 페이지를 차량 목록으로 이동하거나, 다른 페이지로 이동할 수 있습니다.
      window.location.href = "/car-list.html";
    },
    error: function (err) {
      console.error("보고하기 실패:", err);
      alert(err.responseJSON?.error || "보고하기에 실패했습니다.");
    },
  });
}

// 사진 미리보기 함수
function previewPhoto(input, previewSelector) {
  const preview = $(previewSelector);
  preview.empty(); // 기존 미리보기 제거

  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = function (e) {
      const img = $("<img>")
        .attr("src", e.target.result)
        .attr("alt", "세차 사진")
        .addClass("img-thumbnail")
        .css({ width: "150px", height: "auto", marginTop: "10px" });
      preview.append(img);
    };

    reader.onerror = function (e) {
      console.error("FileReader 오류:", e);
    };

    reader.readAsDataURL(file);
    console.log("FileReader readAsDataURL 호출");
  } else {
    console.log("파일이 선택되지 않음");
  }
}
