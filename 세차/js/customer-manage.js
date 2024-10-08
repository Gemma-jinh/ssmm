$(document).ready(function () {
  fetchCustomers();

  function fetchCustomers() {
    $.ajax({
      url: "/api/customers",
      type: "GET",
      success: function (response) {
        populateCustomerTable(response);
      },
      error: function (xhr, status, error) {
        alert("고객사 목록을 불러오는 데 실패했습니다.");
        console.error("Error details:", xhr.responseText);
      },
    });
  }

  function populateCustomerTable(customers) {
    const tbody = $("#customers-table tbody");
    tbody.empty(); // 기존 내용 삭제

    if (customers.length === 0) {
      tbody.append(
        `<tr><td colspan="3" class="text-center">등록된 고객사가 없습니다.</td></tr>`
      );
      return;
    }

    customers.forEach((customer) => {
      const isDisplayedText = customer.isDisplayed ? "표기" : "표기 안함";
      const row = `
          <tr>
            <td>${customer.name}</td>
            <td>${isDisplayedText}</td>
            <td>
              <a href="./customer-modify.html?id=${customer._id}">
                <button type="button" class="btn btn-light btn-sm">수정</button>
              </a>
            </td>
          </tr>
        `;
      tbody.append(row);
    });
  }
});
