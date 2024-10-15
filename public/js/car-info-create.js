$(document).ready(function () {
  const API_BASE_URL = "/api"; //백엔드 서버 URL
  //차종 목록 로드
  function loadCarTypes() {
    $.ajax({
      url: `${API_BASE_URL}/car-types`,
      method: "GET",
      success: function (data) {
        const carTypeSelect = $("#car-type");
        carTypeSelect.empty();
        carTypeSelect.append('<option value="" selected>차종 선택</option>');
        data.forEach((type) => {
          carTypeSelect.append(
            `<option value="${type._id}">${type.name}</option>`
          );
        });
      },
      error: function (err) {
        console.error("차종 로드 실패:", err);
      },
    });
  }

  loadCarTypes(); // 페이지 로드 시 차종 목록 로드

  //차종 선택 변경 시
  $("#car-type").on("change", function () {
    const selectedTypeId = $(this).val();
    if (selectedTypeId) {
      //차량 모델 선택 활성화
      $("#car-model").prop("disabled", false);
      //차량 모델 입력 필드 활성화
      $("#custom-car-model").prop("disabled", false);
      // 선택된 차종에 따라 차량 모델 로드
      $.ajax({
        url: `${API_BASE_URL}/car-types/${selectedTypeId}/models`,
        method: "GET",
        success: function (data) {
          const carModelSelect = $("#car-model");
          carModelSelect.empty();
          carModelSelect.append(
            '<option value="" selected>차량 모델 선택</option>'
          );
          data.forEach((model) => {
            carModelSelect.append(
              `<option value="${model._id}">${model.name}</option>`
            );
          });
        },
        error: function (err) {
          console.error("차량 모델 로드 실패:", err);
        },
      });
    } else {
      // 차종 선택하지 않은 경우 차량 모델과 입력 필드 비활성화
      $("#car-model")
        .prop("disabled", true)
        .empty()
        .append('<option value="" selected>차량 모델 선택</option>');
      $("#custom-car-model").prop("disabled", true).val(""); //prop(): javaScript로 수정된 요소의 값을 가지고 싶을 때 사용
    }
  });

  // 새로운 차량 모델 추가
  function addNewCarModel(typeId, modelName) {
    return $.ajax({
      url: `${API_BASE_URL}/car-types/${typeId}/models`,
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ name: modelName }),
    });
  }

  // 지역 목록 로드 함수
  function loadRegions() {
    $.ajax({
      url: `${API_BASE_URL}/regions`,
      method: "GET",
      success: function (data) {
        const regionSelect = $("#region-select");
        regionSelect.empty();
        regionSelect.append('<option value="" selected>지역 선택</option>');
        data.forEach((region) => {
          regionSelect.append(
            `<option value="${region.name}">${region.name}</option>`
          );
        });
      },
      error: function (err) {
        console.error("지역 목록 로드 실패:", err);
        alert("지역 목록을 불러오는 데 실패했습니다.");
      },
    });
  }

  loadRegions(); // 페이지 로드 시 지역 목록 로드

  // 지역 선택 변경 시 장소 목록 로드
  $("#region-select").on("change", function () {
    const selectedRegion = $(this).val();
    if (selectedRegion) {
      $("#place-select").prop("disabled", false);
      $("#place-select")
        .empty()
        .append('<option value="" selected>장소 선택</option>');
      $("#parking-spot-select")
        .prop("disabled", false)
        .empty()
        .append('<option value="" selected>주차 위치 선택</option>');
      $.ajax({
        url: `${API_BASE_URL}/regions/name/${encodeURIComponent(
          selectedRegion
        )}/places`,
        method: "GET",
        success: function (data) {
          const placeSelect = $("#place-select");
          placeSelect.empty();
          placeSelect.append('<option value="" selected>장소 선택</option>');
          data.forEach((place) => {
            placeSelect.append(
              `<option value="${place._id}">${place.name}</option>`
            );
          });
        },
        error: function (err) {
          console.error("장소 목록 로드 실패:", err);
          alert("장소 목록을 불러오는 데 실패했습니다.");
        },
      });
    } else {
      $("#place-select")
        .prop("disabled", true)
        .empty()
        .append('<option value="" selected>장소 선택</option>');
      $("#parking-spot-select")
        .prop("disabled", true)
        .empty()
        .append('<option value="" selected>주차 위치 선택</option>');
    }
  });

  // 고객사 목록 로드 함수
  function loadCustomers() {
    $.ajax({
      url: `${API_BASE_URL}/customers`,
      method: "GET",
      success: function (data) {
        console.log("고객사 목록:", data); // 고객사 목록 출력

        const customerSelect = $("#customer-select");
        // 기존 옵션 삭제 (선택 제외)
        // customerSelect.find('option:not([value=""])').remove();
        customerSelect.empty();
        customerSelect.append('<option value="" selected>선택</option>');
        // 새로운 고객사 옵션 추가
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

  // 서비스 종류 목록 로드 함수
  function loadServiceTypes() {
    $.ajax({
      url: `${API_BASE_URL}/service-types`,
      method: "GET",
      success: function (data) {
        const serviceTypeSelect = $("#service-type-select");
        serviceTypeSelect.empty();
        serviceTypeSelect.append('<option value="" selected>선택</option>');
        data.forEach((serviceType) => {
          serviceTypeSelect.append(
            `<option value="${serviceType._id}">${serviceType.name}</option>`
          );
        });
        // Select2 초기화 (검색 가능한 드롭다운)
        // serviceTypeSelect.select2({
        //   placeholder: "서비스 종류 선택",
        //   allowClear: true,
        // });
      },
      error: function (err) {
        console.error("서비스 종류 목록 로드 실패:", err);
        alert("서비스 종류 목록을 불러오는 데 실패했습니다.");
      },
    });
  }

  loadServiceTypes(); // 페이지 로드 시 서비스 종류 목록 로드

  // 서비스 금액 타입 목록 로드 함수
  function loadServiceAmountTypes() {
    $.ajax({
      url: `${API_BASE_URL}/service-amount-types`,
      method: "GET",
      success: function (data) {
        const serviceAmountTypeSelect = $("#service-amount-type-select");
        serviceAmountTypeSelect.empty();
        serviceAmountTypeSelect.append(
          '<option value="" selected>선택</option>'
        );
        data.forEach((amountType) => {
          serviceAmountTypeSelect.append(
            `<option value="${amountType._id}">${amountType.name}</option>`
          );
        });
      },
      error: function (err) {
        console.error("서비스 금액 타입 목록 로드 실패:", err);
        alert("서비스 금액 타입 목록을 불러오는 데 실패했습니다.");
      },
    });
  }

  loadServiceAmountTypes(); // 페이지 로드 시 서비스 금액 타입 목록 로드

  // 등록하기 버튼 클릭 시
  $("#register-button").on("click", function () {
    const selectedTypeId = $("#car-type").val();
    const selectedModelId = $("#car-model").val();
    const customModelName = $("#custom-car-model").val().trim();
    const licensePlate = $('input[name="licensePlate"]').val().trim(); // 차량 번호 입력 필드의 name 속성 필요
    const region = $("#region-select").val();
    const place = $("#place-select").val();
    const parkingSpot = $("#parking-spot-select").val();
    const customerId = $("#customer-select").val();
    const serviceType = $("#service-type-select").val();
    const serviceAmountType = $("#service-amount-type-select").val();
    const serviceAmount = parseFloat($("#service-amount-input").val());
    const notes = $("#car-wash-note").val().trim();

    if (!selectedTypeId) {
      alert("차종을 선택해주세요.");
      return;
    }

    if (!selectedModelId && !customModelName) {
      alert("차량 모델을 선택하거나 직접 입력해주세요.");
      return;
    }

    if (!licensePlate) {
      alert("차량 번호를 입력해주세요.");
      return;
    }

    if (!customerId) {
      alert("고객사를 입력해주세요.");
      return;
    }

    //차량 모델 ID 결정
    let finalModelIdPromise;
    if (customModelName) {
      //새로운 차량 모델 선택 리스트에 추가, 해당 ID 반환
      finalModelIdPromise = addNewCarModel(selectedTypeId, customModelName)
        .then((response) => response._id)
        .catch((err) => {
          console.error("차량 모델 추가 실패:", err);
          alert("차량 모델 추가에 실패했습니다.");
          throw err;
        });
    } else {
      finalModelIdPromise = Promise.resolve(selectedModelId);
    }

    finalModelIdPromise
      .then((finalModelId) => {
        // 차량 등록 데이터 준비
        const registrationData = {
          typeId: selectedTypeId,
          modelId: finalModelId,
          licensePlate,
          location: {
            region,
            place,
            parkingSpot,
          },
          customerId,
          // serviceType,
          // serviceAmount,
          // serviceAmountType,
          notes,
        };

        // 선택된 서비스 종류가 있을 경우 추가
        if (serviceType) {
          registrationData.serviceType = serviceType;
        }

        // 선택된 서비스 금액 타입이 있을 경우 추가
        if (serviceAmountType) {
          registrationData.serviceAmountType = serviceAmountType;
        }

        // 서비스 금액이 유효한 경우 추가
        if (!isNaN(serviceAmount) && serviceAmount > 0) {
          registrationData.serviceAmount = serviceAmount;
        }

        // 차량 등록 요청
        return $.ajax({
          url: `${API_BASE_URL}/car-registrations`,
          method: "POST",
          contentType: "application/json",
          data: JSON.stringify(registrationData),
        });
      })
      .then(() => {
        //등록 완료 후 폼 초기화
        alert("등록되었습니다.");
        window.location.href = "/pages/car-list.html";
        $("#car-type").val("");
        $("#car-model")
          .prop("disabled", true)
          .empty()
          .append('<option value="" selected>차량 모델 선택</option>');
        $("#custom-car-model").prop("disabled", true).val("");
        $("#customer-select").val("");
        $('input[name="licensePlate"]').val("");
        $("#region-select").val(null).trigger("change");
        $("#place-select").val(null).trigger("change");
        $("#parking-spot-select").val(null).trigger("change");
        $("#service-type-select").val(null).trigger("change");
        $("#service-amount-type-select").val("");
        $("#car-wash-note").val("");
      })
      .catch((err) => {
        console.error("차량 등록 실패:", err);
        alert("차량 등록에 실패했습니다.");
      });
  });
});
