$(document).ready(function () {
  const API_BASE_URL = "http://localhost:5500/api"; //백엔드 서버 URL

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

  // 등록하기 버튼 클릭 시
  $(".btn-primary").on("click", function () {
    const selectedTypeId = $("#car-type").val();
    const selectedModelId = $("#car-model").val();
    const customModelName = $("#custom-car-model").val().trim();
    const licensePlate = $('input[name="licensePlate"]').val().trim(); // 차량 번호 입력 필드의 name 속성 필요
    const region = $('select[name="region"]').val();
    const place = $('select[name="place"]').val();
    const parkingSpot = $('select[name="parkingSpot"]').val();
    const customer = $('select[name="customer"]').val();
    const serviceType = $('select[name="serviceType"]').val();
    const serviceAmount = parseFloat($('input[name="serviceAmount"]').val());
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
          customer,
          serviceType,
          serviceAmount,
          notes,
        };

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
        $("#car-type").val("");
        $("#car-model")
          .prop("disabled", true)
          .empty()
          .append('<option value="" selected>차량 모델 선택</option>');
        $("#custom-car-model").prop("disabled", true).val("");
        $("#car-wash-note").val("");
      })
      .catch((err) => {
        console.error("차량 등록 실패:", err);
        alert("차량 등록에 실패했습니다.");
      });
  });
});
