$(document).ready(function () {
  const PAGE_SIZE = 10;
  let currentPage = 1;

  // initialData load
  fetchPermissionGroups();
  fetchWithdrawnAccounts(currentPage);

  // searchButton
  $(".btn-primary").click(function () {
    currentPage = 1;
    fetchWithdrawnAccounts(currentPage);
  });

  //pagination
  $(".pagination").on("click", "a.page-link", function (e) {
    e.preventDefault();
    const page = $(this).text();

    if (page === "«") {
      if (currentPage > 1) currentPage--;
    } else if (page === "»") {
      currentPage++;
    } else {
      currentPage = parseInt(page);
    }

    fetchWithdrawnAccounts(currentPage);
  });

  //PermissionGroup list
  function fetchPermissionGroups() {
    $.ajax({
      url: "/api/permission-groups",
      method: "GET",
      success: function (groups) {
        const select = $("#permissionGroupSelect");
        groups.forEach((group) => {
          select.append(`<option value="${group.id}">${group.name}</option>`);
        });
      },
      error: function (error) {
        console.error("권한 그룹 데이터 로드 실패:", error);
        alert("권한 그룹 목록을 불러오는데 실패했습니다.");
      },
    });
  }

  function fetchWithdrawnAccounts(page) {
    // var permissionGroup = $(".option-container select").val();
    // var adminId = $('.option-container input[type="text"]').eq(0).val();
    // var adminName = $('.option-container input[type="text"]').eq(1).val();
    // var customerName = $('.option-container input[type="text"]').eq(2).val();
    const searchParams = {
      permissionGroup: $("#permissionGroupSelect").val(),
      adminId: $("#adminIdInput").val().trim(),
      adminName: $("#adminNameInput").val().trim(),
      customerName: $("#customerNameInput").val().trim(),
      page: page,
      pageSize: PAGE_SIZE,
    };

    // send AJAX request
    $.ajax({
      url: "/api/withdrawn-accounts",
      method: "GET",
      //   dataType: "json",
      //   data: {
      //     permissionGroup: permissionGroup,
      //     adminId: adminId,
      //     adminName: adminName,
      //     customerName: customerName,
      //   },
      data: searchParams,
      //   success: function (data) {
      //     populateTable(data);
      //   },
      //   error: function (error) {
      //     console.error("데이터를 가져오는 중 오류 발생:", error);
      //   },
      success: function (response) {
        populateTable(response.data);
        updatePagination(response.totalPages, page);
      },
      error: function (error) {
        console.error("데이터를 가져오는 중 오류 발생:", error);
        alert("데이터를 불러오는데 실패했습니다.");
      },
    });
  }

  function populateTable(accounts) {
    const tbody = $(".table tbody");
    tbody.empty(); // delete existing data

    if (!accounts || accounts.length === 0) {
      tbody.append('<tr><td colspan="4">데이터가 없습니다.</td></tr>');
      return;
    }

    // data.forEach(function (account) {
    //   var row =
    //     "<tr>" +
    //     "<td>" +
    //     account.permissionGroup +
    //     "</td>" +
    //     "<td>" +
    //     account.adminId +
    //     "</td>" +
    //     "<td>" +
    //     account.adminName +
    //     "</td>" +
    //     "<td>" +
    //     account.customerName +
    //     "</td>" +
    //     "</tr>";
    //   tbody.append(row);
    // });
    accounts.forEach((account) => {
      const withdrawalDate = account.withdrawalDate
        ? new Date(account.withdrawalDate).toLocaleString("ko-KR")
        : "-";
      const row = `
            <tr>
                <td>${account.permissionGroup || "-"}</td>
                <td>${account.adminId || "-"}</td>
                <td>${account.adminName || "-"}</td>
                <td>${account.customerName || "-"}</td>
                <td>${withdrawalDate}</td>
            </tr>
        `;
      tbody.append(row);
    });
  }

  // pagination update
  function updatePagination(totalPages, currentPage) {
    const pagination = $(".pagination");
    pagination.empty();

    // previous page
    pagination.append(`
            <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
                <a class="page-link" href="#" aria-label="Previous">
                    <span aria-hidden="true">&laquo;</span>
                </a>
            </li>
        `);

    // page no
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // first page
        i === totalPages || // end page
        (i >= currentPage - 2 && i <= currentPage + 2) // current page +- 2page
      ) {
        pagination.append(`
                    <li class="page-item ${i === currentPage ? "active" : ""}">
                        <a class="page-link" href="#">${i}</a>
                    </li>
                `);
      } else if (i === currentPage - 3 || i === currentPage + 3) {
        pagination.append(`
                    <li class="page-item disabled">
                        <a class="page-link" href="#">...</a>
                    </li>
                `);
      }
    }

    // next page
    pagination.append(`
            <li class="page-item ${
              currentPage === totalPages ? "disabled" : ""
            }">
                <a class="page-link" href="#" aria-label="Next">
                    <span aria-hidden="true">&raquo;</span>
                </a>
            </li>
        `);
  }
});
