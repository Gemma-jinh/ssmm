$(document).ready(function () {
  // URL에서 고객사 ID 추출
  const urlParams = new URLSearchParams(window.location.search);
  const customerId = urlParams.get("id");

  if (!customerId) {
    alert("유효하지 않은 고객사 ID입니다.");
    window.location.href = "./customer-manage.html";
    return;
  }

  // 고객사 정보 불러오기
  fetchCustomer(customerId);

  function fetchCustomer(id) {
    $.ajax({
      url: `/api/customers/${id}`,
      type: "GET",
      success: function (customer) {
        if (!customer) {
          alert("해당 고객사를 찾을 수 없습니다.");
          window.location.href = "./customer-manage.html";
          return;
        }
        populateForm(customer);
      },
      error: function (xhr, status, error) {
        alert("고객사 정보를 불러오는 데 실패했습니다.");
        console.error("Error details:", xhr.responseText);
      },
    });
  }

  function populateForm(customer) {
    $("#customer-name").val(customer.name);
    if (customer.display) {
      $("#flexRadioDefault2").prop("checked", true);
    } else {
      $("#flexRadioDefault1").prop("checked", true);
    }
  }

  // 수정하기 버튼 클릭 이벤트
  $("#update-customer-btn").on("click", function () {
    const name = $("#customer-name").val().trim();
    const display =
      $("input[name='flexRadioDefault']:checked").val() === "true";

    if (!name) {
      alert("고객사명을 입력해주세요.");
      return;
    }

    $.ajax({
      url: `/api/customers/${customerId}`,
      type: "PUT",
      contentType: "application/json",
      data: JSON.stringify({ name, display }),
      success: function (response) {
        alert("고객사가 성공적으로 수정되었습니다.");
        // 수정 후 고객사 관리 페이지로 이동
        window.location.href = "./customer-manage.html";
      },
      error: function (xhr, status, error) {
        if (xhr.responseJSON && xhr.responseJSON.error) {
          alert(`오류: ${xhr.responseJSON.error}`);
        } else {
          alert("고객사 수정 중 오류가 발생했습니다.");
        }
        console.error("Error details:", xhr.responseText);
      },
    });
  });
});
