$(document).ready(function () {
  const API_BASE_URL = "http://localhost:5500/api"; // 백엔드 서버 URL

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

  // 특정 차량 정보 불러오기
  function loadCarInfo() {
    $.ajax({
      url: `${API_BASE_URL}/car-registrations/${carId}`,
      method: "GET",
      success: function (car) {
        // 차종 선택
        loadCarTypes(car.type._id).then(() => {
          // 차량 모델 선택
          loadCarModels(car.type._id, car.model._id);
        });

        // 나머지 필드 채우기
        $("#license-plate").val(car.licensePlate);
        $("#region").val(car.location.region);
        $("#place").val(car.location.place);
        $("#parking-spot").val(car.location.parkingSpot);
        $("#customer").val(car.customer);
        $("#manager").val(car.customer); // 담당자가 customer와 동일하다면, 아니면 수정 필요
        $("#car-wash-note").val(car.notes);
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

  // '수정 완료' 버튼 클릭 시
  $("#update-button").on("click", function () {
    const selectedTypeId = $("#car-type").val();
    const selectedModelId = $("#car-model").val();
    const customModelName = $("#custom-car-model").val().trim(); // 필요 시
    const licensePlate = $("#license-plate").val().trim();
    const region = $("#region").val();
    const place = $("#place").val();
    const parkingSpot = $("#parking-spot").val();
    const customer = $("#customer").val();
    const manager = $("#manager").val(); // 담당자 필드
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

    // 차량 모델 ID 결정
    let modelIdPromise;
    if (customModelName) {
      // 새로운 차량 모델 추가
      modelIdPromise = $.ajax({
        url: `${API_BASE_URL}/car-types/${selectedTypeId}/models`,
        method: "POST",
        contentType: "application/json",
        data: JSON.stringify({ name: customModelName }),
      })
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
          serviceType: "", // 서비스 타입이 없는 경우 빈 문자열 또는 기존 값을 유지하도록 수정 필요
          serviceAmount: 0, // 서비스 금액이 없는 경우 기본값 설정 또는 기존 값을 유지하도록 수정 필요
          notes,
        };

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
