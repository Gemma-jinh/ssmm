$(document).ready(function () {
  const API_BASE_URL = "/api"; // 백엔드 서버 URL
  let isAdminIdAvailable = false; // 관리자 ID 중복 여부 상태 변수

  $.ajaxSetup({
    beforeSend: function (xhr) {
      const token = sessionStorage.getItem("token");
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
    },
  });
  // 1. 고객사 목록 로드 함수
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

  // 2. 관리자 ID 중복확인 버튼 클릭 이벤트
  $("#check-duplicate-btn").on("click", function () {
    const adminId = $("#admin-id").val().trim();

    if (!adminId) {
      $("#admin-id-feedback").text("관리자 ID를 입력해주세요.");
      $("#admin-id-feedback")
        .removeClass("text-success")
        .addClass("text-danger");
      isAdminIdAvailable = false;
      return;
    }

    // 관리자 ID 중복 확인 AJAX 요청
    $.ajax({
      url: `${API_BASE_URL}/accounts/check-duplicate`,
      method: "GET",
      data: { adminId },
      success: function (response) {
        if (response.isDuplicate) {
          $("#admin-id-feedback").text("이미 사용 중인 관리자 ID입니다.");
          $("#admin-id-feedback")
            .removeClass("text-success")
            .addClass("text-danger");
          isAdminIdAvailable = false;
        } else {
          $("#admin-id-feedback").text("사용 가능한 관리자 ID입니다.");
          $("#admin-id-feedback")
            .removeClass("text-danger")
            .addClass("text-success");
          isAdminIdAvailable = true;
        }
      },
      error: function (err) {
        console.error("ID 중복 확인 실패:", err);
        alert("관리자 ID 중복 확인에 실패했습니다.");
      },
    });
  });

  // 3. 권한 그룹 변경 시 고객사 선택 필드 처리
  $("#authority-group-select").on("change", function () {
    const selectedRole = $(this).val();
    if (selectedRole === "관리자") {
      // 고객사 선택을 필수에서 비필수로 변경하고 필드 숨김
      $("#customer-select").val("");
      $("#customer-feedback").text("");
      $("#customer-container").hide().removeClass("disabled");
    } else {
      // 고객사 선택을 필수로 변경하고 필드 표시
      $("#customer-container").show().removeClass("disabled");
    }
  });

  // 초기 로드 시 권한 그룹에 따라 고객사 선택 필드 표시 여부 설정
  (function initializeForm() {
    const selectedRole = $("#authority-group-select").val();
    if (selectedRole === "관리자") {
      $("#customer-select").val("");
      $("#customer-feedback").text("");
      $("#customer-container").hide();
    } else {
      $("#customer-container").show();
    }
  })();

  // 3. 입력 폼 유효성 검사 함수
  function validateForm(authorityGroup) {
    let isValid = true;

    const adminId = $("#admin-id").val().trim();
    const adminName = $("#admin-name").val().trim();
    const password = $("#password").val().trim();
    const confirmPassword = $("#confirm-password").val().trim();
    const customer = $("#customer-select").val();
    // const authorityGroup = $("#authority-group-select").val();

    // 관리자 ID 검증
    if (!adminId) {
      $("#admin-id-feedback").text("관리자 ID를 입력해주세요.");
      isValid = false;
    } else if (!isAdminIdAvailable) {
      $("#admin-id-feedback").text("관리자 ID 중복 확인을 해주세요.");
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

    // 비밀번호 검증
    if (!password) {
      $("#password-feedback").text("비밀번호를 입력해주세요.");
      isValid = false;
    } else if (password.length < 2) {
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

    // 권한 그룹 검증
    if (!authorityGroup) {
      $("#authority-group-feedback").text("권한 그룹을 선택해주세요.");
      isValid = false;
    } else {
      $("#authority-group-feedback").text("");
    }

    // 고객사 검증
    if (authorityGroup !== "관리자") {
      if (!customer) {
        $("#customer-feedback").text("고객사를 선택해주세요.");
        isValid = false;
      } else {
        $("#customer-feedback").text("");
      }
    } else {
      $("#customer-feedback").text("");
    }

    return isValid;
  }

  // 4. 계정 등록 버튼 클릭 이벤트
  $("#register-btn").on("click", function () {
    const authorityGroup = $("#authority-group-select").val();
    if (!validateForm(authorityGroup)) {
      return;
    }

    const adminId = $("#admin-id").val().trim();
    const adminName = $("#admin-name").val().trim();
    const password = $("#password").val().trim();
    const customer = $("#customer-select").val();
    // const authorityGroup = $("#authority-group-select").val();

    const accountData = {
      adminId,
      adminName,
      password,
      // customer,
      authorityGroup,
    };

    // 관리자 아닌 경우에만 고객사 포함
    if (authorityGroup !== "관리자") {
      accountData.customer = customer;
    }

    // 계정 등록 AJAX 요청
    $.ajax({
      url: `${API_BASE_URL}/accounts`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify(accountData),
      success: function (response) {
        alert("계정이 성공적으로 등록되었습니다.");
        window.location.href = "./account-manage.html"; // 계정 관리 페이지로 이동
      },
      error: function (xhr, status, error) {
        if (xhr.responseJSON && xhr.responseJSON.error) {
          alert(`오류: ${xhr.responseJSON.error}`);
        } else {
          alert("계정 등록 중 오류가 발생했습니다.");
        }
        console.error("Error details:", xhr.responseText);
      },
    });
  });
});
