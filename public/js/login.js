$(document).ready(function () {
  console.log("Login script loaded");
  const API_BASE_URL = "/api";

  // 기존 토큰 확인
  const token = sessionStorage.getItem("token");
  if (token && window.location.pathname === "/login.html") {
    // verifyAndRedirect(token);
    $.ajax({
      url: "/api/verify-token",
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (response.success) {
          const redirect =
            response.user.authorityGroup === "관리자"
              ? "/car-list.html"
              : "/car-wash-history.html";
          window.location.href = redirect;
        } else {
          sessionStorage.removeItem("token");
          $("#login-feedback").text(
            "토큰이 유효하지 않습니다. 다시 로그인해주세요."
          );
        }
      })
      .catch(() => {
        sessionStorage.removeItem("token");
        window.location.href = "/login.html";
      });
  }

  // 모든 Ajax 요청에 대한 기본 설정
  // $.ajaxSetup({
  //   beforeSend: function (xhr) {
  //     const token = localStorage.getItem("token");
  //     if (token) {
  //       xhr.setRequestHeader("Authorization", `Bearer ${token}`);
  //     }
  //   },
  // });

  // 로그인 폼 제출 처리
  $("#login-form").on("submit", function (e) {
    e.preventDefault();

    const submitButton = $(this).find('button[type="submit"]');
    submitButton.prop("disabled", true);
    $("#login-feedback").text("");

    const adminId = $("#admin-id").val().trim();
    const password = $("#password").val().trim();

    if (!adminId || !password) {
      $("#login-feedback").text("아이디와 비밀번호를 입력해주세요.");
      submitButton.prop("disabled", false);
      return;
    }

    $.ajax({
      url: `${API_BASE_URL}/login`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ adminId, password }),
    })
      .then(function (response) {
        if (response.success && response.token) {
          sessionStorage.setItem("token", response.token);
          // $.ajaxSetup({
          //   headers: {
          //     Authorization: `Bearer ${response.token}`,
          //   },
          // });
          // redirectBasedOnRole(response.user.authorityGroup);
          const redirect =
            response.user.authorityGroup === "관리자"
              ? "/car-list.html"
              : "/car-wash-history.html";
          window.location.href = redirect;
        } else {
          $("#login-feedback").text("로그인 처리 중 오류가 발생했습니다.");
        }
      })
      .catch(function (error) {
        console.error("Login error:", error);
        const errorMessage =
          error.responseJSON?.error || "로그인에 실패했습니다.";
        $("#login-feedback").text(errorMessage);
      })
      .always(function () {
        submitButton.prop("disabled", false);
      });
  });
});
