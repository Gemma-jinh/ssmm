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

  // 2. 고객사 목록 로드 함수
  function loadCustomers() {
    $.ajax({
      url: `${API_BASE_URL}/customers`,
      method: "GET",
      success: function (data) {
        const customerSelect = $("#customer-select");
        customerSelect.empty();
        customerSelect.append('<option value="" selected>선택</option>');
        data.forEach((customer) => {
          if (typeof customer === "object" && customer.name) {
            const option = `<option value="${customer._id}">${customer.name}</option>`;
            customerSelect.append(option);
          } else {
            console.warn("Unexpected customer format:", customer);
          }
        });
      },
      error: function (err) {
        console.error("고객사 목록 로드 실패:", err);
        alert("고객사 목록을 불러오는 데 실패했습니다.");
      },
    });
  }

  loadCustomers(); // 페이지 로드 시 고객사 목록 로드

  // 3. 계정 상세 정보 로드 함수
  function loadAccountDetails(id) {
    $.ajax({
      url: `${API_BASE_URL}/accounts/${id}`,
      method: "GET",
      success: function (data) {
        $("#admin-id").val(data.adminId);
        $("#admin-name").val(data.adminName);
        $("#authority-group-select").val(data.authorityGroup);
        $("#customer-select").val(data.customer);
        // 비밀번호는 보안을 위해 표시하지 않습니다.
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

  // 4. 계정 상세 정보 로드
  loadAccountDetails(accountId);

  // 5. 입력 폼 유효성 검사 함수
  function validateForm() {
    let isValid = true;

    const adminId = $("#admin-id").val().trim();
    const adminName = $("#admin-name").val().trim();
    const password = $("#password").val().trim();
    const confirmPassword = $("#confirm-password").val().trim();
    const customer = $("#customer-select").val();
    const authorityGroup = $("#authority-group-select").val();

    // 관리자 ID 검증
    if (!adminId) {
      $("#admin-id-feedback").text("관리자 ID를 입력해주세요.");
      isValid = false;
    } else {
      $("#admin-id-feedback").text("");
    }

    // 관리자명 검증
    if (!adminName) {
      $("#admin-name-feedback").text("관리자명을 입력해주세요.");
      isValid = false;
    } else {
      $("#admin-name-feedback").text("");
    }

    // 비밀번호 검증 (비밀번호 변경 시)
    if (password) {
      if (password.length < 2) {
        // 비밀번호 길이 조정 가능
        $("#password-feedback").text("비밀번호는 최소 2자 이상이어야 합니다.");
        isValid = false;
      } else {
        $("#password-feedback").text("");
      }

      // 비밀번호 확인 검증
      if (!confirmPassword) {
        $("#confirm-password-feedback").text("비밀번호 확인을 입력해주세요.");
        isValid = false;
      } else if (password !== confirmPassword) {
        $("#confirm-password-feedback").text("비밀번호가 일치하지 않습니다.");
        isValid = false;
      } else {
        $("#confirm-password-feedback").text("");
      }
    } else {
      // 비밀번호를 변경하지 않을 경우 비밀번호 확인도 비워둡니다.
      $("#password-feedback").text("");
      $("#confirm-password-feedback").text("");
    }

    // 고객사 검증
    if (!customer) {
      $("#customer-feedback").text("고객사를 선택해주세요.");
      isValid = false;
    } else {
      $("#customer-feedback").text("");
    }

    // 권한 그룹 검증
    if (!authorityGroup) {
      $("#authority-group-feedback").text("권한 그룹을 선택해주세요.");
      isValid = false;
    } else {
      $("#authority-group-feedback").text("");
    }

    return isValid;
  }

  // 6. 계정 수정 버튼 클릭 이벤트
  $("#update-btn").on("click", function () {
    if (!validateForm()) {
      return;
    }

    const adminId = $("#admin-id").val().trim();
    const adminName = $("#admin-name").val().trim();
    const password = $("#password").val().trim();
    const customer = $("#customer-select").val();
    const authorityGroup = $("#authority-group-select").val();

    const accountData = {
      adminId,
      adminName,
      customer,
      authorityGroup,
    };

    // 비밀번호가 변경되었을 경우 포함
    if (password) {
      accountData.password = password;
    }

    // 계정 수정 AJAX 요청
    $.ajax({
      url: `${API_BASE_URL}/accounts/${accountId}`,
      method: "PUT",
      contentType: "application/json",
      data: JSON.stringify(accountData),
      success: function (response) {
        alert("계정이 성공적으로 수정되었습니다.");
        window.location.href = "./account-detail.html?id=" + accountId; // 계정 상세 페이지로 이동
      },
      error: function (xhr, status, error) {
        if (xhr.responseJSON && xhr.responseJSON.error) {
          $("#error-message").text(`오류: ${xhr.responseJSON.error}`).show();
        } else {
          $("#error-message").text("계정 수정 중 오류가 발생했습니다.").show();
        }
        console.error("Error details:", xhr.responseText);
      },
    });
  });
});
