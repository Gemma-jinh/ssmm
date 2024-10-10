$(document).ready(function () {
  const SERVER_URL = "http://localhost:5500";

  $("#upload-excel-btn").on("click", function () {
    $("#excel-file-input").click();
  });

  $("#excel-file-input").on("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      // 파일 업로드 확인
      console.log("Selected file:", file.name, "Type:", file.type);
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        alert("엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.");
        return;
      }

      // 파일 업로드 함수 호출
      uploadExcelFile(file);
    }
  });

  // 파일 업로드 함수
  function uploadExcelFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const requestUrl = `${SERVER_URL}/api/car-registrations/bulk-upload`;
    console.log("AJAX 요청 URL:", requestUrl); // 요청 URL 로그 추가

    $.ajax({
      url: requestUrl,
      type: "POST",
      data: formData,
      processData: false,
      contentType: false,
      success: function (response) {
        alert(response.message);
        // 필요시 차량 목록 갱신 등 추가 작업
        location.reload();
      },
      error: function (xhr, status, error) {
        console.error("Error details:", xhr.responseText);
        let errorMessage = "엑셀 파일 업로드 중 오류가 발생했습니다.";
        if (xhr.responseJSON && xhr.responseJSON.error) {
          errorMessage += " " + xhr.responseJSON.error;
        }
        alert(errorMessage);
      },
    });
  }
});
