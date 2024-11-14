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
    // window.location.href = "/car-list.html";
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

function createDeleteButton() {
  return $("<button>")
    .attr("type", "button")
    .addClass("btn btn-danger btn-sm delete-photo-btn")
    .text("삭제");
}

$(document).on("click", ".delete-photo-btn", function () {
  const previewContainer = $(this).parent();
  previewContainer.empty();
  previewContainer.hide();
  // 해당 카메라 버튼 레이블 다시 표시
  // const inputId =
  //   previewContainer.attr("id") === "external-photo-preview"
  //     ? "#camera-click-btn2"
  //     : "#camera-click-btn1";
  // $(inputId).siblings("label").show();
  if (previewContainer.attr("id") === "external-photo-preview") {
    $("#camera-click-btn2").parent(".camera-click-btn").show();
    resizedExternalPhoto = null;
  } else if (previewContainer.attr("id") === "internal-photo-preview") {
    $("#camera-click-btn1").parent(".camera-click-btn").show();
    resizedInternalPhoto = null;
  }
});

// 차량 상세 정보 로드 함수
function loadCarDetails(carId) {
  $.ajax({
    url: `/api/car-registrations/${carId}`,
    method: "GET",
    success: function (response) {
      console.log("차량 상세 정보:", response);
      $("#license-plate").text(response.licensePlate || "N/A");
      $("#customer-name").text(response.customer?.name || "N/A");
      $("#assign-date").text(
        response.assignDate
          ? new Date(response.assignDate).toLocaleDateString()
          : "N/A"
      );
      $("#status").text(getStatusText(response.status));
      // 추가적으로 필요한 필드

      if (response.externalPhoto) {
        const externalImg = $("<img>")
          .attr("src", `/${response.externalPhoto}`)
          .attr("alt", "외부세차 사진")
          // .addClass("img-thumbnail")
          .css({ maxWidth: "100%", height: "auto", marginTop: "10px" });
        $("#external-photo-preview")
          .empty()
          .append(externalImg)
          .append(createDeleteButton())
          .show();
        $("#camera-click-btn2")
          .parent(".camera-click-btn")
          .addClass("hidden")
          .hide();
      }

      if (response.internalPhoto) {
        const internalImg = $("<img>")
          .attr("src", `/${response.internalPhoto}`)
          .attr("alt", "내부세차 사진")
          // .addClass("img-thumbnail")
          .css({ maxWidth: "100%", height: "auto", marginTop: "10px" });
        $("#internal-photo-preview")
          .empty()
          .append(internalImg)
          .append(createDeleteButton())
          .show();
        $("#camera-click-btn1")
          .parent(".camera-click-btn")
          .addClass("hidden")
          .hide();
      }
    },
    error: function (err) {
      console.error("차량 상세 정보 로드 실패:", err);
      alert("차량 상세 정보를 불러오는데 실패했습니다.");
      window.location.href = "/car-list.html";
    },
  });
}

function getStatusText(status) {
  switch (status) {
    case "emergency":
      return "긴급세차요청";
    case "complete":
      return "세차완료";
    default:
      return "세차전";
  }
}

let resizedExternalPhoto = null;
let resizedInternalPhoto = null;

// "보고하기" 버튼 클릭 시 세차 내역 보고 함수
function reportCarWash(carId) {
  const notes = $("#car-wash-note").val();

  // 파일 업로드를 위한 FormData 생성
  const formData = new FormData();
  formData.append("notes", notes);
  formData.append("status", "complete");
  formData.append("assignDate", new Date().toISOString());

  // const externalPhoto = $("#camera-click-btn2")[0].files[0];
  // const internalPhoto = $("#camera-click-btn1")[0].files[0];

  // if (!externalPhoto && !internalPhoto) {
  //   alert("세차 사진을 추가해 주세요.");
  //   return;
  // }
  // if (externalPhoto) {
  //   formData.append("externalPhoto", externalPhoto);
  // }

  // if (internalPhoto) {
  //   formData.append("internalPhoto", internalPhoto);
  // }

  if (resizedExternalPhoto) {
    formData.append("externalPhoto", resizedExternalPhoto, "externalPhoto.jpg");
  } else {
    console.log("외부 사진이 없습니다.");
  }

  if (resizedInternalPhoto) {
    formData.append("internalPhoto", resizedInternalPhoto, "internalPhoto.jpg");
  } else {
    console.log("내부 사진이 없습니다.");
  }

  $.ajax({
    url: `/api/car-registrations/${carId}/report`,
    method: "PUT",
    data: formData,
    processData: false,
    contentType: false,
    success: function (response) {
      console.log("Report response:", response);
      if (response.car) {
        $("#status").text(getStatusText(response.car.status));
      }
      alert(response.message);
      window.location.href = "/car-wash-history.html";
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
      // const img = $("<img>")
      //   .attr("src", e.target.result)
      //   .attr("alt", "세차 사진")
      //   .css({
      //     width: "100%",
      //     height: "auto",
      //     objectFit: "contain",
      //   });
      const img = new Image();
      img.src = e.target.result;

      img.onload = function () {
        // 최대 크기 설정
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        // 이미지 크기 조절
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Canvas를 Blob으로 변환
        canvas.toBlob(
          function (blob) {
            // 리사이즈된 이미지 저장
            if (previewSelector === "#external-photo-preview") {
              resizedExternalPhoto = blob;
            } else if (previewSelector === "#internal-photo-preview") {
              resizedInternalPhoto = blob;
            }

            // 미리보기 이미지 생성
            const resizedImg = $("<img>")
              .attr("src", URL.createObjectURL(blob))
              .attr("alt", "세차 사진")
              .css({
                width: "100%",
                height: "auto",
                objectFit: "contain",
              });

            const deleteBtn = createDeleteButton();
            preview.append(resizedImg).append(deleteBtn);
            preview.show();

            $(input).parent(".camera-click-btn").hide();
          },
          "image/jpeg",
          0.8
        );
      };
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
