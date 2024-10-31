$(document).ready(function () {
  console.log("Login script loaded");

  // 토큰 체크 및 리다이렉션 함수
  const token = localStorage.getItem("token");
  if (!token) {
    const decoded = parseJwt(token);
    if (decoded && decoded.authorityGroup) {
      const redirect =
        decoded.authorityGroup === "관리자"
          ? "/car-list.html"
          : "/car-wash-history.html";
      window.location.replace(redirect);
      return;
    }
  }
  // 로그인 폼 제출 처리
  $("#login-form").on("submit", function (e) {
    e.preventDefault();

    const submitButton = $(this).find('button[type="submit"]');
    submitButton.prop("disabled", true);

    const adminId = $("#admin-id").val().trim();
    const password = $("#password").val().trim();

    if (!adminId || !password) {
      $("#login-feedback").text("아이디와 비밀번호를 입력해주세요.");
      submitButton.prop("disabled", false);
      return;
    }

    $.ajax({
      url: "/api/login",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ adminId, password }),
      success: function (data) {
        localStorage.setItem("token", data.token);
        const payload = parseJwt(data.token);

        if (payload && payload.authorityGroup) {
          const redirect =
            payload.authorityGroup === "관리자"
              ? "/car-list.html"
              : "/car-wash-history.html";
          window.location.replace(redirect);
        } else {
          $("#login-feedback").text("유효하지 않은 응답입니다.");
          submitButton.prop("disabled", false);
        }
      },
      error: function (xhr) {
        const error = xhr.responseJSON?.error || "로그인 실패";
        $("#login-feedback").text(error);
        submitButton.prop("disabled", false);
      },
    });
  });
});
