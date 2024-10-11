$(document).ready(function () {
  const API_BASE_URL = "/api";

  // 1. URL에서 계정 ID 추출
  function getAccountIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  const accountId = getAccountIdFromURL();

  if (!accountId) {
    alert("유효한 계정 ID가 제공되지 않았습니다.");
    window.location.href = "./account-manage.html"; // 계정 관리 페이지로 이동
  }

  // 2. 계정 상세 정보 로드 함수
  function loadAccountDetails(id) {
    $.ajax({
      url: `${API_BASE_URL}/accounts/${id}`,
      method: "GET",
      success: function (data) {
        $("#admin-id").text(data.adminId);
        $("#admin-name").text(data.adminName);
        $("#authority-group").text(data.authorityGroup);
        $("#customer-name").text(data.customerName);
        // 추가적인 필드가 있다면 여기에 추가
        // 예: $("#start-menu").text(data.startMenu || "N/A");

        // 수정하기 링크에 accountId 추가
        $("#modify-link").attr("href", `/pages/account-modify.html?id=${id}`);
      },
      error: function (xhr, status, error) {
        if (xhr.responseJSON && xhr.responseJSON.error) {
          alert(`오류: ${xhr.responseJSON.error}`);
        } else {
          alert("계정 상세 정보를 불러오는 데 실패했습니다.");
        }
        console.error("Error details:", xhr.responseText);
        window.location.href = "./account-manage.html"; // 계정 관리 페이지로 이동
      },
    });
  }

  // 3. 계정 상세 정보 로드
  loadAccountDetails(accountId);

  // 4. 탈퇴 처리 버튼 클릭 이벤트
  $("#delete-btn").on("click", function () {
    if (confirm("정말로 이 계정을 탈퇴 처리하시겠습니까?")) {
      $.ajax({
        url: `${API_BASE_URL}/accounts/${accountId}`,
        method: "DELETE",
        success: function (response) {
          alert("계정이 성공적으로 탈퇴 처리되었습니다.");
          window.location.href = "./account-manage.html"; // 계정 관리 페이지로 이동
        },
        error: function (xhr, status, error) {
          if (xhr.responseJSON && xhr.responseJSON.error) {
            alert(`오류: ${xhr.responseJSON.error}`);
          } else {
            alert("계정 탈퇴 처리 중 오류가 발생했습니다.");
          }
          console.error("Error details:", xhr.responseText);
        },
      });
    }
  });
});
