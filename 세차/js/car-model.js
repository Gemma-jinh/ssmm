$(document).ready(function () {
  //차종 선택 변경 시
  $("#car-type").on("change", function () {
    const selectedType = $(this).val();
    if (selectedType) {
      //차량 모델 선택 활성화
      $("#car-model").prop("disabled", false);
      //차량 모델 입력 필드 활성화
      $("#custom-car-model").prop("disabled", false);
      // 선택된 차종에 따라 차량 모델 로드 로직 추가예정
    } else {
      // 차종 선택하지 않은 경우 차량 모델과 입력 필드 비활성화
      $("#car-model").prop("disabled", true).val("");
      $("#custom-car-model").prop("disabled", true).val(""); //prop(): javaScript로 수정된 요소의 값을 가지고 싶을 때 사용
    }
  });

  // 등록하기 버튼 클릭 시
  $(".btn-primary").on("click", function () {
    const selectedType = $("#car-type").val();
    const selectedModel = $("#car-model").val();
    const customModel = $("#custom-car-model").val().trim();

    if (!selectedType) {
      alert("차종을 선택해주세요.");
      return;
    }

    let finalModel = selectedModel;

    if (customModel) {
      //새로운 차량 모델 선택 리스트에 추가
      finalModel = customModel;
      //중복 확인
      if ($('#car-model option[value="' + finalModel + '"]').length === 0) {
        $("#car-model").append(new Option(finalModel, finalModel));
      }
    } else if (!selectedModel) {
      alert("차량 모델을 선택하거나 직접 입력해주세요.");
      return;
    }
    //선택된 차종과 차량 모델을 처리하기
    console.log("차종:", selectedType);
    console.log("차량 모델:", finalModel);
    console.log("기타 메모:", $("#car-wash-note").val());

    //등록 완료 후 폼 초기화
    alert("등록되었습니다.");
    $("#car-type").val("");
    $("#car-model").prop("disabled", true).val("");
    $("#custom-car-model").prop("disabled", true).val("");
    $("#car-wash-note").val("");
  });
});
