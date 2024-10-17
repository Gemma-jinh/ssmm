$(document).ready(function () {
  const API_BASE_URL = "/api"; // 백엔드 서버 URL

  // URL에서 차량 ID 추출
  function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  }

  const carId = getQueryParam("id"); //id추출하여 차량 정보 조회
  if (!carId) {
    alert("차량 정보가 없습니다.");
    window.location.href = "./car-list.html"; // 차량 목록 페이지로 이동
    return;
  }

  // 차종 목록 로드
  function loadCarTypes(selectedTypeId) {
    return $.ajax({
      url: `${API_BASE_URL}/car-types`,
      method: "GET",
      success: function (data) {
        const carTypeSelect = $("#car-type");
        carTypeSelect.empty();
        carTypeSelect.append('<option value="" selected>차종 선택</option>');
        data.forEach((type) => {
          const selected = type._id === selectedTypeId ? "selected" : "";
          carTypeSelect.append(
            `<option value="${type._id}" ${selected}>${type.name}</option>`
          );
        });
      },
      error: function (err) {
        console.error("차종 로드 실패:", err);
        alert("차종을 로드하는 데 실패했습니다.");
      },
    });
  }

  // 차량 모델 목록 로드
  function loadCarModels(typeId, selectedModelId) {
    return $.ajax({
      url: `${API_BASE_URL}/car-types/${typeId}/models`,
      method: "GET",
      success: function (data) {
        const carModelSelect = $("#car-model");
        carModelSelect.empty();
        carModelSelect.append(
          '<option value="" selected>차량 모델 선택</option>'
        );
        data.forEach((model) => {
          const selected = model._id === selectedModelId ? "selected" : "";
          carModelSelect.append(
            `<option value="${model._id}" ${selected}>${model.name}</option>`
          );
        });
      },
      error: function (err) {
        console.error("차량 모델 로드 실패:", err);
        alert("차량 모델을 로드하는 데 실패했습니다.");
      },
    });
  }

  // 지역 목록 로드
  function loadRegions(selectedRegionId) {
    return $.ajax({
      url: `${API_BASE_URL}/regions`,
      method: "GET",
      success: function (data) {
        const regionSelect = $("#region-select");
        regionSelect.empty();
        regionSelect.append('<option value="" selected>지역 선택</option>');
        data.forEach((region) => {
          const selected = region._id === selectedRegionId ? "selected" : "";
          regionSelect.append(
            `<option value="${region._id}" ${selected}>${region.name}</option>`
          );
        });
      },
      error: function (err) {
        console.error("지역 로드 실패:", err);
        alert("지역을 로드하는 데 실패했습니다.");
      },
    });
  }

  // 장소 목록 로드
  function loadPlaces(regionId, selectedPlaceId) {
    if (!regionId) {
      $("#place-select")
        .empty()
        .append('<option value="" selected>장소 선택</option>')
        .prop("disabled", true);
      return;
    }

    return $.ajax({
      url: `${API_BASE_URL}/regions/${regionId}/places`,
      method: "GET",
      success: function (data) {
        const placeSelect = $("#place-select");
        placeSelect.empty();
        placeSelect.append('<option value="" selected>장소 선택</option>');
        data.forEach((place) => {
          const selected = place._id === selectedPlaceId ? "selected" : "";
          placeSelect.append(
            `<option value="${place._id}" ${selected}>${place.name}</option>`
          );
        });
        placeSelect.prop("disabled", false);
      },
      error: function (err) {
        console.error("장소 로드 실패:", err);
        alert("장소를 로드하는 데 실패했습니다.");
      },
    });
  }

  // 고객사 목록 로드
  function loadCustomers(selectedCustomerId) {
    return $.ajax({
      url: `${API_BASE_URL}/customers`,
      method: "GET",
      success: function (data) {
        const customerSelect = $("#customer-select");
        customerSelect.empty();
        customerSelect.append('<option value="" selected>선택</option>');
        data.forEach((customer) => {
          const selected =
            customer._id === selectedCustomerId ? "selected" : "";
          customerSelect.append(
            `<option value="${customer._id}" ${selected}>${customer.name}</option>`
          );
        });
      },
      error: function (err) {
        console.error("고객사 로드 실패:", err);
        alert("고객사를 로드하는 데 실패했습니다.");
      },
    });
  }

  function loadManagers(selectedManagerId) {
    return $.ajax({
      url: `${API_BASE_URL}/managers`,
      method: "GET",
      success: function (data) {
        const managerSelect = $("#manager-select");
        managerSelect.empty();
        managerSelect.append('<option value="" selected>담당자 선택</option>');
        data.forEach((manager) => {
          const selected = manager._id === selectedManagerId ? "selected" : "";
          managerSelect.append(
            `<option value="${manager._id}" ${selected}>${manager.name}</option>`
          );
        });
      },
      error: function (err) {
        console.error("담당자 로드 실패:", err);
        alert("담당자를 로드하는 데 실패했습니다.");
      },
    });
  }

  // 특정 차량 정보 불러오기
  function loadCarInfo() {
    $.ajax({
      url: `${API_BASE_URL}/car-registrations/${carId}`,
      method: "GET",
      success: function (car) {
        console.log("Loaded car data:", car); // 데이터 확인을 위한 로그
        // 차종 선택
        if (car.type && car.type._id) {
          loadCarTypes(car.type._id).then(() => {
            // 차량 모델 선택
            if (car.model && car.model._id) {
              loadCarModels(car.type._id, car.model._id);
            }
          });
        } else {
          console.error("car.type 또는 car.type._id가 정의되지 않음");
        }
        // 지역 선택
        if (car.location && car.location.region && car.location.region._id) {
          loadRegions(car.location.region._id).then(() => {
            // 장소 선택
            if (car.location.place && car.location.place._id) {
              loadPlaces(car.location.region._id, car.location.place._id);
            }
          });
        } else {
          console.error(
            "car.location.region 또는 car.location.region._id가 정의되지 않음"
          );
          loadRegions(); // 지역 정보가 없어도 전체 지역 목록을 로드
        }
        // 고객사 선택
        if (car.customer && car.customer._id) {
          loadCustomers(car.customer._id);
        } else {
          console.error("car.customer 또는 car.customer._id가 정의되지 않음");
        }

        // 담당자 선택
        loadManagers(car.manager ? car.manager._id : "");

        // 나머지 필드 채우기
        $("#license-plate").val(car.licensePlate || "");
        $("#region-select").val(
          car.location && car.location.region && car.location.region._id
            ? car.location.region._id
            : ""
        );
        $("#place-select").val(
          car.location && car.location.place && car.location.place._id
            ? car.location.place._id
            : ""
        );
        $("#parking-spot-select").val(
          car.location && car.location.parkingSpot
            ? car.location.parkingSpot
            : ""
        );
        $("#customer-select").val(
          car.customer && car.customer._id ? car.customer._id : ""
        );
        $("#manager-select").val(car.manager ? car.manager._id : ""); // 담당자가 customer와 동일하다면, 아니면 수정 필요
        $("#car-wash-note").val(car.notes || "");
      },
      error: function (err) {
        console.error("차량 정보 로드 실패:", err);
        alert("차량 정보를 로드하는 데 실패했습니다.");
      },
    });
  }

  // 초기화
  loadCarInfo();

  // 차종 선택 시 차량 모델 로드
  $("#car-type").on("change", function () {
    const selectedTypeId = $(this).val();
    if (selectedTypeId) {
      loadCarModels(selectedTypeId, null);
      $("#car-model").prop("disabled", false);
      $("#custom-car-model").prop("disabled", true).val("");
    } else {
      $("#car-model")
        .empty()
        .append('<option value="" selected>차량 모델 선택</option>');
      $("#car-model").prop("disabled", true);
      $("#custom-car-model").prop("disabled", true).val("");
    }
  });

  // 지역 선택 시 장소 로드
  $("#region-select").on("change", function () {
    const selectedRegionId = $(this).val();
    if (selectedRegionId) {
      loadPlaces(selectedRegionId, null);
    } else {
      $("#place-select")
        .empty()
        .append('<option value="" selected>장소 선택</option>')
        .prop("disabled", true);
      $("#parking-spot-select")
        .empty()
        .append('<option value="" selected>주차 위치 선택</option>')
        .prop("disabled", true);
    }
  });

  // '수정 완료' 버튼 클릭 시
  $("#update-button").on("click", function () {
    const selectedTypeId = $("#car-type").val();
    const selectedModelId = $("#car-model").val();
    const customModelName = $("#custom-car-model").val().trim(); // 필요 시
    const licensePlate = $("#license-plate").val().trim();
    const region = $("#region-select").val();
    const place = $("#place-select").val();
    const parkingSpot = $("#parking-spot-select").val();
    const customer = $("#customer-select").val();
    const manager = $("#manager-select").val(); // 담당자 필드
    const notes = $("#car-wash-note").val().trim();

    // 유효성 검사
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

    if (!customer) {
      alert("고객사를 선택해주세요.");
      return;
    }

    // 차량 모델 ID 결정
    let modelIdPromise;
    if (customModelName) {
      // 새로운 차량 모델 추가
      // modelIdPromise = $.ajax({
      //   url: `${API_BASE_URL}/car-types/${selectedTypeId}/models`,
      //   method: "POST",
      //   contentType: "application/json",
      //   data: JSON.stringify({ name: customModelName }),
      // })
      modelIdPromise = addNewCarModel(selectedTypeId, customModelName)
        .then((response) => response._id)
        .catch((err) => {
          console.error("차량 모델 추가 실패:", err);
          alert("차량 모델 추가에 실패했습니다.");
          throw err;
        });
    } else {
      modelIdPromise = Promise.resolve(selectedModelId);
    }

    // 차량 정보 업데이트
    modelIdPromise
      .then((finalModelId) => {
        const updatedData = {
          typeId: selectedTypeId,
          modelId: finalModelId,
          licensePlate,
          location: {
            region,
            place,
            parkingSpot,
          },
          customer,
          manager: manager || null,
          serviceType: "", // 서비스 타입이 없는 경우 빈 문자열 또는 기존 값을 유지하도록 수정 필요
          serviceAmount: 0, // 서비스 금액이 없는 경우 기본값 설정 또는 기존 값을 유지하도록 수정 필요
          notes,
        };

        // 서비스 관련 필드 추가 (필요 시)
        const serviceType = $("#service-type-select").val();
        const serviceAmountType = $("#service-amount-type-select").val();
        const serviceAmount = parseFloat($("#service-amount-input").val());

        if (serviceType) {
          updatedData.serviceType = serviceType;
        }

        if (serviceAmountType) {
          updatedData.serviceAmountType = serviceAmountType;
        }

        if (!isNaN(serviceAmount) && serviceAmount > 0) {
          updatedData.serviceAmount = serviceAmount;
        }
        //차량 등록 요청
        return $.ajax({
          url: `${API_BASE_URL}/car-registrations/${carId}`,
          method: "PUT",
          contentType: "application/json",
          data: JSON.stringify(updatedData),
        });
      })
      .then(() => {
        alert("차량 정보가 성공적으로 수정되었습니다.");
        window.location.href = "./car-list.html"; // 차량 목록 페이지로 이동
      })
      .catch((err) => {
        console.error("차량 정보 수정 실패:", err);
        alert("차량 정보 수정에 실패했습니다.");
      });
  });
});
