$(document).ready(function () {
  const API_BASE_URL = "/api"; // 백엔드 서버 URL

  $.ajaxSetup({
    beforeSend: function (xhr) {
      const token = localStorage.getItem("token");
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
    },
  });

  // 1. 계정 목록 로드 함수
  function loadAccounts(searchParams = {}) {
    $.ajax({
      url: `${API_BASE_URL}/accounts`,
      method: "GET",
      data: searchParams, // 검색 파라미터를 요청에 포함
      success: function (data) {
        const accountList = $("#account-list");
        accountList.empty(); // 기존 데이터 비우기

        if (data.length === 0) {
          accountList.append(
            '<tr><td colspan="6" class="text-center">등록된 계정이 없습니다.</td></tr>'
          );
          return;
        }

        data.forEach((account) => {
          // 소속구분 및 관리자명은 실제 데이터에 맞게 수정 필요
          const row = `
              <tr>
                <td>${account.authorityGroup}</td>
                <td>${account.adminId}</td>
                <td>${account.adminName || "관리자명"}</td>
                <td>${account.customerName || "고객사명"}</td>
                <td>
                  <a href="./account-detail.html?id=${account._id}">
                    <button type="button" class="btn btn-light btn-sm">상세보기</button>
                  </a>
                </td>
              </tr>
            `;
          accountList.append(row);
        });
      },
      error: function (err) {
        console.error("계정 목록 로드 실패:", err);
        alert("계정 목록을 불러오는 데 실패했습니다.");
      },
    });
  }

  // 2. 초기 계정 목록 로드
  loadAccounts();

  // 3. 검색 버튼 클릭 이벤트
  $("#search-btn").on("click", function () {
    performSearch();
  });

  // 4. 검색 수행 함수
  function performSearch() {
    // 검색 조건 수집
    const authorityGroup = $("#search-authority-group").val();
    const adminId = $("#search-admin-id").val().trim();
    const adminName = $("#search-admin-name").val().trim();
    const customerName = $("#search-customer-name").val().trim();

    // 검색 파라미터 객체 생성
    const searchParams = {
      authorityGroup: authorityGroup !== "" ? authorityGroup : "",
      adminId: adminId !== "" ? adminId : "",
      adminName: adminName !== "" ? adminName : "",
      customerName: customerName !== "" ? customerName : "",
    };

    loadAccounts(searchParams); // 계정 목록 로드
  }
});
