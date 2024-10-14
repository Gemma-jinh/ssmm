$(document).ready(function () {
  const API_BASE_URL = "/api";

  // 1. 지역 목록 로드 함수
  function loadRegions() {
    $.ajax({
      url: `${API_BASE_URL}/regions`,
      method: "GET",
      success: function (data) {
        const tableBody = $("#location-table-body");
        tableBody.empty(); // 기존 데이터 비우기

        data.forEach((region) => {
          const row = `
              <tr data-id="${region._id}">
                <td>
                  <input class="form-check-input select-checkbox" type="checkbox" />
                </td>
                <td>
                  <input type="text" class="form-control region-input" value="${region.name}" />
                </td>
              </tr>
            `;
          tableBody.append(row);
        });
      },
      error: function (err) {
        console.error("지역 목록 로드 실패:", err);
        $("#error-message")
          .text("지역 목록을 불러오는 데 실패했습니다.")
          .show();
      },
    });
  }

  loadRegions(); // 페이지 로드 시 지역 목록 로드

  // 2. 행 추가 버튼 클릭 이벤트
  $("#add-btn").on("click", function () {
    const tableBody = $("#location-table-body");
    const newRow = `
        <tr>
          <td>
            <input class="form-check-input select-checkbox" type="checkbox" />
          </td>
          <td>
            <input type="text" class="form-control region-input" placeholder="지역 이름 입력" />
          </td>
        </tr>
      `;
    tableBody.append(newRow);
  });

  // 3. 행 삭제 버튼 클릭 이벤트
  $("#delete-btn").on("click", function () {
    const selectedRows = $(".select-checkbox:checked").closest("tr");
    if (selectedRows.length === 0) {
      alert("삭제할 행을 선택해주세요.");
      return;
    }

    if (confirm("선택한 행을 삭제하시겠습니까?")) {
      selectedRows.remove();
    }
  });

  // 4. 순서 변경 버튼 클릭 이벤트
  $("#move-up-btn").on("click", function () {
    const selectedRows = $(".select-checkbox:checked").closest("tr");
    selectedRows.each(function () {
      const prev = $(this).prev();
      if (prev.length && !prev.find(".select-checkbox").is(":checked")) {
        $(this).insertBefore(prev);
      }
    });
  });

  $("#move-down-btn").on("click", function () {
    const selectedRows = $(".select-checkbox:checked").closest("tr");
    $(selectedRows.get().reverse()).each(function () {
      const next = $(this).next();
      if (next.length && !next.find(".select-checkbox").is(":checked")) {
        $(this).insertAfter(next);
      }
    });
  });

  // 5. 저장하기 버튼 클릭 이벤트
  $("#save-btn").on("click", function () {
    const regions = [];
    let isValid = true;

    $("#location-table-body tr").each(function (index) {
      const regionInput = $(this).find(".region-input");
      const regionName = regionInput.val().trim();
      const order = index + 1;

      if (regionName === "") {
        regionInput.addClass("is-invalid");
        isValid = false;
      } else {
        regionInput.removeClass("is-invalid");
      }

      regions.push({
        name: regionName,
        order: order, // 순서 값 설정
      });
    });

    if (!isValid) {
      $("#error-message").text("모든 지역 이름을 입력해주세요.").show();
      return;
    } else {
      $("#error-message").hide();
    }

    // AJAX 요청으로 지역 리스트 저장
    $.ajax({
      url: `${API_BASE_URL}/regions`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ regions }),
      success: function (response) {
        $("#success-message").text("지역이 성공적으로 저장되었습니다.").show();
        // 다시 지역 목록 로드
        loadRegions();
        // 체크박스 초기화
        $(".select-checkbox").prop("checked", false);
      },
      error: function (xhr, status, error) {
        console.error("지역 저장 실패:", xhr.responseText);
        const errorMsg =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : "지역 저장에 실패했습니다.";
        $("#error-message").text(errorMsg).show();
      },
    });
  });
});
