$(document).ready(function () {
  $("#register-customer-btn").on("click", function () {
    const name = $("#customer-name").val().trim();
    const display =
      $("input[name='flexRadioDefault']:checked").val() === "flexRadioDefault2";

    if (!name) {
      alert("고객사명을 입력해주세요.");
      return;
    }

    $.ajaxSetup({
      beforeSend: function (xhr) {
        const token = sessionStorage.getItem("token");
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }
      },
    });

    $.ajax({
      url: "http://localhost:3000/api/customers",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({ name, display }),
      success: function (response) {
        alert("고객사가 성공적으로 등록되었습니다.");
        // 등록 후 고객사 관리 페이지로 이동
        window.location.href = "./customer-manage.html";
      },
      error: function (xhr, status, error) {
        if (xhr.responseJSON && xhr.responseJSON.error) {
          alert(`오류: ${xhr.responseJSON.error}`);
        } else {
          alert("고객사 등록 중 오류가 발생했습니다.");
        }
        console.error("Error details:", xhr.responseText);
      },
    });
  });
});
